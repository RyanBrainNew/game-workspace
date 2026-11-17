import * as THREE from 'three';

const SAMPLE_COUNT = 1400;
const TRACK_WIDTH = 19.4;
const UP = new THREE.Vector3(0, 1, 0);

const CURVE_POINTS = [
  [-355, 2.0, 282],
  [-205, 2.4, 291],
  [-45, 3.2, 297],
  [125, 4.2, 302],
  [276, 7.2, 286],
  [382, 13.0, 224],
  [433, 17.5, 118],
  [421, 20.4, 1],
  [363, 22.5, -95],
  [262, 26.5, -165],
  [132, 30.5, -204],
  [38, 35.5, -263],
  [-50, 39.5, -333],
  [-179, 38.0, -344],
  [-306, 31.0, -300],
  [-398, 24.0, -204],
  [-457, 18.0, -73],
  [-453, 12.0, 67],
  [-407, 8.0, 188],
  [-383, 4.0, 252]
];

const START_GRID = [
  { t: 0.0092, lateral: 3.8 },
  { t: 0.0103, lateral: -3.8 },
  { t: 0.0067, lateral: -4.1 },
  { t: 0.0079, lateral: 4.1 },
  { t: 0.0048, lateral: 3.8 },
  { t: 0.0034, lateral: -3.8 }
];

const BOOST_PAD_DEFS = [
  { t: 0.113, lateral: 0.0, width: 8.4 },
  { t: 0.205, lateral: -2.8, width: 5.0 },
  { t: 0.315, lateral: 3.0, width: 5.0 },
  { t: 0.486, lateral: 0.0, width: 7.0 },
  { t: 0.642, lateral: 3.2, width: 5.0 },
  { t: 0.777, lateral: -2.4, width: 5.6 },
  { t: 0.903, lateral: 0.0, width: 7.4 }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function canvasTexture(width, height, draw, colorSpace = THREE.SRGBColorSpace) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createAsphaltTexture() {
  const texture = canvasTexture(512, 1024, (context, width, height) => {
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#202b36');
    gradient.addColorStop(0.5, '#29343f');
    gradient.addColorStop(1, '#1b242e');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    let seed = 9931;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 19000; i += 1) {
      const value = 28 + Math.floor(random() * 52);
      context.fillStyle = `rgba(${value}, ${value + 4}, ${value + 7}, ${0.06 + random() * 0.14})`;
      const size = random() < 0.92 ? 1 : 2;
      context.fillRect(random() * width, random() * height, size, size);
    }

    context.strokeStyle = 'rgba(230, 241, 247, 0.035)';
    context.lineWidth = 3;
    for (let lane = 1; lane < 4; lane += 1) {
      const x = (width / 4) * lane;
      context.setLineDash([20, 30]);
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    context.setLineDash([]);

    for (let mark = 0; mark < 12; mark += 1) {
      const x = 70 + random() * 370;
      context.strokeStyle = `rgba(5, 8, 12, ${0.075 + random() * 0.06})`;
      context.lineWidth = 3 + random() * 7;
      context.beginPath();
      context.moveTo(x, random() * height);
      context.bezierCurveTo(x - 7, height * 0.35, x + 8, height * 0.6, x - 2, height);
      context.stroke();
    }
  });
  texture.repeat.set(1, 1);
  return texture;
}

function createCurbTexture() {
  const texture = canvasTexture(128, 128, (context, width, height) => {
    context.fillStyle = '#ebedf2';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#ff355f';
    context.fillRect(0, 0, width, height / 2);
    context.fillStyle = 'rgba(255,255,255,0.24)';
    context.fillRect(0, 0, width, 8);
    context.fillStyle = 'rgba(0,0,0,0.1)';
    context.fillRect(0, height - 9, width, 9);
  });
  return texture;
}

function createSidewalkTexture() {
  return canvasTexture(256, 256, (context, width, height) => {
    context.fillStyle = '#3d4651';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = 'rgba(8, 14, 20, 0.55)';
    context.lineWidth = 3;
    for (let x = 0; x <= width; x += 64) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y <= height; y += 64) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    context.fillStyle = 'rgba(255,255,255,0.025)';
    for (let i = 0; i < 400; i += 1) {
      context.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
  });
}

function createCheckerTexture() {
  return canvasTexture(512, 128, (context, width, height) => {
    const size = 32;
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        context.fillStyle = (x / size + y / size) % 2 === 0 ? '#f0f3f6' : '#0b1017';
        context.fillRect(x, y, size, size);
      }
    }
    context.fillStyle = 'rgba(255, 61, 114, 0.82)';
    context.fillRect(0, 0, width, 4);
    context.fillRect(0, height - 4, width, 4);
  });
}

function createBoostTexture() {
  return canvasTexture(256, 512, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(1, 12, 22, 0.46)';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = 'rgba(26, 232, 255, 0.66)';
    context.lineWidth = 3;
    context.strokeRect(4, 4, width - 8, height - 8);
    for (let row = 0; row < 4; row += 1) {
      const y = 85 + row * 112;
      context.fillStyle = row % 2 === 0 ? 'rgba(76, 242, 255, 0.95)' : 'rgba(130, 255, 222, 0.9)';
      context.beginPath();
      context.moveTo(32, y);
      context.lineTo(width * 0.5, y + 52);
      context.lineTo(width - 32, y);
      context.lineTo(width - 32, y + 26);
      context.lineTo(width * 0.5, y + 80);
      context.lineTo(32, y + 26);
      context.closePath();
      context.fill();
    }
    context.fillStyle = 'rgba(255,255,255,0.8)';
    context.font = '700 18px sans-serif';
    context.textAlign = 'center';
    context.fillText('NITRO', width / 2, height - 20);
  });
}

function createStartSignTexture() {
  const texture = canvasTexture(1024, 256, (context, width, height) => {
    context.fillStyle = '#07101c';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#1ae8ff';
    context.lineWidth = 5;
    context.strokeRect(8, 8, width - 16, height - 16);
    context.strokeStyle = 'rgba(255,61,114,0.72)';
    context.lineWidth = 2;
    context.strokeRect(22, 22, width - 44, height - 44);
    context.fillStyle = '#dffaff';
    context.textAlign = 'center';
    context.font = '900 97px Arial Black, sans-serif';
    context.fillText('NEON CITY', width / 2, 112);
    context.fillStyle = '#1ae8ff';
    context.font = '700 28px Arial, sans-serif';
    context.fillText('CIRCUIT 11  //  START / FINISH', width / 2, 163);
    context.fillStyle = '#ff3d72';
    context.fillRect(width * 0.22, 191, width * 0.56, 4);
    for (let x = width * 0.25; x < width * 0.76; x += 34) {
      context.fillStyle = 'rgba(179, 237, 255, 0.55)';
      context.fillRect(x, 177, 15, 2);
    }
  });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createBannerTexture(text, accent) {
  const texture = canvasTexture(768, 256, (context, width, height) => {
    context.fillStyle = 'rgba(3, 12, 23, 0.96)';
    context.fillRect(0, 0, width, height);
    context.fillStyle = accent;
    context.fillRect(0, 0, 12, height);
    context.fillStyle = 'rgba(245,252,255,0.93)';
    context.textAlign = 'left';
    context.font = '900 90px Arial Black, sans-serif';
    context.fillText(text, 45, 123);
    context.fillStyle = accent;
    context.font = '700 27px Arial, sans-serif';
    context.fillText('NEON CITY  /  SECTOR 11', 48, 180);
    for (let i = 0; i < 12; i += 1) {
      context.fillStyle = i % 2 === 0 ? accent : 'rgba(255,255,255,0.35)';
      context.fillRect(45 + i * 28, 212, 21, 8);
    }
  });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function buildRibbon(samples, innerOffset, outerOffset, yOffset, uScale = 1, vScale = 1) {
  const positions = [];
  const uvs = [];
  const indices = [];
  let distance = 0;
  let previous = samples[0].center;

  for (let i = 0; i <= SAMPLE_COUNT; i += 1) {
    const sample = samples[i % SAMPLE_COUNT];
    if (i > 0) {
      distance += sample.center.distanceTo(previous);
    }
    previous = sample.center;
    const a = sample.center.clone()
      .addScaledVector(sample.rightBanked, innerOffset)
      .addScaledVector(sample.upBanked, yOffset);
    const b = sample.center.clone()
      .addScaledVector(sample.rightBanked, outerOffset)
      .addScaledVector(sample.upBanked, yOffset);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    uvs.push(0, (distance / 9) * vScale, 1 * uScale, (distance / 9) * vScale);
    if (i < SAMPLE_COUNT) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildVerticalRibbon(samples, lateral, height, yOffset, side = 1) {
  const positions = [];
  const uvs = [];
  const indices = [];
  let distance = 0;
  let previous = samples[0].center;

  for (let i = 0; i <= SAMPLE_COUNT; i += 1) {
    const sample = samples[i % SAMPLE_COUNT];
    if (i > 0) {
      distance += sample.center.distanceTo(previous);
    }
    previous = sample.center;
    const lower = sample.center.clone()
      .addScaledVector(sample.rightBanked, lateral)
      .addScaledVector(UP, yOffset);
    const upper = lower.clone().addScaledVector(UP, height);
    positions.push(lower.x, lower.y, lower.z, upper.x, upper.y, upper.z);
    uvs.push(distance / 18, 0, distance / 18, 1);
    if (i < SAMPLE_COUNT) {
      const base = i * 2;
      if (side > 0) {
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      } else {
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function setObjectTransform(object, sample, lateral = 0, yOffset = 0) {
  const position = sample.center.clone()
    .addScaledVector(sample.rightBanked, lateral)
    .addScaledVector(sample.upBanked, yOffset);
  object.position.copy(position);
  const basis = new THREE.Matrix4().makeBasis(
    sample.rightBanked,
    sample.upBanked,
    sample.tangent
  );
  object.quaternion.setFromRotationMatrix(basis);
}

export class RaceTrack {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'NeonCityCircuit';
    this.width = TRACK_WIDTH;
    this.halfWidth = TRACK_WIDTH * 0.5;
    this.samples = [];
    this.startLights = [];
    this.boostPads = [];
    this.startGrid = START_GRID.map((slot) => ({ ...slot }));

    this.curve = new THREE.CatmullRomCurve3(
      CURVE_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      true,
      'catmullrom',
      0.2
    );
    this.curve.arcLengthDivisions = 2400;
    this.length = this.curve.getLength();
    this._buildSamples();
    this._buildRoad();
    this._buildStartLine();
    this._buildBoostPads();
    this._buildRoadside();
    this._buildStartGantry();
    this._buildTunnel();
    this._buildOverheadBanners();
    this._buildGridMarks();
    scene.add(this.group);
  }

  _buildSamples() {
    const raw = [];
    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      const t = i / SAMPLE_COUNT;
      const center = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(UP, tangent).normalize();
      raw.push({ t, center, tangent, right });
    }

    const banks = [];
    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      const previous = raw[(i - 2 + SAMPLE_COUNT) % SAMPLE_COUNT].tangent;
      const next = raw[(i + 2) % SAMPLE_COUNT].tangent;
      const turn = previous.z * next.x - previous.x * next.z;
      const proximity = 0.5 + 0.5 * previous.dot(next);
      banks.push(-clamp(turn * 4.6, -0.115, 0.115) * proximity);
    }

    for (let pass = 0; pass < 8; pass += 1) {
      const smoothed = [];
      for (let i = 0; i < SAMPLE_COUNT; i += 1) {
        smoothed[i] =
          (banks[(i - 1 + SAMPLE_COUNT) % SAMPLE_COUNT] +
            banks[i] * 2 +
            banks[(i + 1) % SAMPLE_COUNT]) /
          4;
      }
      for (let i = 0; i < SAMPLE_COUNT; i += 1) {
        banks[i] = smoothed[i];
      }
    }

    let cumulativeLength = 0;
    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      const sample = raw[i];
      const bank = banks[i];
      const rightBanked = sample.right.clone().multiplyScalar(Math.cos(bank))
        .addScaledVector(UP, Math.sin(bank))
        .normalize();
      const upBanked = UP.clone().multiplyScalar(Math.cos(bank))
        .addScaledVector(sample.right, -Math.sin(bank))
        .normalize();
      if (i > 0) {
        cumulativeLength += sample.center.distanceTo(raw[i - 1].center);
      }
      this.samples.push({
        ...sample,
        index: i,
        bank,
        rightBanked,
        upBanked,
        distance: cumulativeLength
      });
    }
  }

  _buildRoad() {
    const asphaltMap = createAsphaltTexture();
    asphaltMap.repeat.set(1, 1);
    const asphalt = new THREE.MeshStandardMaterial({
      color: 0xa5afb9,
      map: asphaltMap,
      roughness: 0.74,
      metalness: 0.08
    });
    const road = new THREE.Mesh(
      buildRibbon(this.samples, -this.halfWidth, this.halfWidth, 0.02),
      asphalt
    );
    road.receiveShadow = true;
    this.group.add(road);

    const curbMap = createCurbTexture();
    const curbMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: curbMap,
      roughness: 0.6,
      metalness: 0.04,
      emissive: 0x1a050b,
      emissiveIntensity: 0.05
    });
    const leftCurb = new THREE.Mesh(
      buildRibbon(this.samples, -this.halfWidth - 1.15, -this.halfWidth, 0.08, 1, 1),
      curbMaterial
    );
    const rightCurb = new THREE.Mesh(
      buildRibbon(this.samples, this.halfWidth, this.halfWidth + 1.15, 0.08, 1, 1),
      curbMaterial
    );
    leftCurb.receiveShadow = true;
    rightCurb.receiveShadow = true;
    this.group.add(leftCurb, rightCurb);

    const runOffMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c232b,
      roughness: 0.95,
      metalness: 0.05
    });
    for (const side of [-1, 1]) {
      const outer = side * (this.halfWidth + 1.15);
      const inner = side * (this.halfWidth + 3.9);
      const strip = new THREE.Mesh(
        buildRibbon(
          this.samples,
          Math.min(outer, inner),
          Math.max(outer, inner),
          0.035
        ),
        runOffMaterial
      );
      strip.receiveShadow = true;
      this.group.add(strip);
    }

    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xd9fbff, toneMapped: false });
    const lineGeometry = new THREE.BoxGeometry(0.24, 0.04, 1);
    const tickCount = 190;
    const lines = new THREE.InstancedMesh(lineGeometry, lineMaterial, tickCount * 2);
    const dummy = new THREE.Object3D();
    let instance = 0;
    for (let i = 0; i < tickCount; i += 1) {
      const index = Math.floor((i / tickCount) * SAMPLE_COUNT);
      const sample = this.samples[index];
      for (const side of [-1, 1]) {
        dummy.position.copy(sample.center)
          .addScaledVector(sample.rightBanked, side * (this.halfWidth - 0.34))
          .addScaledVector(sample.upBanked, 0.055);
        dummy.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(
            sample.rightBanked,
            sample.upBanked,
            sample.tangent
          )
        );
        dummy.scale.set(1, 1, 3.5);
        dummy.updateMatrix();
        lines.setMatrixAt(instance, dummy.matrix);
        instance += 1;
      }
    }
    this.group.add(lines);

    const laneMaterial = new THREE.MeshBasicMaterial({
      color: 0xc6edf3,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      toneMapped: false
    });
    const dashCount = 170;
    const dashes = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 0.025, 4.5),
      laneMaterial,
      dashCount * 2
    );
    let dashIndex = 0;
    for (let i = 0; i < dashCount; i += 1) {
      const sample = this.samples[Math.floor((i / dashCount) * SAMPLE_COUNT)];
      for (const lateral of [-3.25, 3.25]) {
        dummy.position.copy(sample.center)
          .addScaledVector(sample.rightBanked, lateral)
          .addScaledVector(sample.upBanked, 0.048);
        dummy.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(
            sample.rightBanked,
            sample.upBanked,
            sample.tangent
          )
        );
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        dashes.setMatrixAt(dashIndex, dummy.matrix);
        dashIndex += 1;
      }
    }
    dashes.renderOrder = 1;
    this.group.add(dashes);

    const neonPalette = [
      { color: 0x26eaff, lateral: -this.halfWidth - 0.86 },
      { color: 0xff3d72, lateral: this.halfWidth + 0.86 }
    ];
    for (const edge of neonPalette) {
      const edgePoints = [];
      for (let i = 0; i < SAMPLE_COUNT; i += 2) {
        const sample = this.samples[i];
        edgePoints.push(
          sample.center.clone()
            .addScaledVector(sample.rightBanked, edge.lateral)
            .addScaledVector(sample.upBanked, 0.15)
        );
      }
      const edgeCurve = new THREE.CatmullRomCurve3(edgePoints, true);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(edgeCurve, 500, 0.075, 4, true),
        new THREE.MeshBasicMaterial({ color: edge.color, toneMapped: false })
      );
      this.group.add(tube);
    }
  }

  _buildRoadside() {
    const sidewalkMap = createSidewalkTexture();
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x636c74,
      map: sidewalkMap,
      roughness: 0.92,
      metalness: 0.02
    });
    for (const side of [-1, 1]) {
      const inner = side * (this.halfWidth + 1.15);
      const outer = side * (this.halfWidth + 4.1);
      const sidewalk = new THREE.Mesh(
        buildRibbon(
          this.samples,
          Math.min(inner, outer),
          Math.max(inner, outer),
          0.09,
          1,
          0.55
        ),
        sidewalkMaterial
      );
      sidewalk.receiveShadow = true;
      this.group.add(sidewalk);

      const wall = new THREE.Mesh(
        buildVerticalRibbon(
          this.samples,
          side * (this.halfWidth + 3.25),
          0.62,
          0.12,
          side
        ),
        new THREE.MeshStandardMaterial({
          color: 0x242d36,
          roughness: 0.65,
          metalness: 0.28
        })
      );
      wall.receiveShadow = true;
      this.group.add(wall);
    }

    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0xb4e8f5,
      roughness: 0.28,
      metalness: 0.8,
      emissive: 0x0e5166,
      emissiveIntensity: 0.45
    });
    for (const side of [-1, 1]) {
      const railPoints = [];
      for (let i = 0; i < SAMPLE_COUNT; i += 4) {
        const sample = this.samples[i];
        railPoints.push(
          sample.center.clone()
            .addScaledVector(sample.rightBanked, side * (this.halfWidth + 3.3))
            .addScaledVector(UP, 0.88)
        );
      }
      const railCurve = new THREE.CatmullRomCurve3(railPoints, true);
      const rail = new THREE.Mesh(
        new THREE.TubeGeometry(railCurve, 380, 0.11, 5, true),
        railMaterial
      );
      this.group.add(rail);
    }

    const postCount = 230;
    const postGeometry = new THREE.BoxGeometry(0.16, 0.88, 0.16);
    const posts = new THREE.InstancedMesh(postGeometry, railMaterial, postCount * 2);
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let i = 0; i < postCount; i += 1) {
      const sample = this.samples[Math.floor((i / postCount) * SAMPLE_COUNT)];
      for (const side of [-1, 1]) {
        dummy.position.copy(sample.center)
          .addScaledVector(sample.rightBanked, side * (this.halfWidth + 3.3))
          .addScaledVector(UP, 0.52);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        posts.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
    this.group.add(posts);

    const supportMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a222b,
      roughness: 0.8,
      metalness: 0.18
    });
    const supportCount = 42;
    const supportGeometry = new THREE.BoxGeometry(1.6, 1, 1.6);
    const supports = new THREE.InstancedMesh(supportGeometry, supportMaterial, supportCount);
    for (let i = 0; i < supportCount; i += 1) {
      const sample = this.samples[Math.floor((i / supportCount) * SAMPLE_COUNT)];
      const groundY = -2.6;
      const height = Math.max(1.2, sample.center.y - groundY);
      dummy.position.copy(sample.center).addScaledVector(UP, -height * 0.5 - 0.6);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      supports.setMatrixAt(i, dummy.matrix);
    }
    supports.receiveShadow = true;
    this.group.add(supports);
  }

  _buildStartLine() {
    const sample = this.samples[3];
    const texture = createCheckerTexture();
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0.06,
      emissive: 0x111111,
      emissiveIntensity: 0.12
    });
    const geometry = new THREE.PlaneGeometry(this.width - 0.4, 2.7);
    const line = new THREE.Mesh(geometry, material);
    line.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(line);
    setObjectTransform(holder, sample, 0, 0.065);
    this.group.add(holder);
  }

  _buildGridMarks() {
    const material = new THREE.MeshBasicMaterial({
      color: 0xc7f8ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    for (let i = 0; i < START_GRID.length; i += 1) {
      const slot = START_GRID[i];
      const sample = this.samples[Math.floor(slot.t * SAMPLE_COUNT)];
      const geometry = new THREE.PlaneGeometry(2.6, 0.12);
      const mark = new THREE.Mesh(geometry, material);
      mark.rotation.x = -Math.PI / 2;
      const holder = new THREE.Group();
      holder.add(mark);
      setObjectTransform(holder, sample, slot.lateral, 0.075);
      this.group.add(holder);
    }
  }

  _buildBoostPads() {
    const texture = createBoostTexture();
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });

    for (const padDef of BOOST_PAD_DEFS) {
      const sample = this.samples[Math.floor(padDef.t * SAMPLE_COUNT)];
      const holder = new THREE.Group();
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(padDef.width, 7.2), material);
      pad.rotation.x = -Math.PI / 2;
      holder.add(pad);
      setObjectTransform(holder, sample, padDef.lateral, 0.08);
      this.group.add(holder);
      this.boostPads.push({
        ...padDef,
        index: sample.index,
        position: holder.position.clone(),
        direction: sample.tangent.clone(),
        mesh: holder
      });
    }
  }

  _buildStartGantry() {
    const sample = this.samples[4];
    const group = new THREE.Group();
    setObjectTransform(group, sample, 0, 0);

    const metal = new THREE.MeshStandardMaterial({
      color: 0x121d28,
      roughness: 0.34,
      metalness: 0.88
    });
    const neonCyan = new THREE.MeshBasicMaterial({ color: 0x24e8ff, toneMapped: false });
    const neonPink = new THREE.MeshBasicMaterial({ color: 0xff3d72, toneMapped: false });

    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 9.2, 1.15), metal);
      pillar.position.set(side * (this.halfWidth + 4.5), 4.6, 0);
      pillar.castShadow = true;
      group.add(pillar);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 7.2, 1.19), side > 0 ? neonPink : neonCyan);
      strip.position.set(side * (this.halfWidth + 4.5) + side * -0.59, 4.65, 0);
      group.add(strip);
    }

    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(this.halfWidth * 2 + 10.2, 2.2, 1.15),
      metal
    );
    beam.position.y = 8.45;
    beam.castShadow = true;
    group.add(beam);

    const signTexture = createStartSignTexture();
    const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false });
    for (const side of [-1, 1]) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(17.8, 4.45), signMaterial);
      sign.position.set(0, 8.6, side * 0.59);
      if (side < 0) {
        sign.rotation.y = Math.PI;
      }
      group.add(sign);
    }

    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0x111820,
      emissive: 0x200a0a,
      emissiveIntensity: 0.4,
      roughness: 0.25
    });
    for (let i = 0; i < 5; i += 1) {
      const light = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16), lightMaterial.clone());
      light.rotation.x = Math.PI / 2;
      light.position.set(-2.8 + i * 1.4, 6.55, 0.65);
      group.add(light);
      this.startLights.push(light);
    }

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 4), metal);
    antenna.position.set(0, 10.55, 0);
    group.add(antenna);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff315f, toneMapped: false })
    );
    beacon.position.set(0, 11.7, 0);
    group.add(beacon);

    this.group.add(group);
    this.startGantry = group;
  }

  _buildTunnel() {
    const start = 0.343;
    const end = 0.398;
    const count = 22;
    const radius = 12.2;
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x122432,
      roughness: 0.3,
      metalness: 0.82,
      emissive: 0x05364b,
      emissiveIntensity: 0.48
    });
    const neonMaterial = new THREE.MeshBasicMaterial({ color: 0x1ae8ff, toneMapped: false });

    for (let i = 0; i < count; i += 1) {
      const t = THREE.MathUtils.lerp(start, end, i / (count - 1));
      const sample = this.samples[Math.floor(t * SAMPLE_COUNT)];
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.2, 5, 30, Math.PI),
        frameMaterial
      );
      setObjectTransform(arch, sample, 0, 0.3);
      this.group.add(arch);

      if (i % 2 === 0) {
        const lightStrip = new THREE.Mesh(
          new THREE.TorusGeometry(radius - 0.18, 0.035, 4, 28, Math.PI),
          neonMaterial
        );
        setObjectTransform(lightStrip, sample, 0, 0.31);
        this.group.add(lightStrip);
      }
    }

    const positions = [];
    const uvs = [];
    const indices = [];
    const segments = 22;
    const arcSegments = 18;
    const sampleStart = Math.floor(start * SAMPLE_COUNT);
    const sampleEnd = Math.floor(end * SAMPLE_COUNT);
    const sampleSpan = sampleEnd - sampleStart;
    let vertex = 0;
    for (let s = 0; s <= segments; s += 1) {
      const sample = this.samples[sampleStart + Math.floor((s / segments) * sampleSpan)];
      for (let a = 0; a <= arcSegments; a += 1) {
        const angle = (a / arcSegments) * Math.PI;
        const point = sample.center.clone()
          .addScaledVector(sample.rightBanked, Math.cos(angle) * radius)
          .addScaledVector(sample.upBanked, Math.sin(angle) * radius + 0.32);
        positions.push(point.x, point.y, point.z);
        uvs.push(a / arcSegments, s / segments);
      }
    }
    for (let s = 0; s < segments; s += 1) {
      for (let a = 0; a < arcSegments; a += 1) {
        const base = s * (arcSegments + 1) + a;
        indices.push(base, base + arcSegments + 1, base + 1, base + 1, base + arcSegments + 1, base + arcSegments + 2);
        vertex += 1;
      }
    }
    const shellGeometry = new THREE.BufferGeometry();
    shellGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    shellGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    shellGeometry.setIndex(indices);
    shellGeometry.computeVertexNormals();
    const shell = new THREE.Mesh(shellGeometry, new THREE.MeshStandardMaterial({
      color: 0x0b1b2a,
      emissive: 0x072536,
      emissiveIntensity: 0.38,
      roughness: 0.22,
      metalness: 0.55,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    this.group.add(shell);

    for (let i = 0; i < 4; i += 1) {
      const t = THREE.MathUtils.lerp(start + 0.005, end - 0.005, i / 3);
      const sample = this.samples[Math.floor(t * SAMPLE_COUNT)];
      const light = new THREE.PointLight(0x4de9ff, 28, 38, 2);
      light.position.copy(sample.center).addScaledVector(UP, 8.5);
      this.group.add(light);
    }
  }

  _buildOverheadBanners() {
    const banners = [
      { t: 0.548, text: 'DRIFT', accent: '#ff3d72', color: 0xff3d72 },
      { t: 0.742, text: 'NITRO', accent: '#1ae8ff', color: 0x1ae8ff }
    ];
    for (const banner of banners) {
      const sample = this.samples[Math.floor(banner.t * SAMPLE_COUNT)];
      const group = new THREE.Group();
      setObjectTransform(group, sample, 0, 0);
      const metal = new THREE.MeshStandardMaterial({
        color: 0x17222c,
        roughness: 0.36,
        metalness: 0.78
      });
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.38, 8.2, 0.38), metal);
        pole.position.set(side * (this.halfWidth + 2.8), 4.1, 0);
        group.add(pole);
      }
      const signTexture = createBannerTexture(banner.text, banner.accent);
      const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(12.3, 4.1), signMaterial);
      sign.position.set(0, 6.3, 0);
      group.add(sign);
      const back = sign.clone();
      back.rotation.y = Math.PI;
      back.position.z = -0.02;
      group.add(back);

      const neon = new THREE.Mesh(
        new THREE.BoxGeometry(12.4, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: banner.color, toneMapped: false })
      );
      neon.position.set(0, 4.23, 0.08);
      group.add(neon);
      this.group.add(group);
    }
  }

  getPoseAt(t, lateral = 0) {
    const wrappedT = ((t % 1) + 1) % 1;
    const floatIndex = wrappedT * SAMPLE_COUNT;
    const index = Math.floor(floatIndex) % SAMPLE_COUNT;
    const nextIndex = (index + 1) % SAMPLE_COUNT;
    const alpha = floatIndex - Math.floor(floatIndex);
    const a = this.samples[index];
    const b = this.samples[nextIndex];
    const center = a.center.clone().lerp(b.center, alpha);
    const tangent = a.tangent.clone().lerp(b.tangent, alpha).normalize();
    const rightBanked = a.rightBanked.clone().lerp(b.rightBanked, alpha).normalize();
    const upBanked = a.upBanked.clone().lerp(b.upBanked, alpha).normalize();
    const position = center
      .addScaledVector(rightBanked, lateral)
      .addScaledVector(upBanked, 0.05);
    return {
      t: wrappedT,
      index,
      center,
      position,
      tangent,
      right: rightBanked,
      up: upBanked,
      bank: THREE.MathUtils.lerp(a.bank, b.bank, alpha)
    };
  }

  getStartSlot(index) {
    return this.getPoseAt(START_GRID[index].t, START_GRID[index].lateral);
  }

  nearest(position, hintIndex = 0, window = 32) {
    let bestIndex = hintIndex;
    let bestDistance = Infinity;
    for (let offset = -window; offset <= window; offset += 1) {
      const index = (hintIndex + offset + SAMPLE_COUNT) % SAMPLE_COUNT;
      const sample = this.samples[index];
      const dx = position.x - sample.center.x;
      const dz = position.z - sample.center.z;
      const distance = dx * dx + dz * dz;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    const sample = this.samples[bestIndex];
    const next = this.samples[(bestIndex + 1) % SAMPLE_COUNT];
    const relative = position.clone().sub(sample.center);
    const projection = clamp(relative.dot(sample.tangent), 0, sample.center.distanceTo(next.center));
    const segmentLength = sample.center.distanceTo(next.center) || 1;
    const alpha = projection / segmentLength;
    const t = (bestIndex + alpha) / SAMPLE_COUNT;
    const lateral = relative.dot(sample.rightBanked);
    const roadCenterY = sample.center.y + lateral * sample.rightBanked.y;
    return {
      index: bestIndex,
      t: ((t % 1) + 1) % 1,
      lateral,
      distance: Math.sqrt(bestDistance),
      y: roadCenterY,
      sample
    };
  }

  nearestGlobal(position) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < SAMPLE_COUNT; i += 3) {
      const sample = this.samples[i];
      const dx = position.x - sample.center.x;
      const dz = position.z - sample.center.z;
      const distance = dx * dx + dz * dz;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    return this.nearest(position, bestIndex, 8);
  }

  isBoostPad(index, lateral) {
    for (const pad of this.boostPads) {
      let indexDelta = Math.abs(index - pad.index);
      indexDelta = Math.min(indexDelta, SAMPLE_COUNT - indexDelta);
      if (indexDelta < 15 && Math.abs(lateral - pad.lateral) < pad.width * 0.5) {
        return pad;
      }
    }
    return null;
  }

  setStartLights(activeCount) {
    this.startLights.forEach((light, index) => {
      const active = index < activeCount;
      light.material.color.set(active ? 0xff334f : 0x111820);
      light.material.emissive.set(active ? 0xff203f : 0x200a0a);
      light.material.emissiveIntensity = active ? 2.8 : 0.35;
    });
  }

  distanceSqToTrack(position) {
    let best = Infinity;
    for (let i = 0; i < SAMPLE_COUNT; i += 6) {
      const sample = this.samples[i];
      const dx = position.x - sample.center.x;
      const dz = position.z - sample.center.z;
      best = Math.min(best, dx * dx + dz * dz);
    }
    return best;
  }
}
