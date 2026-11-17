const SPEED_ARC = 515.22;
const SPEED_ARC_USED = 386.42;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.000';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${remaining.toFixed(3).padStart(6, '0')}`;
}

function colorHex(value) {
  return `#${(value >>> 0).toString(16).padStart(6, '0')}`;
}

export class HUD {
  constructor(track) {
    this.track = track;
    this.root = document.getElementById('hud');
    this.elements = {
      position: document.getElementById('position-value'),
      positionTotal: document.getElementById('position-total'),
      lap: document.getElementById('lap-value'),
      raceTime: document.getElementById('race-time'),
      lapTime: document.getElementById('lap-time'),
      speed: document.getElementById('speed-value'),
      gear: document.getElementById('gear-value'),
      gearMini: document.getElementById('gear-mini'),
      speedArc: document.getElementById('speed-arc'),
      nitroFill: document.getElementById('nitro-fill'),
      nitroPercent: document.getElementById('nitro-percent'),
      nitroBar: document.querySelector('.nitro-bar'),
      nitroFlare: document.getElementById('nitro-flare'),
      driftCombo: document.getElementById('drift-combo'),
      driftCharge: document.getElementById('drift-charge'),
      boostPill: document.getElementById('boost-pill'),
      score: document.getElementById('score-value'),
      topSpeed: document.getElementById('top-speed'),
      countdown: document.getElementById('countdown'),
      countdownValue: document.querySelector('#countdown span'),
      callout: document.getElementById('race-callout'),
      calloutKicker: document.getElementById('callout-kicker'),
      calloutMain: document.getElementById('callout-main'),
      calloutSub: document.getElementById('callout-sub'),
      driftToast: document.getElementById('drift-toast'),
      driftGrade: document.getElementById('drift-grade'),
      driftPoints: document.getElementById('drift-points'),
      driftLabel: document.getElementById('drift-label'),
      wrongWay: document.getElementById('wrong-way'),
      minimap: document.getElementById('minimap'),
      speedVignette: document.getElementById('speed-vignette'),
      hudHint: document.getElementById('hud-hint')
    };
    this.ctx = this.elements.minimap.getContext('2d');
    this.minimapTimer = 0;
    this.calloutTimer = null;
    this.driftTimer = null;
    this.countdownTimer = null;
    this.last = {};
    this.minimapBackground = this._createMinimapBackground();
    this._buildTicks();
  }

  _buildTicks() {
    const group = document.getElementById('dial-ticks');
    if (!group) return;
    const ns = 'http://www.w3.org/2000/svg';
    const start = -Math.PI / 2;
    for (let i = 0; i <= 27; i += 1) {
      const angle = start + (i / 27) * Math.PI * 2 * 0.75;
      const major = i % 3 === 0;
      const inner = major ? 65 : 70;
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', 100 + Math.cos(angle) * inner);
      line.setAttribute('y1', 100 + Math.sin(angle) * inner);
      line.setAttribute('x2', 100 + Math.cos(angle) * 75);
      line.setAttribute('y2', 100 + Math.sin(angle) * 75);
      if (major) line.classList.add('major');
      group.appendChild(line);
    }
  }

  _createMinimapBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 252;
    const context = canvas.getContext('2d');
    const points = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < 180; i += 1) {
      const pose = this.track.getPoseAt(i / 180);
      points.push([pose.center.x, pose.center.z]);
      minX = Math.min(minX, pose.center.x);
      maxX = Math.max(maxX, pose.center.x);
      minZ = Math.min(minZ, pose.center.z);
      maxZ = Math.max(maxZ, pose.center.z);
    }
    const padding = 21;
    const width = 360 - padding * 2;
    const height = 252 - padding * 2;
    const scale = Math.min(width / (maxX - minX), height / (maxZ - minZ));
    const offsetX = (360 - (maxX - minX) * scale) / 2;
    const offsetY = (252 - (maxZ - minZ) * scale) / 2;
    const map = (x, z) => [
      offsetX + (x - minX) * scale,
      offsetY + (z - minZ) * scale
    ];
    this.mapProjection = { map, scale };

    context.clearRect(0, 0, 360, 252);
    context.strokeStyle = 'rgba(83, 203, 241, 0.08)';
    context.lineWidth = 1;
    for (let x = 0; x < 360; x += 30) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, 252);
      context.stroke();
    }
    for (let y = 0; y < 252; y += 30) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(360, y);
      context.stroke();
    }

    const path = new Path2D();
    points.forEach(([x, z], index) => {
      const [mx, my] = map(x, z);
      if (index === 0) path.moveTo(mx, my);
      else path.lineTo(mx, my);
    });
    path.closePath();
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = 'rgba(1, 8, 15, 0.88)';
    context.lineWidth = 13;
    context.stroke(path);
    context.strokeStyle = 'rgba(59, 221, 255, 0.25)';
    context.lineWidth = 5;
    context.stroke(path);
    context.strokeStyle = 'rgba(215, 250, 255, 0.66)';
    context.lineWidth = 1.2;
    context.stroke(path);

    const start = this.track.getPoseAt(0);
    const [sx, sy] = map(start.center.x, start.center.z);
    context.save();
    context.translate(sx, sy);
    context.rotate(Math.atan2(start.tangent.z, start.tangent.x) - Math.PI / 2);
    context.fillStyle = '#ffdd6a';
    context.shadowColor = '#ffdd6a';
    context.shadowBlur = 8;
    context.fillRect(-6, -1.5, 12, 3);
    context.restore();
    context.shadowBlur = 0;

    this.minimapPath = path;
    return canvas;
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    this.hideCountdown();
    this.hideCallout();
    this.elements.callout.classList.add('hidden');
    this.elements.driftToast.classList.remove('is-visible');
  }

  setText(cacheKey, element, value) {
    if (!element) return;
    if (this.last[cacheKey] === value) return;
    this.last[cacheKey] = value;
    element.textContent = value;
  }

  update(state, dt) {
    const el = this.elements;
    this.setText('position', el.position, String(state.position));
    this.setText('positionTotal', el.positionTotal, `/${state.totalRacers}`);
    this.setText('lap', el.lap, String(state.lap));
    this.setText('raceTime', el.raceTime, formatTime(state.raceTime));
    this.setText('lapTime', el.lapTime, `LAP ${formatTime(state.lapTime)}`);
    this.setText('speed', el.speed, String(state.speedKmh));
    this.setText('gear', el.gear, String(state.gear));
    this.setText('gearMini', el.gearMini, String(state.gear));
    this.setText('score', el.score, state.driftScore.toLocaleString('en-US'));
    this.setText('topSpeed', el.topSpeed, String(state.topSpeed));

    const speedFraction = Math.min(1, state.speedKmh / 410);
    const arcLength = speedFraction * SPEED_ARC_USED;
    if (this.last.arcLength !== arcLength) {
      this.last.arcLength = arcLength;
      el.speedArc.setAttribute('stroke-dasharray', `${arcLength} ${SPEED_ARC}`);
    }

    const nitroPercent = Math.round(state.nitro * 100);
    el.nitroFill.style.width = `${nitroPercent}%`;
    const nitroMeter = el.nitroBar;
    if (nitroMeter) nitroMeter.setAttribute('aria-valuenow', String(nitroPercent));
    this.setText('nitroPercent', el.nitroPercent, `${nitroPercent}%`);
    if (this.last.nitroPercent !== nitroPercent) {
      this.last.nitroPercent = nitroPercent;
      el.nitroBar?.classList.toggle('is-boosting', state.boosting);
    }
    el.nitroBar?.classList.toggle('is-boosting', state.boosting);
    el.nitroFlare.style.opacity = state.nitro >= 0.25 ? '1' : '0.22';

    const driftWidth = state.driftActive
      ? Math.min(100, state.driftCharge * 100)
      : 0;
    el.driftCharge.style.width = `${driftWidth}%`;
    let driftLabel = 'READY';
    if (state.driftActive) {
      driftLabel =
        state.driftTime > 2.25 ? 'PERFECT' :
          state.driftTime > 1.35 ? 'GREAT' :
            state.driftTime > 0.65 ? 'GOOD' : 'DRIFTING';
    }
    this.setText('driftCombo', el.driftCombo, driftLabel);
    el.driftCombo.style.color = driftLabel === 'PERFECT'
      ? '#ffd65a'
      : driftLabel === 'GREAT'
        ? '#82ffbe'
        : driftLabel === 'GOOD'
          ? '#1ae8ff'
          : '';

    el.boostPill.classList.toggle('is-active', state.boosting);
    el.speedVignette.classList.toggle('is-boosting', state.boosting || state.miniBoosting);
    el.wrongWay.classList.toggle('hidden', !state.wrongWay);
    el.boostPill.textContent = state.miniBoosting && !state.boosting ? 'DRIFT BOOST' : 'NITRO BOOST';

    this.minimapTimer -= dt;
    if (this.minimapTimer <= 0) {
      this._drawMinimap(state);
      this.minimapTimer = 1 / 24;
    }
  }

  _drawMinimap(state) {
    if (!this.mapProjection) return;
    const context = this.ctx;
    context.clearRect(0, 0, 360, 252);
    context.drawImage(this.minimapBackground, 0, 0);
    const { map, scale } = this.mapProjection;
    const projectPose = (t, lateral = 0, color = '#fff', size = 3, isPlayer = false) => {
      const pose = this.track.getPoseAt(t, lateral);
      const [x, y] = map(pose.center.x, pose.center.z);
      context.save();
      context.translate(x, y);
      if (isPlayer) {
        context.rotate(Math.atan2(pose.tangent.z, pose.tangent.x) + Math.PI / 2);
        context.shadowColor = color;
        context.shadowBlur = 10;
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(0, -8);
        context.lineTo(5.5, 5);
        context.lineTo(0, 2.8);
        context.lineTo(-5.5, 5);
        context.closePath();
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = 'rgba(255,255,255,0.85)';
        context.lineWidth = 1;
        context.stroke();
      } else {
        context.fillStyle = color;
        context.shadowColor = color;
        context.shadowBlur = 5;
        context.beginPath();
        context.arc(0, 0, size, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }
      context.restore();
    };

    state.ai.forEach((driver) => {
      projectPose(driver.t, driver.lateral, colorHex(driver.color), Math.max(2.2, Math.min(3.6, scale * 0.02)));
    });
    projectPose(state.playerT, 0, '#ffffff', 3, true);
  }

  resetForRace() {
    this.last = {};
    this.hideCountdown();
    this.hideCallout();
    this.elements.driftToast.classList.remove('is-visible');
    this.elements.wrongWay.classList.add('hidden');
    this.elements.speedArc.setAttribute('stroke-dasharray', `0 ${SPEED_ARC}`);
    this.elements.nitroFill.style.width = '0%';
    this.show();
  }

  showCountdown(value) {
    const el = this.elements;
    el.countdown.classList.remove('hidden');
    el.countdownValue.textContent = value;
    el.countdownValue.classList.toggle('is-go', value === 'GO');
    el.countdownValue.classList.remove('is-tick');
    void el.countdownValue.offsetWidth;
    el.countdownValue.classList.add('is-tick');
    if (window.clearTimeout) window.clearTimeout(this.countdownTimer);
    this.countdownTimer = window.setTimeout(() => {
      if (value !== 'GO') this.hideCountdown();
    }, value === 'GO' ? 560 : 760);
  }

  hideCountdown() {
    this.elements.countdown.classList.add('hidden');
    if (this.countdownTimer) window.clearTimeout(this.countdownTimer);
  }

  showCallout(kicker, main, sub, duration = 2100) {
    const el = this.elements;
    el.calloutKicker.textContent = kicker;
    el.calloutMain.textContent = main;
    el.calloutSub.textContent = sub;
    el.callout.classList.remove('hidden');
    el.callout.style.animation = 'none';
    void el.callout.offsetWidth;
    el.callout.style.animation = '';
    if (this.calloutTimer) window.clearTimeout(this.calloutTimer);
    this.calloutTimer = window.setTimeout(() => this.hideCallout(), duration);
  }

  hideCallout() {
    if (this.calloutTimer) window.clearTimeout(this.calloutTimer);
    this.calloutTimer = null;
    this.elements.callout.classList.add('hidden');
  }

  showDrift(data) {
    const el = this.elements;
    el.driftGrade.textContent = data.grade || 'DRIFT';
    el.driftPoints.textContent = `+${Math.max(1, Math.round(data.points || 0))}`;
    el.driftLabel.textContent = data.charge > 0
      ? `${data.label || '漂移集气'} · NITRO +${Math.round(data.charge * 100)}%`
      : data.label || '漂移';
    el.driftToast.dataset.grade = data.grade || '';
    el.driftToast.classList.add('is-visible');
    if (this.driftTimer) window.clearTimeout(this.driftTimer);
    this.driftTimer = window.setTimeout(() => {
      el.driftToast.classList.remove('is-visible');
    }, 1650);
  }

  flashWrongWay() {
    this.elements.wrongWay.classList.remove('hidden');
  }
}

export { formatTime };
