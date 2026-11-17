import * as THREE from 'three';
import { createKartModel } from './kartModel.js';

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const LAPS = 2;
const SPEED_DISPLAY_FACTOR = 3.85;
const NORMAL_TOP_SPEED = 82;
const BOOST_TOP_SPEED = 114;
const AI_DRIVERS = [
  { name: '夜刃', en: 'NIGHTBLADE', number: '07', body: 0x8f5cff, accent: 0x23e8ff, baseSpeed: 63.5, slot: 0 },
  { name: '赤狐', en: 'REDFOX', number: '13', body: 0xff3b5f, accent: 0xffc94a, baseSpeed: 62.0, slot: 1 },
  { name: '海盐', en: 'SEASALT', number: '21', body: 0x2ce2bb, accent: 0xf2ff9c, baseSpeed: 60.5, slot: 2 },
  { name: '流火', en: 'METEOR', number: '88', body: 0xff8a2a, accent: 0x4ee8ff, baseSpeed: 59.2, slot: 3 },
  { name: '零号', en: 'ZERO', number: '02', body: 0xe9eef4, accent: 0xff3975, baseSpeed: 58.0, slot: 4 }
];

export const LIVERIES = [
  { name: '逐星 · STAR CHASER', body: 0x16d9ff, accent: 0xff3d72, number: '11' },
  { name: '赤焰 · RED COMET', body: 0xff3c65, accent: 0xffca57, number: '11' },
  { name: '极夜 · MIDNIGHT', body: 0x9b62ff, accent: 0x36f4ff, number: '11' },
  { name: '熔金 · GOLD RUSH', body: 0xffb31a, accent: 0x33ecff, number: '11' }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerpAngle(current, target, lambda, dt) {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function angleDistance(a, b) {
  return ((a - b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

function headingFromTangent(tangent) {
  return Math.atan2(tangent.x, tangent.z);
}

class SparkSystem {
  constructor(scene, count = 520) {
    this.count = count;
    this.cursor = 0;
    this.particles = [];
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.alphas = new Float32Array(count);
    this.sizes = new Float32Array(count);
    this.velocities = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.baseSize = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      this.positions[i * 3 + 1] = -999;
      this.alphas[i] = 0;
      this.life[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float alpha;
        attribute float size;
        attribute vec3 color;
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (95.0 / max(4.0, -mv.z));
          gl_Position = projectionMatrix * mv;
          vAlpha = alpha;
          vColor = color;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          float soft = smoothstep(0.5, 0.08, d);
          gl_FragColor = vec4(vColor, vAlpha * soft);
        }
      `
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geometry = geometry;
  }

  spawn(position, velocity, color, size = 0.18, life = 0.55, spread = 0.5) {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    this.positions[index * 3] = position.x;
    this.positions[index * 3 + 1] = position.y;
    this.positions[index * 3 + 2] = position.z;
    this.velocities[index * 3] = velocity.x + (Math.random() - 0.5) * spread;
    this.velocities[index * 3 + 1] = velocity.y + Math.random() * spread * 0.8;
    this.velocities[index * 3 + 2] = velocity.z + (Math.random() - 0.5) * spread;
    this.colors[index * 3] = color.r;
    this.colors[index * 3 + 1] = color.g;
    this.colors[index * 3 + 2] = color.b;
    this.alphas[index] = 1;
    this.sizes[index] = size;
    this.baseSize[index] = size;
    this.life[index] = life;
    this.maxLife[index] = life;
  }

  burst(position, velocity, color, count = 16, size = 0.2, life = 0.6) {
    for (let i = 0; i < count; i += 1) {
      this.spawn(position, velocity, color, size * (0.55 + Math.random() * 0.8), life * (0.55 + Math.random() * 0.75), 1.8);
    }
  }

  update(dt) {
    for (let i = 0; i < this.count; i += 1) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const progress = clamp(this.life[i] / this.maxLife[i], 0, 1);
      this.alphas[i] = progress * progress;
      this.sizes[i] = this.baseSize[i] * (0.55 + progress * 0.65);
      this.velocities[i * 3 + 1] -= 7.5 * dt;
      this.velocities[i * 3] *= 1 - 1.6 * dt;
      this.velocities[i * 3 + 1] *= 1 - 0.6 * dt;
      this.velocities[i * 3 + 2] *= 1 - 1.6 * dt;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        this.positions[i * 3 + 1] = -999;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  clear() {
    for (let i = 0; i < this.count; i += 1) {
      this.life[i] = 0;
      this.alphas[i] = 0;
      this.positions[i * 3 + 1] = -999;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;
  }
}

class SkidMarks {
  constructor(scene, count = 720) {
    this.count = count;
    this.cursor = 0;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x030507,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.dummy = new THREE.Object3D();
    this.dummy.rotation.order = 'YXZ';
    this.dummy.visible = false;
    for (let i = 0; i < count; i += 1) {
      this.dummy.position.set(0, -999, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    scene.add(this.mesh);
  }

  add(position, heading, width = 0.28, length = 0.38) {
    this.dummy.position.copy(position);
    this.dummy.position.y += 0.055;
    this.dummy.rotation.set(-Math.PI / 2, heading, 0);
    this.dummy.scale.set(width, length, 1);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(this.cursor, this.dummy.matrix);
    this.cursor = (this.cursor + 1) % this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    for (let i = 0; i < this.count; i += 1) {
      this.dummy.position.set(0, -999, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.cursor = 0;
  }
}

export class RaceGame {
  constructor({ scene, camera, track, world, audio, onEvent, liveryIndex = 0 }) {
    this.scene = scene;
    this.camera = camera;
    this.track = track;
    this.world = world;
    this.audio = audio;
    this.onEvent = onEvent;
    this.liveryIndex = liveryIndex;
    this.mode = 'lobby';
    this.paused = false;
    this.cameraMode = 0;
    this.sparkSystem = new SparkSystem(scene);
    this.skidMarks = new SkidMarks(scene);
    this.contactShadows = [];
    this.cameraVelocity = new THREE.Vector3();
    this.cameraLook = new THREE.Vector3();
    this.cameraDesired = new THREE.Vector3();
    this.cameraLookDesired = new THREE.Vector3();
    this.cameraShake = 0;
    this.countdownClock = 0;
    this.countdownStage = -1;
    this.finishClock = 0;
    this.lastCollisionTime = -10;
    this.wrongWayClock = 0;
    this.raceElapsed = 0;
    this.aiCollisionCooldown = 0;
    this.isCoasting = false;
    this._tmp = {
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      position: new THREE.Vector3(),
      basis: new THREE.Matrix4(),
      quaternion: new THREE.Quaternion(),
      vector: new THREE.Vector3(),
      color: new THREE.Color(),
      matrix: new THREE.Matrix4()
    };
    this._initPlayer();
    this._initAI();
    this._resetRaceState();
    this.enterLobby();
  }

  _emit(type, data = {}) {
    this.onEvent?.({ type, ...data });
  }

  _initPlayer() {
    this.playerCar = this._buildPlayerCar();
    this.scene.add(this.playerCar);
    const shadow = this.world.createContactShadow();
    this.scene.add(shadow);
    this.playerShadow = shadow;
  }

  _buildPlayerCar() {
    const livery = LIVERIES[this.liveryIndex];
    return createKartModel({
      bodyColor: livery.body,
      accentColor: livery.accent,
      number: livery.number,
      isAI: false,
      scale: 1
    });
  }

  _initAI() {
    this.ai = AI_DRIVERS.map((driver) => {
      const car = createKartModel({
        bodyColor: driver.body,
        accentColor: driver.accent,
        number: driver.number,
        isAI: true,
        scale: 0.98
      });
      car.visible = false;
      this.scene.add(car);
      const shadow = this.world.createContactShadow();
      shadow.visible = false;
      this.scene.add(shadow);
      this.contactShadows.push(shadow);
      return {
        ...driver,
        car,
        shadow,
        t: 0,
        lap: 1,
        speed: 0,
        targetSpeed: driver.baseSpeed,
        finished: false,
        finishTime: null,
        wheelSpin: 0,
        lateral: 0,
        phase: Math.random() * Math.PI * 2,
        rank: 6,
        lastHit: -10
      };
    });
  }

  _resetRaceState() {
    this.mode = 'countdown';
    this.paused = false;
    this.raceElapsed = 0;
    this.countdownClock = 0;
    this.countdownStage = -1;
    this.finishClock = 0;
    this.lastCollisionTime = -10;
    this.wrongWayClock = 0;
    this.player = {
      position: new THREE.Vector3(),
      heading: 0,
      course: 0,
      speed: 0,
      steer: 0,
      steeringVisual: 0,
      nearestIndex: 0,
      trackT: 0,
      previousT: 0,
      lateral: 0,
      lap: 1,
      lapStart: 0,
      currentLapTime: 0,
      bestLap: Infinity,
      lapTimes: [],
      drift: {
        active: false,
        direction: 0,
        time: 0,
        slip: 0,
        lastAngle: 0
      },
      driftCooldown: 0,
      driftScore: 0,
      driftSessionScore: 0,
      nitro: 0,
      boostTime: 0,
      boosting: false,
      miniBoostTime: 0,
      topSpeed: 0,
      offRoad: false,
      curb: false,
      wrongWay: false,
      finished: false,
      finishTime: null,
      wheelSpin: 0,
      speedKmh: 0,
      gear: 1,
      contactShake: 0,
      skidTimer: 0,
      boostPadCooldown: 0,
      rank: 6
    };
    this.skidMarks.clear();
    this.sparkSystem.clear();
    this.playerCar.visible = true;
  }

  setLivery(index) {
    const next = clamp(index, 0, LIVERIES.length - 1);
    if (next === this.liveryIndex) return;
    this.liveryIndex = next;
    const wasVisible = this.playerCar.visible;
    const position = this.playerCar.position.clone();
    const quaternion = this.playerCar.quaternion.clone();
    this.scene.remove(this.playerCar);
    this._disposeObject(this.playerCar);
    this.playerCar = this._buildPlayerCar();
    this.playerCar.position.copy(position);
    this.playerCar.quaternion.copy(quaternion);
    this.playerCar.visible = wasVisible;
    this.scene.add(this.playerCar);
    if (this.mode === 'lobby') {
      this.enterLobby();
    }
  }

  _disposeObject(object) {
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose?.();
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value?.isTexture) value.dispose();
          });
          material.dispose?.();
        });
      }
    });
  }

  enterLobby() {
    this.mode = 'lobby';
    this.paused = false;
    this.isCoasting = false;
    const pose = this.track.getPoseAt(0.006, 0.4);
    const heading = headingFromTangent(pose.tangent);
    this.player.position.copy(pose.position);
    this.player.position.y += 0.03;
    this.player.heading = heading;
    this.player.course = heading;
    this.player.speed = 0;
    this.player.steer = 0;
    this.player.nearestIndex = pose.index;
    this.player.trackT = pose.t;
    this.player.previousT = pose.t;
    this.player.lateral = 0.4;
    this.player.drift.active = false;
    this.player.boosting = false;
    this.player.boostTime = 0;
    this.player.nitro = 0;
    this.player.wrongWay = false;
    this.player.rank = 6;
    this.playerCar.visible = true;
    this.playerCar.position.copy(this.player.position);
    this.playerCar.rotation.set(0, heading, 0, 'YXZ');
    this.ai.forEach((driver) => {
      driver.car.visible = false;
      driver.shadow.visible = false;
    });
    this._updateCarVisuals(this.playerCar, this.player, 0, 0);
    this._updateContactShadow(this.playerShadow, this.player.position, heading);
    this.resetCameraToLobby();
    this.audio?.setEngine({ speed: 0, throttle: 0 });
  }

  resetCameraToLobby() {
    const pose = this.track.getPoseAt(this.player.trackT, 0.4);
    const forward = new THREE.Vector3(Math.sin(this.player.heading), 0, Math.cos(this.player.heading));
    const right = new THREE.Vector3().crossVectors(UP, forward).normalize();
    this.camera.position.copy(this.player.position)
      .addScaledVector(forward, 8.4)
      .addScaledVector(right, 6.8)
      .addScaledVector(UP, 2.9);
    const look = this.player.position.clone()
      .addScaledVector(forward, 0.8)
      .addScaledVector(right, -0.4)
      .addScaledVector(UP, 0.75);
    this.camera.lookAt(look);
    this.camera.fov = 48;
    this.camera.updateProjectionMatrix();
    this.cameraLook.copy(look);
    this.cameraDesired.copy(this.camera.position);
    this.cameraLookDesired.copy(look);
  }

  startRace() {
    this._resetRaceState();
    this.mode = 'countdown';
    this.countdownStage = -1;
    this.countdownClock = 0;
    this.player.finished = false;
    this.player.finishTime = null;
    this.player.previousT = this.player.trackT;
    this.player.lapStart = 0;
    this.raceElapsed = 0;
    this.aiCollisionCooldown = 0;
    this.isCoasting = false;
    this.ai.forEach((driver) => {
      driver.finished = false;
      driver.finishTime = null;
      driver.lap = 1;
      driver.speed = 0;
      driver.t = this.track.startGrid[driver.slot].t;
      driver.lateral = this.track.startGrid[driver.slot].lateral;
      driver.targetSpeed = driver.baseSpeed;
      driver.car.visible = true;
      driver.shadow.visible = true;
      const pose = this.track.getPoseAt(driver.t, driver.lateral);
      driver.car.position.copy(pose.position);
      this._orientCarToPose(driver.car, pose, pose.position, 0);
      this._updateContactShadow(driver.shadow, pose.position, headingFromTangent(pose.tangent));
    });

    const playerPose = this.track.getStartSlot(5);
    this.player.position.copy(playerPose.position);
    this.player.position.y += 0.02;
    this.player.heading = headingFromTangent(playerPose.tangent);
    this.player.course = this.player.heading;
    this.player.nearestIndex = playerPose.index;
    this.player.trackT = playerPose.t;
    this.player.previousT = playerPose.t;
    this.player.lateral = this.track.startGrid[5].lateral;
    this.player.speed = 0;
    this.player.steer = 0;
    this.player.steeringVisual = 0;
    this.player.drift.active = false;
    this.player.drift.time = 0;
    this.player.driftSessionScore = 0;
    this.player.driftCooldown = 0;
    this.player.boostTime = 0;
    this.player.boosting = false;
    this.player.miniBoostTime = 0;
    this.playerCar.visible = true;
    this.playerCar.position.copy(this.player.position);
    this._orientCarToPose(this.playerCar, playerPose, this.player.position, 0);
    this._updateContactShadow(this.playerShadow, this.player.position, this.player.heading);
    const chaseForward = new THREE.Vector3(Math.sin(this.player.heading), 0, Math.cos(this.player.heading));
    this.camera.position.copy(this.player.position)
      .addScaledVector(chaseForward, -11.5)
      .addScaledVector(UP, 4.55);
    this.cameraLook.copy(this.player.position)
      .addScaledVector(chaseForward, 8.5)
      .addScaledVector(UP, 0.8);
    this.camera.lookAt(this.cameraLook);
    this.camera.fov = 61;
    this.camera.updateProjectionMatrix();
    this.cameraDesired.copy(this.camera.position);
    this.cameraLookDesired.copy(this.cameraLook);
    this.skidMarks.clear();
    this.sparkSystem.clear();
    this.track.setStartLights(0);
    this.audio?.startMusic();
    this.audio?.setEngine({ speed: 0, throttle: 0 });
    this._emit('race-reset');
  }

  update(dt, elapsed, input) {
    const safeDt = Math.min(dt, 1 / 24);
    if (this.paused) {
      this._updateLobbyIdle(elapsed, safeDt, false);
      return;
    }

    if (this.mode === 'lobby') {
      this._updateLobbyIdle(elapsed, safeDt, true);
      this._updateCamera(safeDt, true);
      this.sparkSystem.update(safeDt);
      return;
    }

    if (this.mode === 'countdown') {
      this._updateCountdown(safeDt);
      this._updateAIImmobile(elapsed);
      this._updatePlayerIdle(safeDt);
      this._updateCamera(safeDt, false);
      this.sparkSystem.update(safeDt);
      this.audio?.setEngine({ speed: 0.015, throttle: input.read().throttle ? 0.35 : 0, drifting: false, boosting: false });
      return;
    }

    if (this.mode === 'finished') {
      this._updateFinished(safeDt);
      this._updateAI(safeDt);
      this._updateCamera(safeDt, true);
      this._updateParticles(safeDt);
      this.sparkSystem.update(safeDt);
      this._updateEngineAudio(input.read());
      this._updateRacePositions();
      if (this.finishClock > 0) {
        this.finishClock -= safeDt;
        if (this.finishClock <= 0) {
          this._emit('finish', this.getResults());
        }
      }
      return;
    }

    const reading = input.read();
    this._updatePlayer(reading, safeDt, elapsed);
    this._updateAI(safeDt);
    this._updateCamera(safeDt, true);
    this._updateRacePositions();
    this._updateParticles(safeDt);
    this.sparkSystem.update(safeDt);
    this._updateEngineAudio(reading);
    this.raceElapsed += safeDt;
    this.player.currentLapTime = this.raceElapsed - this.player.lapStart;
    this.aiCollisionCooldown = Math.max(0, this.aiCollisionCooldown - safeDt);
    if (this.finishClock > 0) {
      this.finishClock -= safeDt;
      if (this.finishClock <= 0) {
        this._emit('finish', this.getResults());
      }
    }
  }

  _updateCountdown(dt) {
    this.countdownClock += dt;
    const stages = [
      { time: 0.0, value: '3', label: 'HOLD THE LINE', beep: true },
      { time: 0.88, value: '2', label: 'BUILD THE SPEED', beep: true },
      { time: 1.76, value: '1', label: 'SHIFT TO DRIFT', beep: true },
      { time: 2.62, value: 'GO', label: 'FULL THROTTLE', beep: false }
    ];
    for (let i = this.countdownStage + 1; i < stages.length; i += 1) {
      if (this.countdownClock >= stages[i].time) {
        this.countdownStage = i;
        const stage = stages[i];
        this._emit('countdown', { value: stage.value, label: stage.label });
        if (stage.beep) {
          this.audio?.countdown(false);
        } else {
          this.audio?.countdown(true);
        }
        this.track.setStartLights(i === 0 ? 1 : i === 1 ? 3 : 5);
      }
    }

    if (this.countdownClock >= 2.62 && this.mode === 'countdown') {
      this.mode = 'racing';
      this.raceElapsed = 0;
      this.player.lapStart = 0;
      this.track.setStartLights(0);
      this.audio?.go();
      this._emit('race-start');
    }
  }

  _updatePlayerIdle(dt) {
    const pose = this.track.getPoseAt(this.player.trackT, this.player.lateral);
    this.player.position.copy(pose.position);
    this.player.position.y += 0.02;
    this.playerCar.position.copy(this.player.position);
    this._orientCarToPose(this.playerCar, pose, this.player.position, 0);
    this._updateCarVisuals(this.playerCar, this.player, 0, dt);
    this._updateContactShadow(this.playerShadow, this.player.position, this.player.heading);
  }

  _updateLobbyIdle(elapsed, dt, animateCamera) {
    if (!animateCamera) return;
    const pose = this.track.getPoseAt(this.player.trackT, 0.4);
    this.playerCar.position.copy(pose.position);
    this.playerCar.position.y += 0.02 + Math.sin(elapsed * 1.1) * 0.006;
    this._orientCarToPose(this.playerCar, pose, this.playerCar.position, 0);
    const glow = this.playerCar.userData.underglow;
    if (glow) {
      glow.material.opacity = 0.32 + Math.sin(elapsed * 1.8) * 0.08;
    }
    const wheelData = this.playerCar.userData;
    wheelData.frontPivots?.forEach((pivot) => {
      pivot.rotation.y = Math.sin(elapsed * 0.45) * 0.09;
    });
    this.playerShadow.position.copy(this.player.position).addScaledVector(UP, 0.035);
    this._updateContactShadow(this.playerShadow, this.player.position, this.player.heading);
  }

  _updateAIImmobile(elapsed) {
    this.ai.forEach((driver, index) => {
      const pose = this.track.getPoseAt(driver.t, driver.lateral);
      driver.car.position.copy(pose.position);
      this._orientCarToPose(driver.car, pose, pose.position, 0);
      driver.car.position.y += Math.sin(elapsed * 2 + index) * 0.01;
      this._updateWheelVisuals(driver.car, 0, 0);
      this._updateContactShadow(driver.shadow, pose.position, headingFromTangent(pose.tangent));
    });
  }

  _updatePlayer(input, dt, elapsed) {
    const player = this.player;
    if (player.finished) return;

    player.driftCooldown = Math.max(0, player.driftCooldown - dt);
    player.boostPadCooldown = Math.max(0, player.boostPadCooldown - dt);
    player.miniBoostTime = Math.max(0, player.miniBoostTime - dt);
    const speedAbs = Math.abs(player.speed);
    const steerTarget = input.steer;
    player.steer = damp(player.steer, steerTarget, 10, dt);

    const canStartDrift =
      input.drift &&
      !player.drift.active &&
      speedAbs > 13 &&
      Math.abs(player.steer) > 0.16 &&
      player.driftCooldown <= 0 &&
      !player.finished;
    if (canStartDrift) {
      player.drift.active = true;
      player.drift.direction = Math.sign(player.steer);
      player.drift.time = 0;
      player.drift.slip = 0;
      player.driftSessionScore = 0;
      player.drift.lastAngle = 0;
      player.contactShake = Math.max(player.contactShake, 0.12);
      this.audio?.driftStart();
      this._emit('drift-start');
    }

    if (player.drift.active) {
      if (!input.drift || speedAbs < 8) {
        this._endDrift();
      } else {
        player.drift.time += dt;
        const driftSteer = Math.abs(input.steer) > 0.08
          ? input.steer
          : player.drift.direction * 0.3;
        player.steer = damp(player.steer, driftSteer, 7, dt);
      }
    }

    const turningSpeed = clamp(speedAbs / 18, 0, 1);
    let turnRate = 0.9 * (0.44 + 0.56 * turningSpeed);
    if (player.drift.active) turnRate *= 1.36;
    if (speedAbs > 68) turnRate *= 0.93;
    const direction = player.speed >= 0 ? 1 : -1;
    player.heading += player.steer * turnRate * direction * dt;
    player.heading = ((player.heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

    const trackTangent = this.track.samples[player.nearestIndex].tangent;
    const slopePenalty = trackTangent.y * 10.5;
    const offRoadSpeed = 26;
    const topSpeed = player.offRoad
      ? offRoadSpeed
      : player.boosting || player.miniBoostTime > 0
        ? BOOST_TOP_SPEED
        : NORMAL_TOP_SPEED;

    if (player.boosting || player.miniBoostTime > 0) {
      const power = player.boosting ? 35 : 13;
      player.speed += power * (1 - clamp(player.speed / (BOOST_TOP_SPEED + 8), 0, 1)) * dt;
    } else if (input.throttle) {
      const accel = 37 * (1 - clamp(player.speed / NORMAL_TOP_SPEED, 0, 1) * 0.72);
      player.speed += accel * dt;
    }

    if (input.brake) {
      if (player.speed > 0.5) {
        player.speed -= 72 * dt;
        if (player.speed < 0) player.speed = -2;
      } else {
        player.speed -= 16 * dt;
      }
    } else if (!input.throttle && !player.boosting) {
      player.speed -= Math.sign(player.speed) * (3.6 + speedAbs * 0.055) * dt;
      if (Math.abs(player.speed) < 0.25) player.speed = 0;
    }

    if (player.drift.active) {
      player.speed -= (3.4 + Math.abs(player.steer) * 1.8) * dt;
    }
    player.speed -= slopePenalty * dt;

    if (player.offRoad) {
      player.speed -= Math.abs(player.speed) * 0.42 * dt;
    }

    player.speed = clamp(player.speed, -18, topSpeed);
    if (player.boosting && player.boostTime > 0) {
      player.boostTime -= dt;
      if (player.boostTime <= 0) {
        player.boosting = false;
        player.boostTime = 0;
        this.audio?.boostEnd();
        this._emit('boost-end');
      }
    }

    const grip = player.drift.active ? 2.05 : player.offRoad ? 5 : 10.5;
    player.course = lerpAngle(player.course, player.heading, grip, dt);
    const slipNow = angleDistance(player.heading, player.course);
    if (player.drift.active) {
      const maxSlip = 0.82;
      if (Math.abs(slipNow) > maxSlip) {
        player.course = player.heading - Math.sign(slipNow) * maxSlip;
      }
      player.drift.slip = angleDistance(player.heading, player.course);
      const angleScore = Math.abs(player.drift.slip);
      const scoreRate = (25 + Math.abs(player.speed) * 0.9 + angleScore * 65);
      player.driftSessionScore += scoreRate * dt;
      player.driftScore += scoreRate * dt;
      if (angleScore > 0.08) {
        player.skidTimer -= dt;
        if (player.skidTimer <= 0) {
          this._emitDriftSparks(angleScore);
          player.skidTimer = 0.055;
        }
      }
    }

    if (input.nitro) {
      this._tryNitro();
    }

    const forwardX = Math.sin(player.course);
    const forwardZ = Math.cos(player.course);
    player.position.x += forwardX * player.speed * dt;
    player.position.z += forwardZ * player.speed * dt;
    this._resolveTrackContact(dt);

    if (this.mode === 'racing' && !player.finished) {
      const nearest = this.track.nearest(player.position, player.nearestIndex, 34);
      const pitchDot = Math.sin(player.course) * nearest.sample.tangent.x + Math.cos(player.course) * nearest.sample.tangent.z;
      player.trackT = nearest.t;
      player.nearestIndex = nearest.index;
      player.lateral = nearest.lateral;
      player.offRoad = Math.abs(nearest.lateral) > this.track.halfWidth + 1.2;
      player.curb = Math.abs(nearest.lateral) > this.track.halfWidth - 0.4;
      if (Math.abs(nearest.lateral) > this.track.halfWidth + 1.2) {
        player.contactShake = Math.max(player.contactShake, 0.2);
      }
      if (pitchDot < -0.25 && Math.abs(player.speed) > 9) {
        this.wrongWayClock += dt;
      } else {
        this.wrongWayClock = Math.max(0, this.wrongWayClock - dt * 2.2);
      }
      player.wrongWay = this.wrongWayClock > 1.05;

      if (player.previousT > 0.82 && player.trackT < 0.18 && pitchDot > 0.2 && this.raceElapsed > 2.5) {
        this._completeLap();
      }
      player.previousT = player.trackT;

      const pad = player.boostPadCooldown <= 0
        ? this.track.isBoostPad(player.nearestIndex, player.lateral)
        : null;
      if (pad && player.speed > 15) {
        player.nitro = Math.min(1, player.nitro + 0.14);
        player.miniBoostTime = Math.max(player.miniBoostTime, 0.55);
        player.speed += 6;
        player.boostPadCooldown = 1.6;
        this.audio?.pickupBoost();
        this._emit('boost-pad', { message: '加速带' });
        this.sparkSystem.burst(
          player.position.clone().addScaledVector(UP, 0.4),
          new THREE.Vector3(0, 2.5, 0),
          new THREE.Color(0x47eaff),
          14,
          0.16,
          0.55
        );
      }
    }

    player.speedKmh = Math.round(Math.abs(player.speed) * SPEED_DISPLAY_FACTOR);
    player.topSpeed = Math.max(player.topSpeed, player.speedKmh);
    player.gear = player.speed < -1 ? 0 : clamp(Math.floor(Math.abs(player.speed) / 13.4) + 1, 1, 7);
    player.wheelSpin += player.speed * dt / (playerCarWheelRadius(this.playerCar) || 0.41);

    this._updatePlayerCarTransform(dt);
    this._updateCarVisuals(this.playerCar, player, input.steer, dt);
    this._checkAICollisions();
  }

  _tryNitro() {
    const player = this.player;
    if (player.boosting) return;
    if (player.nitro < 0.25) {
      this._emit('nitro-empty');
      return;
    }
    const consumed = Math.min(0.34, player.nitro);
    player.nitro = Math.max(0, player.nitro - consumed);
    player.boosting = true;
    player.boostTime = 1.25 + consumed * 1.7;
    player.speed += 9;
    player.contactShake = 0.24;
    this.audio?.boostStart();
    this._emit('boost-start', { consumed });
  }

  _endDrift() {
    const player = this.player;
    if (!player.drift.active) return;
    player.drift.active = false;
    player.driftCooldown = 0.28;
    const driftTime = player.drift.time;
    const score = Math.round(player.driftSessionScore);
    const speedFactor = clamp(Math.abs(player.speed) / NORMAL_TOP_SPEED, 0, 1);
    let charge = 0;
    if (driftTime > 0.28) {
      charge = clamp(0.055 + driftTime * 0.115 + speedFactor * 0.08, 0.06, 0.44);
    }
    const grade =
      driftTime > 2.25 ? 'PERFECT' :
        driftTime > 1.35 ? 'GREAT' :
          driftTime > 0.65 ? 'GOOD' : 'DRIFT';
    if (charge > 0) {
      player.nitro = Math.min(1, player.nitro + charge);
      player.miniBoostTime = Math.max(player.miniBoostTime, grade === 'PERFECT' ? 0.75 : 0.34);
      player.speed += grade === 'PERFECT' ? 5.5 : grade === 'GREAT' ? 3.8 : 2.4;
    }
    this.audio?.driftEnd();
    this._emit('drift-end', {
      grade,
      driftTime,
      score,
      charge,
      points: score,
      label: driftTime > 0.65 ? '漂移集气' : '轻微漂移'
    });
    player.drift.time = 0;
    player.driftSessionScore = 0;
  }

  _emitDriftSparks(angleScore) {
    const player = this.player;
    const heading = player.heading;
    const forward = this._tmp.forward.set(Math.sin(heading), 0, Math.cos(heading));
    const right = this._tmp.right.set(forward.z, 0, -forward.x);
    const rear = player.position.clone().addScaledVector(forward, -1.3).addScaledVector(UP, 0.08);
    const sparkCount = angleScore > 0.28 ? 3 : 2;
    for (const side of [-1, 1]) {
      const wheel = rear.clone().addScaledVector(right, side * 0.92);
      const velocity = forward.clone().multiplyScalar(-3 - Math.random() * 4)
        .addScaledVector(UP, 1.4 + Math.random() * 2.2)
        .addScaledVector(right, (Math.random() - 0.5) * 2.2);
      this.sparkSystem.burst(
        wheel,
        velocity,
        new THREE.Color(side < 0 ? 0x53eaff : 0xffbf59),
        sparkCount,
        0.11 + Math.random() * 0.09,
        0.34 + Math.random() * 0.3
      );
      if (Math.random() < 0.82) {
        this.skidMarks.add(wheel, heading, 0.25, 0.42);
      }
    }
  }

  _resolveTrackContact(dt) {
    const player = this.player;
    let nearest = this.track.nearest(player.position, player.nearestIndex, 34);
    const limit = this.track.halfWidth + 2.1;
    if (Math.abs(nearest.lateral) > limit) {
      const side = Math.sign(nearest.lateral);
      const pose = this.track.getPoseAt(nearest.t, side * (limit - 0.1));
      player.position.copy(pose.position);
      player.nearestIndex = pose.index;
      player.lateral = side * (limit - 0.1);
      const tangentHeading = headingFromTangent(pose.tangent);
      player.course = lerpAngle(player.course, tangentHeading, 3, dt);
      player.heading = lerpAngle(player.heading, tangentHeading + player.steer * 0.2, 3, dt);
      if (this.raceElapsed - this.lastCollisionTime > 0.65) {
        player.speed *= 0.58;
        player.contactShake = 0.55;
        this.lastCollisionTime = this.raceElapsed;
        this.audio?.hit();
        const color = side > 0 ? new THREE.Color(0xffb45a) : new THREE.Color(0x5fefff);
        this.sparkSystem.burst(
          player.position.clone().addScaledVector(UP, 0.6),
          new THREE.Vector3(-Math.sin(player.course) * 4, 3.8, -Math.cos(player.course) * 4),
          color,
          20,
          0.18,
          0.6
        );
        if (player.drift.active) this._endDrift();
        this._emit('collision', { strength: 0.55 });
      }
    } else {
      nearest = this.track.nearest(player.position, player.nearestIndex, 34);
    }
    const sample = nearest.sample;
    player.position.y = nearest.y + 0.03;
    player.trackT = nearest.t;
    player.nearestIndex = nearest.index;
    player.lateral = nearest.lateral;
  }

  _updatePlayerCarTransform(dt) {
    const player = this.player;
    const nearest = this.track.samples[player.nearestIndex];
    const slope = Math.asin(clamp(nearest.tangent.y, -0.45, 0.45));
    const driftSlip = player.drift.active ? angleDistance(player.heading, player.course) : 0;
    const roll = -nearest.bank - player.steer * 0.024 - (player.drift.active ? driftSlip * 0.055 : 0);
    const bob = player.curb ? Math.sin(this.raceElapsed * 35) * 0.018 : 0;
    this.playerCar.position.copy(player.position);
    this.playerCar.position.y += bob;
    this.playerCar.rotation.order = 'YXZ';
    this.playerCar.rotation.set(-slope, player.heading, roll);
    this._updateContactShadow(this.playerShadow, player.position, player.heading);
  }

  _updateCarVisuals(car, playerState, steerInput, dt) {
    const userData = car.userData;
    this._updateWheelVisuals(car, playerState.wheelSpin ?? 0, playerState.steeringVisual ?? playerState.steer ?? 0);
    if (playerState.steeringVisual !== undefined) {
      playerState.steeringVisual = damp(playerState.steeringVisual, steerInput, 8, dt);
    }
    const boostActive = Boolean(playerState.boosting || playerState.miniBoostTime > 0);
    userData.boostFlames?.forEach((flame, index) => {
      flame.visible = boostActive;
      if (boostActive) {
        const scale = 0.8 + Math.random() * 0.55 + (playerState.boosting ? 0.45 : 0);
        flame.scale.set(
          0.8 + Math.random() * 0.3,
          0.8 + Math.random() * 0.3,
          scale
        );
        flame.rotation.z = Math.sin(this.raceElapsed * 40 + index) * 0.14;
      }
    });
    if (userData.underglow) {
      userData.underglow.material.opacity = boostActive
        ? 0.62 + Math.sin(this.raceElapsed * 18) * 0.1
        : 0.3 + Math.sin(this.raceElapsed * 2.2) * 0.055;
    }
  }

  _updateWheelVisuals(car, spin, steer) {
    const userData = car.userData;
    userData.wheels?.forEach((wheel) => {
      wheel.rotation.x = spin;
    });
    userData.frontPivots?.forEach((pivot) => {
      pivot.rotation.y = steer * 0.33;
    });
  }

  _updateContactShadow(shadow, position, heading) {
    shadow.position.copy(position);
    shadow.position.y += 0.04;
    const qYaw = new THREE.Quaternion().setFromAxisAngle(UP, heading);
    const qFlat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    shadow.quaternion.copy(qYaw).multiply(qFlat);
  }

  _completeLap() {
    const player = this.player;
    const lapTime = this.raceElapsed - player.lapStart;
    player.lapTimes.push(lapTime);
    player.bestLap = Math.min(player.bestLap, lapTime);
    player.lapStart = this.raceElapsed;
    player.lap += 1;
    if (player.lap > LAPS) {
      this._finishPlayer();
      return;
    }
    this._emit('lap', {
      lap: player.lap,
      lapTime,
      totalLaps: LAPS
    });
    this.audio?.pickupBoost();
  }

  _finishPlayer() {
    const player = this.player;
    player.finished = true;
    player.finishTime = this.raceElapsed;
    player.boosting = false;
    player.boostTime = 0;
    player.drift.active = false;
    player.nitro = Math.min(1, player.nitro);
    this.mode = 'finished';
    this.finishClock = 1.15;
    this.isCoasting = true;
    this.audio?.driftEnd();
    this.audio?.boostEnd();
    this.audio?.finish(true);
    this._emit('player-finish');
  }

  _updateFinished(dt) {
    const player = this.player;
    player.speed = Math.max(0, player.speed - 18 * dt);
    const forwardX = Math.sin(player.course);
    const forwardZ = Math.cos(player.course);
    player.position.x += forwardX * player.speed * dt;
    player.position.z += forwardZ * player.speed * dt;
    this._resolveTrackContact(dt);
    player.speedKmh = Math.round(player.speed * SPEED_DISPLAY_FACTOR);
    player.gear = clamp(Math.floor(player.speed / 13.4) + 1, 1, 7);
    player.wheelSpin += player.speed * dt / 0.41;
    this._updatePlayerCarTransform(dt);
    this._updateCarVisuals(this.playerCar, player, 0, dt);
  }

  _updateAI(dt) {
    if (this.mode !== 'racing' && this.mode !== 'finished') return;
    const playerDistance = this.player.lap - 1 + this.player.trackT;
    this.ai.forEach((driver, index) => {
      if (driver.finished) {
        driver.speed = damp(driver.speed, Math.max(5, driver.speed), 1.4, dt);
      } else {
        const aheadPose = this.track.getPoseAt(driver.t + 0.007);
        const currentPose = this.track.getPoseAt(driver.t);
        const curve = Math.acos(clamp(aheadPose.tangent.dot(currentPose.tangent), -1, 1));
        const aiDistance = driver.lap - 1 + driver.t;
        const gap = playerDistance - aiDistance;
        const rubberBand = clamp(gap * 0.45, -3.8, 4.1);
        const target = driver.baseSpeed * (1 - clamp(curve * 0.9, 0, 0.23)) + rubberBand;
        driver.targetSpeed = target;
        driver.speed = damp(driver.speed, target, 0.9, dt);
        if (this.mode === 'racing') {
          driver.t += (driver.speed * dt) / this.track.length;
        }
        if (driver.t >= 1) {
          driver.t -= 1;
          driver.lap += 1;
          if (driver.lap > LAPS) {
            driver.finished = true;
            driver.finishTime = this.raceElapsed;
            driver.lap = LAPS;
            driver.t = 0;
            this._emit('ai-finish', { name: driver.name, time: driver.finishTime });
          }
        }
        const laneTarget = Math.sin(driver.t * Math.PI * 18 + driver.phase) * 2.4 +
          Math.sin(driver.t * Math.PI * 47 + index) * 0.9;
        driver.lateral = damp(driver.lateral, laneTarget, 1.2, dt);
      }

      const pose = this.track.getPoseAt(driver.t, driver.lateral);
      driver.car.position.copy(pose.position);
      const wheelSpin = (driver.wheelSpin += driver.speed * dt / 0.41);
      this._orientCarToPose(driver.car, pose, driver.car.position, 0);
      this._updateWheelVisuals(driver.car, wheelSpin, Math.sin(driver.t * 20) * 0.16);
      this._updateCarVisuals(driver.car, {
        wheelSpin,
        steeringVisual: 0,
        boosting: false,
        miniBoostTime: 0
      }, 0, dt);
      this._updateContactShadow(driver.shadow, pose.position, headingFromTangent(pose.tangent));

      if (driver.speed > 48 && Math.random() < dt * 7) {
        const forward = pose.tangent.clone();
        const p = pose.position.clone().addScaledVector(forward, -1.8).addScaledVector(UP, 0.2);
        this.sparkSystem.burst(
          p,
          forward.clone().multiplyScalar(-3),
          new THREE.Color(driver.accent),
          1,
          0.08,
          0.28
        );
      }
    });
  }

  _orientCarToPose(car, pose, position, additionalYaw = 0) {
    const slope = Math.asin(clamp(pose.tangent.y, -0.45, 0.45));
    car.rotation.order = 'YXZ';
    car.rotation.set(-slope, headingFromTangent(pose.tangent) + additionalYaw, -pose.bank);
    car.position.copy(position);
  }

  _checkAICollisions() {
    if (this.aiCollisionCooldown > 0) return;
    const player = this.player;
    for (const driver of this.ai) {
      if (driver.finished) continue;
      const dx = player.position.x - driver.car.position.x;
      const dz = player.position.z - driver.car.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < 7.0) {
        const distance = Math.sqrt(distSq) || 0.1;
        const nx = dx / distance;
        const nz = dz / distance;
        player.position.x += nx * 0.9;
        player.position.z += nz * 0.9;
        player.speed *= 0.76;
        player.heading += (nx * 0.02);
        driver.speed *= 0.9;
        player.contactShake = Math.max(player.contactShake, 0.4);
        this.audio?.hit();
        this._emit('collision', { strength: 0.3, opponent: driver.name });
        this.aiCollisionCooldown = 0.7;
        this._updatePlayerCarTransform(1 / 60);
        break;
      }
    }
  }

  _updateRacePositions() {
    const entries = [
      {
        id: 'player',
        name: '你',
        position: this.player.lap - 1 + this.player.trackT,
        finished: this.player.finished,
        finishTime: this.player.finishTime,
        isPlayer: true
      },
      ...this.ai.map((driver) => ({
        id: driver.name,
        name: driver.name,
        position: driver.lap - 1 + driver.t,
        finished: driver.finished,
        finishTime: driver.finishTime,
        isPlayer: false
      }))
    ];
    entries.sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.position - a.position;
    });
    entries.forEach((entry, index) => {
      if (entry.isPlayer) {
        this.player.rank = index + 1;
      } else {
        const driver = this.ai.find((item) => item.name === entry.name);
        if (driver) driver.rank = index + 1;
      }
    });
    this.rankings = entries;
  }

  _updateCamera(dt, racing) {
    if (this.mode === 'lobby') {
      return;
    }
    const player = this.player;
    if (racing) {
      const forwards = new THREE.Vector3(Math.sin(player.course), 0, Math.cos(player.course));
      const rights = new THREE.Vector3(forwards.z, 0, -forwards.x);
      let distance = 9.35;
      let height = 4.05;
      let lookAhead = 8.4;
      if (this.cameraMode === 1) {
        this.cameraDesired.copy(player.position)
          .addScaledVector(forwards, 0.75)
          .addScaledVector(UP, 1.32);
        this.cameraLookDesired.copy(player.position)
          .addScaledVector(forwards, 16)
          .addScaledVector(UP, 1.2);
      } else {
        if (this.cameraMode === 2) {
          distance = 13.6;
          height = 5.3;
          lookAhead = 10.5;
        }
        const speedOffset = clamp(Math.abs(player.speed) / NORMAL_TOP_SPEED, 0, 1.2);
        distance += speedOffset * 1.3;
        height += speedOffset * 0.28;
        this.cameraDesired.copy(player.position)
          .addScaledVector(forwards, -distance)
          .addScaledVector(UP, height)
          .addScaledVector(rights, player.steer * 0.45);
        this.cameraLookDesired.copy(player.position)
          .addScaledVector(forwards, lookAhead)
          .addScaledVector(UP, 0.8);
      }

      if (this.mode === 'countdown') {
        this.camera.position.lerp(this.cameraDesired, 1 - Math.exp(-1.8 * dt));
        this.cameraLook.lerp(this.cameraLookDesired, 1 - Math.exp(-2.1 * dt));
      } else {
        this.camera.position.lerp(this.cameraDesired, 1 - Math.exp(-6.2 * dt));
        this.cameraLook.lerp(this.cameraLookDesired, 1 - Math.exp(-8.5 * dt));
      }

      const speedRatio = clamp(Math.abs(player.speed) / NORMAL_TOP_SPEED, 0, 1.25);
      this.camera.fov = damp(
        this.camera.fov,
        56 + (this.cameraMode === 1 ? 9 : 0) + speedRatio * 7 + (player.boosting ? 7 : 0),
        4.5,
        dt
      );
      this.camera.updateProjectionMatrix();
      this.camera.position.x += Math.sin(this.raceElapsed * 43) * player.contactShake * 0.12;
      this.camera.position.y += Math.cos(this.raceElapsed * 39) * player.contactShake * 0.08;
      this.camera.lookAt(this.cameraLook);
      this.cameraShake = damp(this.cameraShake, player.boosting ? 0.4 : player.contactShake, 3, dt);
      if (player.contactShake > 0) {
        player.contactShake = Math.max(0, player.contactShake - dt * 1.9);
      }
    } else {
      const look = this.player.position.clone().addScaledVector(UP, 0.8);
      this.camera.position.lerp(this.cameraDesired, 1 - Math.exp(-3 * dt));
      this.cameraLook.lerp(look, 1 - Math.exp(-3 * dt));
      this.camera.lookAt(this.cameraLook);
    }

    if (this.cameraMode === 1 && this.mode !== 'lobby') {
      this.playerCar.visible = false;
      this.playerShadow.visible = false;
    } else {
      this.playerCar.visible = true;
      this.playerShadow.visible = true;
    }
  }

  cycleCamera() {
    this.cameraMode = (this.cameraMode + 1) % 3;
    return this.cameraMode;
  }

  _updateEngineAudio(input) {
    const player = this.player;
    this.audio?.setEngine({
      speed: clamp(Math.abs(player.speed) / BOOST_TOP_SPEED, 0, 1),
      throttle: input.throttle ? 1 : 0,
      drifting: player.drift.active,
      boosting: player.boosting
    });
  }

  _updateParticles(dt) {
    if (this.player.boosting || this.player.miniBoostTime > 0) {
      const car = this.playerCar;
      const anchors = car.userData.exhausts || [];
      anchors.forEach((anchor) => {
        const world = anchor.getWorldPosition(new THREE.Vector3());
        const forward = new THREE.Vector3(Math.sin(this.player.course), 0, Math.cos(this.player.course));
        this.sparkSystem.spawn(
          world,
          forward.clone().multiplyScalar(-11 - Math.random() * 7),
          Math.random() < 0.35 ? new THREE.Color(0xffc75b) : new THREE.Color(0x54eaff),
          0.14 + Math.random() * 0.12,
          0.24,
          1.6
        );
      });
    }

    if (this.player.offRoad && Math.abs(this.player.speed) > 8) {
      const back = this.player.position.clone()
        .addScaledVector(new THREE.Vector3(Math.sin(this.player.course), 0, Math.cos(this.player.course)), -2);
      this.sparkSystem.spawn(
        back,
        new THREE.Vector3(0, 1.8, 0),
        new THREE.Color(0x8a7c69),
        0.25,
        0.6,
        1.5
      );
    }
  }

  _updateLobbyIdleOnly(elapsed, dt) {
    this._updateLobbyIdle(elapsed, dt, false);
  }

  resetToTrack() {
    if (this.mode !== 'racing') return;
    const previousT = this.player.trackT;
    const pose = this.track.getPoseAt(previousT, 0);
    this.player.position.copy(pose.position);
    this.player.position.y += 0.03;
    this.player.heading = headingFromTangent(pose.tangent);
    this.player.course = this.player.heading;
    this.player.nearestIndex = pose.index;
    this.player.speed = 0;
    this.player.boosting = false;
    this.player.boostTime = 0;
    this.player.drift.active = false;
    this.player.contactShake = 0.2;
    this.playerCar.position.copy(this.player.position);
    this.audio?.boostEnd();
    this.audio?.driftEnd();
    this._emit('reset');
  }

  setPaused(paused) {
    this.paused = paused;
    this.audio?.setPaused(paused);
  }

  getState() {
    const player = this.player;
    return {
      mode: this.mode,
      paused: this.paused,
      lap: Math.min(player.lap, LAPS),
      totalLaps: LAPS,
      position: player.rank,
      totalRacers: this.ai.length + 1,
      raceTime: this.raceElapsed,
      lapTime: player.currentLapTime,
      speedKmh: player.speedKmh,
      gear: player.gear,
      nitro: player.nitro,
      boosting: player.boosting,
      miniBoosting: player.miniBoostTime > 0,
      driftActive: player.drift.active,
      driftTime: player.drift.time,
      driftCharge: clamp(player.drift.time / 2.4, 0, 1),
      driftScore: Math.round(player.driftScore),
      topSpeed: player.topSpeed,
      wrongWay: player.wrongWay,
      playerT: player.trackT,
      bestLap: player.bestLap,
      rankings: this.rankings || [],
      ai: this.ai.map((driver) => ({
        t: driver.t,
        lap: driver.lap,
        lateral: driver.lateral,
        color: driver.accent,
        rank: driver.rank
      }))
    };
  }

  getResults() {
    this._updateRacePositions();
    const player = this.player;
    const playerFinished = player.finished;
    const leaderTime = this.rankings
      .filter((entry) => entry.finished && Number.isFinite(entry.finishTime))
      .reduce((min, entry) => Math.min(min, entry.finishTime), Infinity);
    const place = this.player.rank;
    let previousGap = 0;
    const leaderboard = this.rankings.map((entry, index) => {
      let gap = '--';
      if (entry.finished && entry.finishTime !== null) {
        gap = index === 0 ? 'LEADER' : `+${Math.max(0, entry.finishTime - leaderTime).toFixed(3)}s`;
        if (index > 0) previousGap = Math.max(previousGap, entry.finishTime - leaderTime);
      } else {
        const driver = this.ai.find((item) => item.name === entry.name);
        const remaining = Math.max(0, LAPS - entry.position) * this.track.length;
        const estimate = remaining / Math.max(35, driver?.speed || 45);
        previousGap = Math.max(previousGap + 0.6, estimate);
        gap = `≈ +${Math.max(1.2, previousGap).toFixed(1)}s`;
      }
      return {
        place: index + 1,
        name: entry.isPlayer ? '你' : entry.name,
        isPlayer: entry.isPlayer,
        gap,
        color: entry.isPlayer
          ? `#${new THREE.Color(LIVERIES[this.liveryIndex].body).getHexString()}`
          : `#${new THREE.Color(this.ai.find((item) => item.name === entry.name)?.body || 0xffffff).getHexString()}`
      };
    });
    return {
      place,
      totalTime: player.finishTime ?? this.raceElapsed,
      bestLap: Number.isFinite(player.bestLap) ? player.bestLap : player.finishTime ?? 0,
      score: Math.round(player.driftScore),
      topSpeed: player.topSpeed,
      leaderboard,
      win: playerFinished && place === 1
    };
  }
}

function playerCarWheelRadius(car) {
  return car.userData.wheelRadius;
}
