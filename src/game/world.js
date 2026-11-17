import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const UP = new THREE.Vector3(0, 1, 0);

function createRandom(seed = 1234567) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, context: canvas.getContext('2d') };
}

function makeTexture(w, h, draw, clamp = false) {
  const { canvas, context } = makeCanvas(w, h);
  draw(context, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  return texture;
}

function createWindowTexture(emissiveColor, variant = 0) {
  const random = createRandom(950 + variant * 171);
  return makeTexture(256, 1024, (context, w, h) => {
    context.fillStyle = variant % 2 === 0 ? '#07131e' : '#091018';
    context.fillRect(0, 0, w, h);
    const columns = 8;
    const rows = 30;
    const cellW = w / columns;
    const cellH = h / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const lit = random() > 0.44;
        if (!lit) {
          context.fillStyle = 'rgba(4, 10, 16, 0.78)';
        } else {
          const alpha = 0.35 + random() * 0.65;
          context.fillStyle = emissiveColor.replace('ALPHA', alpha.toFixed(2));
        }
        context.fillRect(
          column * cellW + 4,
          row * cellH + 3,
          cellW - 8,
          cellH - 7
        );
      }
    }
    context.fillStyle = 'rgba(120, 200, 230, 0.05)';
    for (let y = 0; y < h; y += cellH) {
      context.fillRect(0, y, w, 1);
    }
  });
}

function createNeonTexture(text, color, subtext = 'NEON CITY') {
  const texture = makeTexture(640, 320, (context, w, h) => {
    context.clearRect(0, 0, w, h);
    context.fillStyle = 'rgba(3, 11, 20, 0.88)';
    context.fillRect(8, 8, w - 16, h - 16);
    context.strokeStyle = color;
    context.lineWidth = 4;
    context.strokeRect(14, 14, w - 28, h - 28);
    context.shadowColor = color;
    context.shadowBlur = 26;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.font = '900 142px "Microsoft YaHei", "Noto Sans SC", sans-serif';
    context.fillText(text, w / 2, h / 2 + 24);
    context.shadowBlur = 10;
    context.font = '700 25px Arial, sans-serif';
    context.fillStyle = 'rgba(231, 250, 255, 0.82)';
    context.fillText(subtext, w / 2, h * 0.82);
    context.shadowBlur = 0;
  }, true);
  return texture;
}

function createCornerTexture(number, color) {
  return makeTexture(320, 420, (context, w, h) => {
    context.clearRect(0, 0, w, h);
    context.fillStyle = 'rgba(5, 15, 25, 0.95)';
    context.fillRect(6, 6, w - 12, h - 12);
    context.strokeStyle = color;
    context.lineWidth = 7;
    context.strokeRect(12, 12, w - 24, h - 24);
    context.fillStyle = color;
    context.fillRect(20, 20, w - 40, 6);
    context.fillRect(20, h - 26, w - 40, 6);
    context.fillStyle = 'rgba(235, 252, 255, 0.9)';
    context.textAlign = 'center';
    context.font = '700 25px Arial, sans-serif';
    context.fillText('NEON CITY 11', w / 2, 70);
    context.fillStyle = color;
    context.font = 'italic 900 190px Arial Black, sans-serif';
    context.textBaseline = 'middle';
    context.fillText(String(number).padStart(2, '0'), w / 2, h * 0.51);
    context.fillStyle = 'rgba(238, 252, 255, 0.8)';
    context.font = '700 22px Arial, sans-serif';
    context.fillText('CITY CORNER', w / 2, h - 48);
    context.fillStyle = color;
    context.fillRect(w / 2 - 58, h - 95, 116, 4);
  }, true);
}

function createSunTexture() {
  return makeTexture(512, 512, (context, w, h) => {
    const gradient = context.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 245, 1)');
    gradient.addColorStop(0.08, 'rgba(255, 238, 191, 0.95)');
    gradient.addColorStop(0.25, 'rgba(255, 168, 92, 0.62)');
    gradient.addColorStop(0.55, 'rgba(255, 105, 86, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 64, 111, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
  }, true);
}

function createCloudTexture() {
  return makeTexture(512, 256, (context, w, h) => {
    const random = createRandom(191);
    context.clearRect(0, 0, w, h);
    for (let i = 0; i < 32; i += 1) {
      const x = 50 + random() * (w - 100);
      const y = 65 + random() * (h - 130);
      const rx = 35 + random() * 85;
      const ry = 13 + random() * 35;
      const gradient = context.createRadialGradient(x, y, 1, x, y, rx);
      gradient.addColorStop(0, `rgba(216, 203, 232, ${0.03 + random() * 0.08})`);
      gradient.addColorStop(1, 'rgba(109, 102, 166, 0)');
      context.save();
      context.translate(x, y);
      context.scale(1, ry / rx);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, rx, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }, true);
}

function createContactTexture() {
  return makeTexture(128, 128, (context, w, h) => {
    const gradient = context.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
    gradient.addColorStop(0.45, 'rgba(0,0,0,0.26)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
  }, true);
}

function makeSky() {
  const geometry = new THREE.SphereGeometry(2100, 48, 28);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x060b21) },
      midColor: { value: new THREE.Color(0x282054) },
      horizonColor: { value: new THREE.Color(0xdb5b63) },
      hazeColor: { value: new THREE.Color(0xf6a266) },
      sunColor: { value: new THREE.Color(0xffdca0) },
      sunDirection: { value: new THREE.Vector3(0.72, 0.12, 0.28).normalize() }
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 hazeColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      varying vec3 vDirection;

      void main() {
        vec3 direction = normalize(vDirection);
        float height = clamp(direction.y, -0.18, 1.0);
        float upperMix = smoothstep(0.05, 0.72, height);
        float lowerMix = smoothstep(-0.12, 0.18, height);
        vec3 sky = mix(horizonColor, midColor, lowerMix);
        sky = mix(sky, topColor, upperMix);

        float horizonBand = pow(1.0 - clamp(abs(direction.y + 0.01) * 4.8, 0.0, 1.0), 3.0);
        sky += hazeColor * horizonBand * 0.34;

        float sunDot = max(dot(direction, sunDirection), 0.0);
        float sunCore = pow(sunDot, 740.0);
        float sunGlow = pow(sunDot, 24.0);
        float sunWide = pow(sunDot, 4.0);
        sky += sunColor * sunCore * 4.2;
        sky += sunColor * sunGlow * 0.65;
        sky += vec3(1.0, 0.38, 0.36) * sunWide * 0.14;

        float streak = pow(max(0.0, 1.0 - abs(direction.y - 0.02) * 22.0), 5.0);
        streak *= 0.55 + 0.45 * sin(atan(direction.z, direction.x) * 8.0);
        sky += vec3(0.86, 0.28, 0.42) * streak * 0.08;

        gl_FragColor = vec4(sky, 1.0);
      }
    `
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = 'DuskSky';
  return sky;
}

function createStars() {
  const count = 1100;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const random = createRandom(9001);
  for (let i = 0; i < count; i += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(0.2 + random() * 0.8);
    const r = 1600;
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    positions[i * 3 + 1] = Math.cos(phi) * r;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    sizes[i] = 0.7 + random() * 1.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 } },
    vertexShader: `
      attribute float size;
      varying float vAlpha;
      uniform float time;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (160.0 / -mvPosition.z);
        vAlpha = 0.35 + 0.45 * sin(time * 0.8 + position.x * 0.17);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(0.82, 0.93, 1.0, alpha);
      }
    `
  });
  return new THREE.Points(geometry, material);
}

function createWater() {
  const geometry = new THREE.PlaneGeometry(4200, 4200, 96, 96);
  const material = new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x02111f) },
      uShallow: { value: new THREE.Color(0x0a4052) },
      uSky: { value: new THREE.Color(0x9b5869) },
      uSun: { value: new THREE.Color(0xffb878) }
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        vUv = uv;
        vec3 p = position;
        vec4 world = modelMatrix * vec4(p, 1.0);
        float wave = sin(world.x * 0.032 + uTime * 0.45) * 0.22;
        wave += sin(world.z * 0.041 - uTime * 0.33) * 0.16;
        wave += sin((world.x + world.z) * 0.089 + uTime * 0.7) * 0.06;
        world.y += wave;
        vWorld = world.xyz;
        vWave = wave;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uSun;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying float vWave;

      void main() {
        float dist = length(vWorld.xz - cameraPosition.xz);
        float horizon = smoothstep(120.0, 1900.0, dist);
        float bands = sin(vWorld.z * 0.34 + vWorld.x * 0.05 + uTime * 1.1) * 0.5 + 0.5;
        bands *= sin(vWorld.x * 0.11 - uTime * 0.45 + vWave * 8.0) * 0.5 + 0.5;
        bands = smoothstep(0.7, 1.0, bands);
        float path = pow(max(0.0, 1.0 - abs(vWorld.x - cameraPosition.x + 80.0) / 520.0), 4.0);
        float shimmer = bands * (0.12 + path * 0.8);
        vec3 color = mix(uDeep, uShallow, clamp(vWave * 0.8 + 0.44, 0.0, 1.0));
        color = mix(color, uSky, horizon * 0.44);
        color += uSun * shimmer * 0.58;
        color += vec3(0.12, 0.34, 0.4) * bands * 0.08;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
  const water = new THREE.Mesh(geometry, material);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -5.7;
  water.receiveShadow = false;
  return water;
}

function createTerrain() {
  const geometry = new THREE.PlaneGeometry(1500, 930, 48, 32);
  const position = geometry.attributes.position;
  const random = createRandom(7123);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const edge = Math.max(0, Math.abs(x) / 730 - 0.45) + Math.max(0, Math.abs(y) / 440 - 0.42);
    const noise = Math.sin(x * 0.07) * 0.18 + Math.cos(y * 0.11) * 0.12 + (random() - 0.5) * 0.25;
    position.setZ(i, noise + edge * -7);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0x17252b,
    roughness: 1,
    metalness: 0.02
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -3.75, -90);
  mesh.receiveShadow = true;
  return mesh;
}

function createMountainRing() {
  const group = new THREE.Group();
  const geometry = new THREE.ConeGeometry(100, 230, 5);
  const material = new THREE.MeshBasicMaterial({
    color: 0x101626,
    side: THREE.DoubleSide,
    fog: true
  });
  const random = createRandom(44);
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2 + random() * 0.2;
    const distance = 1250 + random() * 340;
    const mountain = new THREE.Mesh(geometry, material);
    mountain.position.set(
      Math.cos(angle) * distance,
      -20 + random() * 20,
      Math.sin(angle) * distance
    );
    mountain.scale.set(0.9 + random() * 1.5, 0.55 + random() * 0.9, 0.7 + random() * 1.4);
    mountain.rotation.y = random() * Math.PI;
    group.add(mountain);
  }
  return group;
}

function createBalloon() {
  const group = new THREE.Group();
  const balloon = new THREE.Mesh(
    new THREE.SphereGeometry(13, 24, 16),
    new THREE.MeshPhysicalMaterial({
      color: 0x6c244a,
      metalness: 0.4,
      roughness: 0.32,
      transmission: 0.08,
      clearcoat: 0.7
    })
  );
  balloon.scale.set(1, 0.64, 1.35);
  group.add(balloon);
  const gondola = new THREE.Mesh(
    new THREE.BoxGeometry(9, 2.4, 4.5),
    new THREE.MeshStandardMaterial({ color: 0x10151c, metalness: 0.6, roughness: 0.3 })
  );
  gondola.position.y = -8.2;
  group.add(gondola);
  const texture = createNeonTexture('11', '#ff4c88', 'NEON CITY AIR');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 8),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, side: THREE.DoubleSide })
  );
  sign.position.set(0, 0, 12.3);
  group.add(sign);
  const underglow = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.08, 4.5),
    new THREE.MeshBasicMaterial({ color: 0x36e8ff, toneMapped: false })
  );
  underglow.position.y = -9.5;
  group.add(underglow);
  group.scale.setScalar(1.2);
  return group;
}

function buildPalmGeometry() {
  const trunk = new THREE.CylinderGeometry(0.21, 0.46, 6.7, 6);
  trunk.translate(0, 3.35, 0);
  return trunk;
}

function buildPalmCrownGeometry() {
  const blades = [];
  for (let i = 0; i < 9; i += 1) {
    const geometry = new THREE.SphereGeometry(1, 4, 2);
    geometry.scale(0.42, 0.075, 3.6);
    geometry.translate(0, 0.16, 2.8);
    geometry.rotateY((i / 9) * Math.PI * 2 + (i % 2) * 0.16);
    geometry.rotateX(0.18 + (i % 3) * 0.05);
    blades.push(geometry);
  }
  return mergeGeometries(blades, false);
}

function createSkylineTower() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0x19212d,
    roughness: 0.28,
    metalness: 0.82
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x1e4150,
    metalness: 0.68,
    roughness: 0.16,
    transmission: 0.1,
    transparent: true,
    opacity: 0.92
  });
  const magenta = new THREE.MeshBasicMaterial({ color: 0xff3d72, toneMapped: false });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x1ae8ff, toneMapped: false });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 12.5, 78, 8), metal);
  base.position.y = 35;
  base.castShadow = true;
  group.add(base);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 8.2, 92, 8), glass);
  shaft.position.y = 118;
  shaft.castShadow = true;
  group.add(shaft);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(4.5, 34, 8), metal);
  crown.position.y = 181;
  group.add(crown);
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.58, 55, 6), metal);
  needle.position.y = 225;
  group.add(needle);

  for (const [height, radius, material] of [
    [70, 13.5, magenta],
    [92, 9.2, cyan],
    [137, 8.8, magenta],
    [162, 6.4, cyan]
  ]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.17, 5, 48), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = height;
    group.add(ring);
  }

  const spokes = new THREE.Group();
  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.16, 12, 0.16), cyan);
    spoke.position.set(Math.cos((i / 8) * Math.PI * 2) * 9.2, 76, Math.sin((i / 8) * Math.PI * 2) * 9.2);
    spokes.add(spoke);
  }
  group.add(spokes);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff5478, toneMapped: false })
  );
  beacon.position.y = 253;
  group.add(beacon);
  group.position.set(-72, -3.3, -104);
  return group;
}

function createGrandstand(track, scene) {
  const sample = track.getPoseAt(0.995, -19.5);
  const group = new THREE.Group();
  group.position.copy(sample.position).addScaledVector(sample.up, 0.1);
  group.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(sample.right, sample.up, sample.tangent)
  );
  const concrete = new THREE.MeshStandardMaterial({
    color: 0x333c46,
    roughness: 0.82,
    metalness: 0.08
  });
  const seatMaterial = new THREE.MeshStandardMaterial({
    color: 0x102f43,
    roughness: 0.62,
    metalness: 0.14
  });
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x141c24,
    roughness: 0.35,
    metalness: 0.76
  });
  const neonMaterial = new THREE.MeshBasicMaterial({ color: 0x1ae8ff, toneMapped: false });

  for (let row = 0; row < 5; row += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1 + row * 0.75, 61), concrete);
    step.position.set(-row * 2.8, (1 + row * 0.75) / 2, 0);
    group.add(step);
    const seats = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.24, 59), seatMaterial);
    seats.position.set(-row * 2.8, 0.86 + row * 0.75, 0);
    group.add(seats);
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(23, 0.8, 65), roofMaterial);
  roof.position.set(-7, 14.5, 0);
  roof.rotation.z = -0.08;
  group.add(roof);
  for (const z of [-25, 25]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.7, 14, 0.7), roofMaterial);
    support.position.set(-14.5, 7.1, z);
    group.add(support);
  }
  const roofEdge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 65), neonMaterial);
  roofEdge.position.set(4.2, 13.78, 0);
  group.add(roofEdge);

  const random = createRandom(887);
  const crowdGeometry = new THREE.SphereGeometry(0.25, 5, 4);
  const crowdMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const crowd = new THREE.InstancedMesh(crowdGeometry, crowdMaterial, 430);
  const dummy = new THREE.Object3D();
  const colors = [
    new THREE.Color(0xff4772),
    new THREE.Color(0x21c9ea),
    new THREE.Color(0xf4d469),
    new THREE.Color(0xdfe9ef),
    new THREE.Color(0x8d6cff)
  ];
  for (let i = 0; i < 430; i += 1) {
    const row = Math.floor(random() * 5);
    dummy.position.set(
      -row * 2.8 + (random() - 0.5) * 1.9,
      1.18 + row * 0.75,
      (random() - 0.5) * 57
    );
    dummy.scale.set(0.85, 1.35, 0.85);
    dummy.updateMatrix();
    crowd.setMatrixAt(i, dummy.matrix);
    crowd.setColorAt(i, colors[Math.floor(random() * colors.length)]);
  }
  group.add(crowd);
  scene.add(group);
  return group;
}

export class World {
  constructor(scene, track, quality = {}) {
    this.scene = scene;
    this.track = track;
    this.group = new THREE.Group();
    this.group.name = 'ElevenCityWorld';
    this.quality = quality;
    this.traffic = [];
    this.clouds = [];
    this.elapsed = 0;
    this.random = createRandom(20261117);
    scene.fog = new THREE.FogExp2(0x0c1725, 0.0007);
    scene.background = new THREE.Color(0x070d1c);

    this.sky = makeSky();
    this.stars = createStars();
    this.group.add(this.sky, this.stars);
    this._buildLighting();
    this._buildEnvironment();
    this._buildCity();
    this._buildPalms();
    this._buildStreetLights();
    this._buildStartDistrict();
    this._buildCornerBoards();
    this._buildAtmosphere();
    scene.add(this.group);
  }

  _buildLighting() {
    this.hemisphere = new THREE.HemisphereLight(0x93a9d6, 0x2a2224, 1.8);
    this.scene.add(this.hemisphere);

    const ambient = new THREE.AmbientLight(0x9d8bb5, 0.7);
    this.scene.add(ambient);

    this.sun = new THREE.DirectionalLight(0xffb07a, 2.9);
    this.sun.position.set(90, 170, 160);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -95;
    this.sun.shadow.camera.right = 95;
    this.sun.shadow.camera.top = 95;
    this.sun.shadow.camera.bottom = -95;
    this.sun.shadow.camera.near = 15;
    this.sun.shadow.camera.far = 410;
    this.sun.shadow.bias = -0.00022;
    this.sun.shadow.normalBias = 0.45;
    this.sun.target.position.set(0, 0, 0);
    this.scene.add(this.sun, this.sun.target);

    const rim = new THREE.DirectionalLight(0x5e7dff, 1.25);
    rim.position.set(-220, 80, -260);
    this.scene.add(rim);

    const skyGlow = new THREE.PointLight(0xff6c76, 70, 950, 2);
    skyGlow.position.set(580, 150, 620);
    this.scene.add(skyGlow);
  }

  _buildEnvironment() {
    this.water = createWater();
    this.group.add(this.water);
    this.terrain = createTerrain();
    this.group.add(this.terrain);
    this.group.add(createMountainRing());

    const sunSpriteMaterial = new THREE.SpriteMaterial({
      map: createSunTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    this.sunSprite = new THREE.Sprite(sunSpriteMaterial);
    this.sunSprite.scale.set(430, 430, 1);
    this.sunSprite.position.set(1200, 190, 540);
    this.group.add(this.sunSprite);

    const cloudTexture = createCloudTexture();
    for (let i = 0; i < 14; i += 1) {
      const material = new THREE.SpriteMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.32 + this.random() * 0.22,
        depthWrite: false,
        color: i % 3 === 0 ? 0xbd9db7 : 0x95a1bd
      });
      const cloud = new THREE.Sprite(material);
      const angle = this.random() * Math.PI * 2;
      const distance = 760 + this.random() * 800;
      cloud.position.set(
        Math.cos(angle) * distance,
        120 + this.random() * 220,
        Math.sin(angle) * distance
      );
      const scale = 240 + this.random() * 380;
      cloud.scale.set(scale, scale * 0.4, 1);
      this.clouds.push(cloud);
      this.group.add(cloud);
    }

    const balloon = createBalloon();
    balloon.position.set(320, 195, -120);
    balloon.rotation.y = -0.4;
    this.balloon = balloon;
    this.group.add(balloon);

    const grid = new THREE.GridHelper(1420, 64, 0x1e7e93, 0x13333e);
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    grid.position.set(0, -3.58, -90);
    this.group.add(grid);

    const shoreline = new THREE.Mesh(
      new THREE.PlaneGeometry(1500, 16),
      new THREE.MeshBasicMaterial({
        color: 0x6de7ef,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    shoreline.rotation.x = -Math.PI / 2;
    shoreline.position.set(0, -4.7, 366);
    this.group.add(shoreline);
  }

  _buildCity() {
    const facadeVariants = [
      createWindowTexture('rgba(88, 235, 255, ALPHA)', 0),
      createWindowTexture('rgba(255, 83, 133, ALPHA)', 1),
      createWindowTexture('rgba(255, 208, 105, ALPHA)', 2),
      createWindowTexture('rgba(164, 151, 255, ALPHA)', 3)
    ];

    const groups = facadeVariants.map((texture, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: 0x4d5964,
        map: texture,
        emissive: index === 0 ? 0x4bd9ff : index === 1 ? 0xff4277 : 0xffe5a6,
        emissiveMap: texture,
        emissiveIntensity: 1.45,
        roughness: 0.52,
        metalness: 0.3
      });
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, 0);
      mesh.receiveShadow = true;
      mesh.castShadow = qualityAsBool(this.quality.buildings);
      return { mesh, transforms: [] };
    });

    const buildings = [];
    const random = this.random;
    const zones = [
      { x: -260, z: -135, rx: 300, rz: 170 },
      { x: 235, z: -160, rx: 260, rz: 190 },
      { x: 30, z: -360, rx: 360, rz: 95 },
      { x: -500, z: 70, rx: 120, rz: 230 },
      { x: 530, z: 40, rx: 110, rz: 260 },
      { x: 40, z: 75, rx: 260, rz: 115 }
    ];

    let attempts = 0;
    while (buildings.length < 112 && attempts < 900) {
      attempts += 1;
      const zone = zones[Math.floor(random() * zones.length)];
      const x = zone.x + (random() - 0.5) * zone.rx;
      const z = zone.z + (random() - 0.5) * zone.rz;
      const pos = new THREE.Vector3(x, -3.5, z);
      if (this.track.distanceSqToTrack(pos) < 43 * 43) continue;
      if (x > -30 && x < 210 && z > 220) continue;
      const height = 18 + Math.pow(random(), 1.7) * 92;
      const width = 14 + random() * 22;
      const depth = 14 + random() * 22;
      const bucket = Math.floor(random() * groups.length);
      const building = {
        x,
        z,
        width,
        depth,
        height,
        tilt: (random() - 0.5) * 0.025,
        rotation: (random() - 0.5) * 0.15,
        bucket
      };
      buildings.push(building);
      const object = new THREE.Object3D();
      object.position.set(x, -3.6 + height / 2, z);
      object.rotation.set(building.tilt, building.rotation, building.tilt);
      object.scale.set(width, height, depth);
      object.updateMatrix();
      groups[bucket].transforms.push(object.matrix.clone());
    }

    for (const group of groups) {
      const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        group.mesh.material,
        group.transforms.length
      );
      group.transforms.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      mesh.instanceMatrix.needsUpdate = true;
      this.group.add(mesh);
    }

    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x131b24,
      roughness: 0.48,
      metalness: 0.36
    });
    const roofs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      roofMaterial,
      buildings.length
    );
    const antennaMaterial = new THREE.MeshBasicMaterial({ color: 0xff5075, toneMapped: false });
    const antennas = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.16, 0.35, 1, 4),
      antennaMaterial,
      buildings.length
    );
    const dummy = new THREE.Object3D();
    buildings.forEach((building, index) => {
      dummy.position.set(building.x, -3.5 + building.height + 0.5, building.z);
      dummy.rotation.set(0, building.rotation, 0);
      dummy.scale.set(building.width * 1.06, 1, building.depth * 1.06);
      dummy.updateMatrix();
      roofs.setMatrixAt(index, dummy.matrix);

      dummy.position.y = -3.5 + building.height + 3.8;
      dummy.scale.set(1, 8 + (index % 5) * 4, 1);
      dummy.updateMatrix();
      antennas.setMatrixAt(index, dummy.matrix);
    });
    this.group.add(roofs, antennas);

    this._addCityTower();
    this._addBillboards(buildings);
    this._addDistantSkyline();
  }

  _addCityTower() {
    this.cityTower = createSkylineTower();
    this.group.add(this.cityTower);
    const light = new THREE.PointLight(0xff3a7c, 95, 330, 2);
    light.position.set(-72, 132, -104);
    this.group.add(light);
  }

  _addBillboards(buildings) {
    const labels = [
      ['极速', '#ff477a', 'SPEED'],
      ['漂移', '#25e6ff', 'DRIFT'],
      ['十一城', '#ffd05a', 'CITY 11'],
      ['夜行', '#b78cff', 'NIGHT RUN'],
      ['氮气', '#51f5b1', 'NITRO'],
      ['东海湾', '#ff8559', 'EAST BAY']
    ];
    for (let i = 0; i < 8; i += 1) {
      const building = buildings[(i * 13 + 7) % buildings.length];
      const [text, color, subtext] = labels[i % labels.length];
      const texture = createNeonTexture(text, color, subtext);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        toneMapped: false,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const width = 15 + (i % 3) * 5;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.5), material);
      const target = new THREE.Vector3(-210 + (i % 4) * 150, 30, 260);
      const direction = target.clone().sub(new THREE.Vector3(building.x, 0, building.z));
      sign.position.set(
        building.x,
        Math.max(16, building.height * (0.55 + (i % 3) * 0.08)),
        building.z + building.depth * 0.51
      );
      sign.rotation.y = Math.atan2(direction.x, direction.z);
      this.group.add(sign);
    }
  }

  _addDistantSkyline() {
    const random = createRandom(802);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x0a1421 });
    const count = 58;
    const towers = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const angle = Math.PI * 0.58 + random() * Math.PI * 0.84;
      const distance = 680 + random() * 550;
      const height = 45 + random() * 160;
      dummy.position.set(
        Math.cos(angle) * distance,
        height / 2 - 4,
        Math.sin(angle) * distance
      );
      dummy.scale.set(18 + random() * 38, height, 18 + random() * 38);
      dummy.rotation.y = random() * Math.PI;
      dummy.updateMatrix();
      towers.setMatrixAt(i, dummy.matrix);
    }
    this.group.add(towers);
  }

  _buildPalms() {
    const trunkGeometry = buildPalmGeometry();
    const crownGeometry = buildPalmCrownGeometry();
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3024,
      roughness: 0.96
    });
    const crownMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b4e3b,
      roughness: 0.8,
      metalness: 0.03,
      side: THREE.DoubleSide
    });
    const positions = [];
    let attempts = 0;
    const random = createRandom(5532);
    while (positions.length < 78 && attempts < 1400) {
      attempts += 1;
      const angle = random() * Math.PI * 2;
      const radius = 70 + random() * 580;
      const x = Math.cos(angle) * radius;
      const z = -80 + Math.sin(angle) * radius * 0.72;
      if (z > 335 || z < -440) continue;
      const point = new THREE.Vector3(x, -3.4, z);
      const distanceToTrack = this.track.distanceSqToTrack(point);
      if (distanceToTrack < 20 * 20 || distanceToTrack > 58 * 58) continue;
      positions.push({ x, z, scale: 0.7 + random() * 0.6, rotation: random() * Math.PI * 2 });
    }

    const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, positions.length);
    const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, positions.length);
    const dummy = new THREE.Object3D();
    positions.forEach((position, index) => {
      dummy.position.set(position.x, -3.6, position.z);
      dummy.rotation.set(0, position.rotation, 0);
      dummy.scale.setScalar(position.scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(index, dummy.matrix);
      dummy.position.y += 6.55 * position.scale;
      dummy.updateMatrix();
      crowns.setMatrixAt(index, dummy.matrix);
    });
    trunks.castShadow = true;
    crowns.castShadow = true;
    this.group.add(trunks, crowns);
  }

  _buildStreetLights() {
    const positions = [];
    for (let i = 0; i < 128; i += 1) {
      const t = i / 128;
      const pose = this.track.getPoseAt(t, (i % 2 === 0 ? 1 : -1) * 15.8);
      positions.push(pose.position);
    }
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f2933,
      roughness: 0.4,
      metalness: 0.75
    });
    const poles = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.09, 0.16, 7, 5),
      poleMaterial,
      positions.length
    );
    const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xbdfaff, toneMapped: false });
    const bulbs = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.3, 7, 5),
      bulbMaterial,
      positions.length
    );
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x27323c,
      roughness: 0.35,
      metalness: 0.7
    });
    const arms = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.8, 0.08, 0.08),
      armMaterial,
      positions.length
    );
    const dummy = new THREE.Object3D();
    positions.forEach((position, index) => {
      dummy.position.copy(position).add(new THREE.Vector3(0, 3.2, 0));
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      poles.setMatrixAt(index, dummy.matrix);
      dummy.position.y = position.y + 6.7;
      dummy.updateMatrix();
      bulbs.setMatrixAt(index, dummy.matrix);
      dummy.position.y = position.y + 6.58;
      dummy.position.x += index % 2 === 0 ? -0.8 : 0.8;
      dummy.updateMatrix();
      arms.setMatrixAt(index, dummy.matrix);
    });
    this.group.add(poles, bulbs, arms);
  }

  _buildStartDistrict() {
    createGrandstand(this.track, this.group);

    const pitSample = this.track.getPoseAt(0.042, 25);
    const pit = new THREE.Group();
    pit.position.copy(pitSample.position);
    pit.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(pitSample.right, pitSample.up, pitSample.tangent)
    );
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(18, 13, 74),
      new THREE.MeshStandardMaterial({
        color: 0x17232e,
        roughness: 0.45,
        metalness: 0.48
      })
    );
    building.position.set(0, 3.5, -17);
    building.castShadow = true;
    pit.add(building);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 4.8, 60),
      new THREE.MeshPhysicalMaterial({
        color: 0x1d5264,
        metalness: 0.5,
        roughness: 0.1,
        transmission: 0.3,
        transparent: true,
        opacity: 0.85
      })
    );
    glass.position.set(-9.2, 4.7, -17);
    pit.add(glass);
    const signTexture = createNeonTexture('PIT', '#1ae8ff', 'TEAM GARAGES');
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(19, 9.5),
      new THREE.MeshBasicMaterial({ map: signTexture, transparent: true, toneMapped: false })
    );
    sign.position.set(-9.55, 10, -17);
    sign.rotation.y = -Math.PI / 2;
    pit.add(sign);
    this.group.add(pit);

    const lightTowerMaterial = new THREE.MeshStandardMaterial({
      color: 0x141d26,
      roughness: 0.38,
      metalness: 0.74
    });
    const floodMaterial = new THREE.MeshBasicMaterial({ color: 0xe8fbff, toneMapped: false });
    for (const t of [0.947, 0.987, 0.027, 0.067]) {
      const pose = this.track.getPoseAt(t, -18.5);
      const tower = new THREE.Group();
      tower.position.copy(pose.position);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 18, 5), lightTowerMaterial);
      pole.position.y = 9;
      tower.add(pole);
      const rig = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 0.7), lightTowerMaterial);
      rig.position.y = 17.5;
      tower.add(rig);
      for (let i = 0; i < 5; i += 1) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.12), floodMaterial);
        lamp.position.set(-2.4 + i * 1.2, 17.5, -0.4);
        tower.add(lamp);
      }
      this.group.add(tower);
    }
    const startGlow = new THREE.PointLight(0xb7f7ff, 55, 95, 2);
    startGlow.position.copy(this.track.getPoseAt(0.01).position).add(new THREE.Vector3(0, 12, 0));
    this.group.add(startGlow);
  }

  _buildCornerBoards() {
    const corners = [0.251, 0.300, 0.349, 0.394, 0.440, 0.489, 0.631, 0.683, 0.737, 0.849, 0.997];
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a252f,
      roughness: 0.42,
      metalness: 0.75
    });
    corners.forEach((t, index) => {
      const current = this.track.getPoseAt(t);
      const previous = this.track.getPoseAt(t - 0.008);
      const next = this.track.getPoseAt(t + 0.008);
      const turn = previous.tangent.z * next.tangent.x - previous.tangent.x * next.tangent.z;
      const side = turn >= 0 ? -1 : 1;
      const color = index % 2 === 0 ? '#1ae8ff' : '#ff527e';
      const pose = this.track.getPoseAt(t, side * (this.track.halfWidth + 5.8));
      const group = new THREE.Group();
      group.position.copy(pose.position);
      group.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(pose.right, pose.up, pose.tangent)
      );
      group.rotateY(Math.PI);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 3.8, 5), poleMaterial);
      pole.position.set(0, 1.9, 0);
      group.add(pole);
      const material = new THREE.MeshBasicMaterial({
        map: createCornerTexture(index + 1, color),
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.15), material);
      board.position.set(0, 4.45, 0);
      group.add(board);
      const glow = new THREE.PointLight(new THREE.Color(color), 13, 18, 2);
      glow.position.set(0, 3.4, 0.8);
      group.add(glow);
      this.group.add(group);
    });
  }

  _buildAtmosphere() {
    this.contactTexture = createContactTexture();
    const count = 240;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (this.random() - 0.5) * 420;
      positions[i * 3 + 1] = 7 + this.random() * 95;
      positions[i * 3 + 2] = -240 + this.random() * 580;
      seeds[i * 3] = 0.2 + this.random() * 0.8;
      seeds[i * 3 + 1] = 0.2 + this.random() * 0.8;
      seeds[i * 3 + 2] = 0.2 + this.random() * 0.8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
    this.motesMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute vec3 seed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.22 + seed.x * 12.0) * 8.0;
          p.y += sin(uTime * 0.4 + seed.y * 9.0) * 3.0;
          p.z += cos(uTime * 0.19 + seed.z * 8.0) * 7.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.2 + seed.x * 2.2) * uPixelRatio * (40.0 / -mv.z);
          vAlpha = 0.18 + seed.y * 0.26;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float alpha = smoothstep(0.5, 0.05, distanceToCenter) * vAlpha;
          gl_FragColor = vec4(0.77, 0.92, 0.96, alpha);
        }
      `
    });
    this.motes = new THREE.Points(geometry, this.motesMaterial);
    this.group.add(this.motes);

    const trafficGeometry = new THREE.BoxGeometry(2.4, 0.55, 0.8);
    const trafficMaterial = new THREE.MeshBasicMaterial({ color: 0x9fefff, toneMapped: false });
    for (let i = 0; i < 14; i += 1) {
      const vehicle = new THREE.Group();
      const body = new THREE.Mesh(
        trafficGeometry,
        new THREE.MeshStandardMaterial({
          color: i % 3 === 0 ? 0x5d1f37 : 0x132b39,
          metalness: 0.75,
          roughness: 0.25
        })
      );
      vehicle.add(body);
      for (const side of [-1, 1]) {
        const light = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 6, 4),
          side < 0 ? new THREE.MeshBasicMaterial({ color: 0xff3c66, toneMapped: false })
            : trafficMaterial.clone()
        );
        light.position.set(side * 1.18, 0, 0);
        vehicle.add(light);
      }
      vehicle.userData = {
        radius: 160 + this.random() * 380,
        height: 45 + this.random() * 95,
        speed: 0.025 + this.random() * 0.06,
        phase: this.random() * Math.PI * 2,
        centerX: -100 + this.random() * 260,
        centerZ: -180 + this.random() * 240
      };
      this.traffic.push(vehicle);
      this.group.add(vehicle);
    }
  }

  update(delta, elapsed, focus) {
    this.elapsed = elapsed;
    if (this.water) {
      this.water.material.uniforms.uTime.value = elapsed;
    }
    if (this.stars) {
      this.stars.material.uniforms.time.value = elapsed;
    }
    if (this.motesMaterial) {
      this.motesMaterial.uniforms.uTime.value = elapsed;
    }

    this.sky.position.copy(focus);
    this.stars.position.copy(focus);
    this.stars.position.y = 0;

    this.balloon.position.y = 195 + Math.sin(elapsed * 0.22) * 4;
    this.balloon.rotation.y = -0.4 + Math.sin(elapsed * 0.11) * 0.1;

    this.clouds.forEach((cloud, index) => {
      cloud.position.x += delta * (0.45 + (index % 4) * 0.12);
      if (cloud.position.x > 1400) {
        cloud.position.x = -1400;
      }
    });

    this.traffic.forEach((vehicle) => {
      const data = vehicle.userData;
      const angle = elapsed * data.speed + data.phase;
      vehicle.position.set(
        data.centerX + Math.cos(angle) * data.radius,
        data.height + Math.sin(elapsed * 0.6 + data.phase) * 2.2,
        data.centerZ + Math.sin(angle) * data.radius
      );
      vehicle.rotation.y = -angle + Math.PI / 2;
      vehicle.rotation.z = Math.sin(angle) * 0.04;
    });

    if (focus) {
      this.sun.target.position.copy(focus);
      this.sun.position.set(focus.x + 100, focus.y + 180, focus.z + 165);
      this.sun.target.updateMatrixWorld();
    }
  }

  createContactShadow() {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 3.2),
      new THREE.MeshBasicMaterial({
        map: this.contactTexture,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        toneMapped: false
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 2;
    return mesh;
  }
}

function qualityAsBool(value) {
  return value !== false;
}
