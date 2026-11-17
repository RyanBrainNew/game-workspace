import '@fontsource/orbitron/latin-400.css';
import '@fontsource/orbitron/latin-500.css';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/orbitron/latin-900.css';
import '@fontsource/rajdhani/latin-400.css';
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import './styles.css';

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RaceTrack } from './game/track.js';
import { World } from './game/world.js';
import { RaceGame, LIVERIES } from './game/game.js';
import { RaceAudio } from './game/audio.js';
import { Input } from './game/input.js';
import { HUD, formatTime } from './game/hud.js';

const BEST_TIME_KEY = 'neon11-best-time';
const canvas = document.getElementById('game-canvas');
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingPercent = document.getElementById('loading-percent');
const loadingLabel = document.getElementById('loading-label');
const lobby = document.getElementById('lobby');
const controlsModal = document.getElementById('controls-modal');
const pauseModal = document.getElementById('pause-modal');
const resultsModal = document.getElementById('results-modal');
const startButton = document.getElementById('start-button');
const cameraName = ['车后视角', '车头视角', '远景视角'];
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ready = false;
let track;
let world;
let game;
let composer;
let bloomPass;
let hud;
let input;
let audio;
let toastTimer;
let lastLivery = 0;
let lastBoostPadMessage = 0;
let resizeFrame = 0;
let currentMode = 'loading';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.25, 4200);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isCoarsePointer,
  powerPreference: 'high-performance',
  alpha: false,
  stencil: false
});

const pixelRatio = Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.45 : 1.85);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
renderer.shadowMap.enabled = !isCoarsePointer;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

audio = new RaceAudio();
input = new Input();

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function setLoading(percent, label) {
  loadingBar.style.width = `${percent}%`;
  loadingPercent.textContent = String(Math.round(percent));
  loadingLabel.textContent = label;
}

async function boot() {
  setLoading(7, '正在读取海岸线');
  await nextFrame();
  setLoading(18, '正在铺设霓虹赛道');
  await nextFrame();
  track = new RaceTrack(scene);
  setLoading(43, '正在点亮十一城');
  await nextFrame();
  world = new World(scene, track, {
    buildings: !isCoarsePointer
  });
  setLoading(71, '正在调校漂移手感');
  await nextFrame();
  game = new RaceGame({
    scene,
    camera,
    track,
    world,
    audio,
    liveryIndex: 0,
    onEvent: handleGameEvent
  });
  hud = new HUD(track);
  setLoading(86, '正在预热引擎');
  await nextFrame();
  setupComposer();
  bindUI();
  setupResize();
  setLoading(100, '准备发车');
  await new Promise((resolve) => setTimeout(resolve, 360));
  showLobby();
  ready = true;
  currentMode = 'lobby';
  requestAnimationFrame(renderLoop);

  window.__NEON11__ = {
    game,
    track,
    world,
    scene,
    camera,
    renderer,
    hud,
    input,
    startRace,
    showResults,
    setLoading,
    getState: () => game.getState(),
    teleport(t = 0.2, lateral = 0) {
      const pose = track.getPoseAt(t, lateral);
      game.player.position.copy(pose.position);
      game.player.heading = Math.atan2(pose.tangent.x, pose.tangent.z);
      game.player.course = game.player.heading;
      game.player.nearestIndex = pose.index;
      game.player.trackT = pose.t;
      game.player.previousT = pose.t;
      game.playerCar.position.copy(pose.position);
      game._orientCarToPose(game.playerCar, pose, pose.position, 0);
      game._updateCamera(1, true);
    }
  };
}

function setupComposer() {
  composer = new EffectComposer(renderer);
  composer.setPixelRatio(pixelRatio);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    isCoarsePointer ? 0.4 : 0.58,
    0.42,
    0.84
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  composer.setSize(window.innerWidth, window.innerHeight);
}

function showLobby() {
  currentMode = 'lobby';
  loadingScreen.classList.add('is-done');
  setTimeout(() => loadingScreen.classList.add('hidden'), 750);
  lobby.classList.remove('hidden');
  hud?.hide();
  resultsModal.classList.add('hidden');
  pauseModal.classList.add('hidden');
  controlsModal.classList.add('hidden');
  document.body.classList.remove('is-racing', 'is-results');
  document.body.classList.add('is-lobby');
  game?.setPaused(false);
  game?.enterLobby();
  if (audio?.initialized) {
    audio.stopMusic();
    audio.setEngine({ speed: 0, throttle: 0 });
  }
  updateBestTimeLabel();
}

async function startRace() {
  if (!ready || currentMode === 'race') return;
  currentMode = 'race';
  try {
    await audio.init();
    audio.setMasterVolume(audio.muted ? 0 : 0.55);
    audio.startMusic();
  } catch (error) {
    console.warn('Audio initialization failed:', error);
  }
  controlsModal.classList.add('hidden');
  pauseModal.classList.add('hidden');
  resultsModal.classList.add('hidden');
  lobby.classList.add('hidden');
  document.body.classList.remove('is-lobby', 'is-results');
  document.body.classList.add('is-racing');
  game.setPaused(false);
  game.startRace();
  hud.resetForRace();
  input.clearTransient();
  updateLiveryActive(lastLivery);
}

function openControls() {
  controlsModal.classList.remove('hidden');
  controlsModal.querySelector('.primary-button')?.focus({ preventScroll: true });
}

function closeControls() {
  controlsModal.classList.add('hidden');
  document.getElementById('controls-button')?.focus({ preventScroll: true });
}

function openPause() {
  if (currentMode !== 'race' || resultsModal.classList.contains('hidden') === false) return;
  const state = game.getState();
  if (state.mode !== 'racing' && state.mode !== 'countdown') return;
  document.getElementById('toast').classList.remove('is-visible');
  game.setPaused(true);
  document.getElementById('pause-position').textContent = `${state.position} / ${state.totalRacers}`;
  document.getElementById('pause-lap-time').textContent = formatTime(state.lapTime);
  document.getElementById('pause-score').textContent = state.driftScore.toLocaleString('en-US');
  pauseModal.classList.remove('hidden');
  document.getElementById('resume-button').focus({ preventScroll: true });
}

function closePause(resume = true) {
  pauseModal.classList.add('hidden');
  if (resume) {
    game.setPaused(false);
    input.clearTransient();
  }
}

async function restartRace() {
  closePause(false);
  resultsModal.classList.add('hidden');
  document.body.classList.remove('is-results');
  currentMode = 'race';
  if (!audio.initialized) {
    await audio.init().catch(() => {});
  }
  audio.setPaused(false);
  audio.startMusic();
  game.setPaused(false);
  game.startRace();
  hud.resetForRace();
  input.clearTransient();
}

function quitToLobby() {
  closePause(false);
  resultsModal.classList.add('hidden');
  hud.hide();
  showLobby();
}

function handleAction(action) {
  if (!ready) return;
  const controlsOpen = !controlsModal.classList.contains('hidden');
  const pauseOpen = !pauseModal.classList.contains('hidden');
  const resultsOpen = !resultsModal.classList.contains('hidden');
  if (action === 'confirm') {
    if (controlsOpen) return closeControls();
    if (resultsOpen) return restartRace();
    if (pauseOpen) return closePause();
    if (currentMode === 'lobby') return startRace();
    return;
  }
  if (action === 'pause') {
    if (controlsOpen) return closeControls();
    if (resultsOpen) return;
    if (pauseOpen) return closePause();
    return openPause();
  }
  if (action === 'camera') {
    if (currentMode !== 'race') return;
    const mode = game.cycleCamera();
    showToast(cameraName[mode]);
    return;
  }
  if (action === 'reset') {
    if (currentMode !== 'race' || game.paused) return;
    game.resetToTrack();
    showToast('已复位到赛道');
    return;
  }
  if (action === 'mute') {
    toggleMute();
    return;
  }
  if (action === 'fullscreen') {
    toggleFullscreen();
  }
}

function handleGameEvent(event) {
  if (!hud) return;
  switch (event.type) {
    case 'countdown':
      hud.showCountdown(event.value);
      break;
    case 'race-start':
      hud.hideCountdown();
      hud.showCallout('RACE', '全速出发', '2 圈竞速 · 6 名车手', 1700);
      break;
    case 'drift-end':
      hud.showDrift(event);
      break;
    case 'lap':
      hud.showCallout(
        event.lap === 2 ? 'FINAL LAP' : `LAP ${event.lap}`,
        event.lap === 2 ? '最后一圈' : '完成一圈',
        `本圈 ${formatTime(event.lapTime)}`,
        2100
      );
      break;
    case 'player-finish':
      hud.hideCallout();
      hud.showCallout('FINISH', '冲线', '来看看最终成绩', 1500);
      document.body.classList.add('is-results');
      break;
    case 'finish':
      showResults(event);
      break;
    case 'nitro-empty':
      showToast('氮气不足 · 漂移可以集气');
      break;
    case 'collision':
      if (event.strength > 0.4) showToast('撞到护栏');
      break;
    case 'boost-pad':
      if (performance.now() - lastBoostPadMessage > 2000) {
        lastBoostPadMessage = performance.now();
        showToast('加速带 · NITRO +14%');
      }
      break;
    case 'reset':
      break;
    default:
      break;
  }
}

function showResults(results) {
  if (!results) return;
  currentMode = 'results';
  game.setPaused(true);
  hud.hide();
  pauseModal.classList.add('hidden');
  document.getElementById('toast').classList.remove('is-visible');
  const position = results.place;
  document.getElementById('finish-position').textContent = `P${position}`;
  document.getElementById('finish-time').textContent = formatTime(results.totalTime);
  document.getElementById('finish-best-lap').textContent = formatTime(results.bestLap);
  document.getElementById('finish-score').textContent = results.score.toLocaleString('en-US');
  document.getElementById('finish-top-speed').innerHTML = `${results.topSpeed} <small>KM/H</small>`;
  const title = document.getElementById('results-title');
  const copy = document.getElementById('results-copy');
  if (position === 1) {
    title.textContent = '冠军';
    copy.textContent = '线路干净，漂移果断。十一城今晚记住了你的尾灯。';
  } else if (position === 2) {
    title.textContent = '亚军';
    copy.textContent = '只差一个完美的出弯。再快一点，就能摸到冠军。';
  } else if (position === 3) {
    title.textContent = '季军';
    copy.textContent = '登上领奖台。多集一点氮气，下一次会更接近前面。';
  } else {
    title.textContent = '冲线';
    copy.textContent = '比赛结束。试着更早起漂，在弯心保持更长的漂移。';
  }
  const disc = document.getElementById('results-title');
  disc.style.color = position <= 3 ? '#ffd65a' : '#ffffff';

  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '';
  results.leaderboard.forEach((entry) => {
    const item = document.createElement('li');
    if (entry.isPlayer) item.classList.add('is-player');
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = String(entry.place).padStart(2, '0');
    const driver = document.createElement('span');
    driver.className = 'driver';
    const dot = document.createElement('i');
    dot.style.setProperty('--driver-color', entry.color);
    driver.append(dot, document.createTextNode(entry.name));
    const gap = document.createElement('span');
    gap.className = 'gap';
    gap.textContent = entry.gap;
    item.append(rank, driver, gap);
    list.appendChild(item);
  });

  updateBestRecord(results.totalTime);
  resultsModal.classList.remove('hidden');
  document.getElementById('race-again-button').focus({ preventScroll: true });
}

function updateBestRecord(time) {
  try {
    const existing = Number(localStorage.getItem(BEST_TIME_KEY));
    if (!Number.isFinite(existing) || existing <= 0 || time < existing) {
      localStorage.setItem(BEST_TIME_KEY, String(time));
    }
  } catch {
    // Private browsing can make localStorage unavailable.
  }
  updateBestTimeLabel();
}

function updateBestTimeLabel() {
  let time = null;
  try {
    const stored = Number(localStorage.getItem(BEST_TIME_KEY));
    if (Number.isFinite(stored) && stored > 0) time = stored;
  } catch {
    time = null;
  }
  const target = document.getElementById('best-time');
  if (target) target.textContent = time ? formatTime(time) : '--:--.---';
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1650);
}

async function toggleMute() {
  if (!audio.initialized) {
    await audio.init().catch(() => {});
  }
  const muted = audio.toggleMute();
  const button = document.getElementById('audio-toggle');
  button.classList.toggle('is-muted', muted);
  button.setAttribute('aria-label', muted ? '打开声音' : '静音');
  showToast(muted ? '声音已关闭' : '声音已开启');
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    showToast('当前浏览器不允许全屏');
  }
}

function updateLiveryActive(index) {
  lastLivery = index;
  document.querySelectorAll('.livery').forEach((button) => {
    const active = Number(button.dataset.car) === index;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-checked', String(active));
  });
  const name = document.getElementById('car-name');
  if (name) name.textContent = LIVERIES[index].name;
  if (game) game.setLivery(index);
}

function bindUI() {
  startButton.addEventListener('click', startRace);
  document.getElementById('controls-button').addEventListener('click', openControls);
  document.querySelectorAll('[data-close-modal]').forEach((element) => {
    element.addEventListener('click', closeControls);
  });
  document.querySelectorAll('.livery').forEach((button) => {
    button.addEventListener('click', () => updateLiveryActive(Number(button.dataset.car)));
  });
  document.getElementById('audio-toggle').addEventListener('click', toggleMute);
  document.getElementById('fullscreen-toggle').addEventListener('click', toggleFullscreen);
  document.getElementById('pause-button').addEventListener('click', openPause);
  document.getElementById('camera-button').addEventListener('click', () => {
    const mode = game.cycleCamera();
    showToast(cameraName[mode]);
  });
  document.getElementById('resume-button').addEventListener('click', () => closePause());
  document.getElementById('restart-button').addEventListener('click', restartRace);
  document.getElementById('quit-button').addEventListener('click', quitToLobby);
  document.getElementById('race-again-button').addEventListener('click', restartRace);
  document.getElementById('results-menu-button').addEventListener('click', quitToLobby);
  input.onAction(handleAction);
  input.bindTouch(document.getElementById('touch-controls'));
  controlsModal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeControls();
  });
  resultsModal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') event.stopPropagation();
  });
}

function setupResize() {
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.45 : 1.85));
      renderer.setSize(width, height);
      composer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.45 : 1.85));
      composer?.setSize(width, height);
      bloomPass?.setSize(width, height);
    });
  });
}

const clock = new THREE.Clock();
let elapsed = 0;

function renderLoop() {
  requestAnimationFrame(renderLoop);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  if (!ready) {
    composer?.render();
    return;
  }
  game.update(dt, elapsed, input);
  world.update(dt, elapsed, game.player.position);
  if (currentMode === 'race' || currentMode === 'results') {
    hud.update(game.getState(), dt);
  }
  composer.render();
}

window.addEventListener('gamepadconnected', () => {
  showToast('手柄已连接 · RT 油门 / LT 刹车 / RB 漂移 / A 氮气');
});

boot().catch((error) => {
  console.error(error);
  loadingLabel.textContent = '启动失败，请刷新页面重试';
  loadingPercent.textContent = '!';
  setLoading(100, '启动失败，请刷新页面重试');
  loadingBar.style.background = '#ff3d72';
});
