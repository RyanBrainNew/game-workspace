import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const WHITE = new THREE.Color(0xffffff);

function makeNumberTexture(number, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 256, 256);
  context.fillStyle = 'rgba(3, 9, 18, 0.92)';
  context.beginPath();
  context.arc(128, 128, 100, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 8;
  context.beginPath();
  context.arc(128, 128, 88, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = color;
  context.font = 'italic 900 124px Arial Black, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(number), 128, 136);
  context.strokeStyle = 'rgba(255,255,255,0.6)';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(128, 128, 72, -2.7, 0.3);
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeUnderglowTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 10, 128, 128, 128);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.35, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function numberColor(color) {
  return `#${color.getHexString()}`;
}

function createWheel(isRear, accentMaterial) {
  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x070b10,
    roughness: 0.63,
    metalness: 0.1
  });
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8d1d8,
    roughness: 0.18,
    metalness: 1
  });
  const accent = accentMaterial.clone();

  const pivot = new THREE.Group();
  const spin = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(isRear ? 0.43 : 0.4, isRear ? 0.43 : 0.4, isRear ? 0.38 : 0.34, 20, 1),
    tireMaterial
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  spin.add(tire);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(isRear ? 0.27 : 0.25, isRear ? 0.27 : 0.25, isRear ? 0.39 : 0.35, 16),
    rimMaterial
  );
  rim.rotation.z = Math.PI / 2;
  spin.add(rim);

  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(isRear ? 0.4 : 0.36, 0.36, 0.045),
      accent
    );
    spoke.rotation.x = (i / 5) * Math.PI * 2;
    spin.add(spoke);
  }

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, isRear ? 0.41 : 0.37, 10),
    new THREE.MeshStandardMaterial({ color: 0x10171e, roughness: 0.3, metalness: 0.8 })
  );
  hub.rotation.z = Math.PI / 2;
  spin.add(hub);

  pivot.add(spin);
  return { pivot, spin };
}

function createBodyGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.86, 0.38);
  shape.lineTo(-1.96, 0.63);
  shape.lineTo(-1.66, 0.82);
  shape.lineTo(-1.15, 0.91);
  shape.lineTo(-0.52, 1.08);
  shape.lineTo(0.22, 1.13);
  shape.lineTo(0.84, 0.82);
  shape.lineTo(1.45, 0.69);
  shape.lineTo(1.92, 0.48);
  shape.lineTo(1.98, 0.27);
  shape.lineTo(1.62, 0.18);
  shape.lineTo(-1.74, 0.18);
  shape.lineTo(-1.92, 0.25);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1.46,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.09,
    bevelSegments: 4,
    curveSegments: 4
  });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(0.73, 0, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function addHoodIntake(group, bodyMaterial, darkMaterial) {
  const intake = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.48), darkMaterial);
  intake.position.set(0, 0.795, 1.32);
  intake.rotation.x = -0.1;
  group.add(intake);
  for (let i = 0; i < 3; i += 1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.035), bodyMaterial);
    slat.position.set(0, 0.82, 1.16 + i * 0.11);
    slat.rotation.x = -0.1;
    group.add(slat);
  }
}

export function createKartModel(options = {}) {
  const bodyColor = new THREE.Color(options.bodyColor ?? 0x16d9ff);
  const accentColor = new THREE.Color(options.accentColor ?? 0xff3d72);
  const scale = options.scale ?? 1;
  const number = options.number ?? '11';
  const isAI = Boolean(options.isAI);
  const group = new THREE.Group();
  group.name = isAI ? 'AIRacerKart' : 'PlayerKart';

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    metalness: 0.45,
    roughness: 0.19,
    clearcoat: 1,
    clearcoatRoughness: 0.12
  });
  const secondaryBodyMaterial = new THREE.MeshPhysicalMaterial({
    color: bodyColor.clone().multiplyScalar(0.48),
    metalness: 0.7,
    roughness: 0.24,
    clearcoat: 0.7
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.8,
    roughness: 0.26,
    metalness: 0.36
  });
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd7e5ea,
    roughness: 0.14,
    metalness: 1
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x070c12,
    roughness: 0.4,
    metalness: 0.55
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x102b37,
    metalness: 0.35,
    roughness: 0.04,
    transmission: 0.48,
    transparent: true,
    opacity: 0.82,
    clearcoat: 1,
    side: THREE.DoubleSide
  });

  const body = new THREE.Mesh(createBodyGeometry(), bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const chassis = new THREE.Mesh(new RoundedBoxGeometry(1.82, 0.27, 3.18, 3, 0.09), secondaryBodyMaterial);
  chassis.position.set(0, 0.22, -0.16);
  chassis.castShadow = true;
  group.add(chassis);

  const frontSplitter = new THREE.Mesh(new RoundedBoxGeometry(2.06, 0.1, 0.56, 2, 0.04), darkMaterial);
  frontSplitter.position.set(0, 0.15, 1.85);
  group.add(frontSplitter);

  const rearDiffuser = new THREE.Mesh(new RoundedBoxGeometry(1.98, 0.17, 0.5, 2, 0.04), darkMaterial);
  rearDiffuser.position.set(0, 0.19, -1.85);
  group.add(rearDiffuser);
  for (let i = -2; i <= 2; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.6), chromeMaterial);
    fin.position.set(i * 0.33, 0.17, -1.87);
    fin.rotation.x = 0.08;
    group.add(fin);
  }

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.74, 24, 14), glassMaterial);
  canopy.scale.set(1.1, 0.63, 1.72);
  canopy.position.set(0, 1.02, -0.03);
  canopy.castShadow = true;
  group.add(canopy);
  const canopyFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.71, 0.035, 5, 24, Math.PI),
    chromeMaterial
  );
  canopyFrame.scale.set(1.13, 0.68, 1);
  canopyFrame.rotation.y = Math.PI / 2;
  canopyFrame.rotation.z = Math.PI / 2;
  canopyFrame.position.set(0, 1.02, -0.03);
  group.add(canopyFrame);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 16, 10),
    new THREE.MeshPhysicalMaterial({
      color: 0xf0f5fa,
      roughness: 0.2,
      metalness: 0.45,
      clearcoat: 1
    })
  );
  helmet.scale.set(1, 1.06, 0.95);
  helmet.position.set(0, 1.18, -0.2);
  group.add(helmet);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.265, 14, 8, 0.45, 1.9, 1.1, 0.75),
    new THREE.MeshPhysicalMaterial({
      color: 0x07151d,
      roughness: 0.05,
      metalness: 0.9,
      clearcoat: 1
    })
  );
  visor.scale.set(1, 1.06, 0.95);
  visor.position.set(0, 1.18, -0.2);
  group.add(visor);

  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(
      new RoundedBoxGeometry(0.38, 0.38, 1.76, 3, 0.1),
      secondaryBodyMaterial
    );
    pod.position.set(side * 0.88, 0.5, -0.2);
    pod.castShadow = true;
    group.add(pod);

    const intake = new THREE.Mesh(
      new RoundedBoxGeometry(0.08, 0.24, 0.45, 2, 0.025),
      darkMaterial
    );
    intake.position.set(side * 1.08, 0.53, -0.58);
    group.add(intake);

    const sideBlade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 2.12), accentMaterial);
    sideBlade.position.set(side * 1.06, 0.31, -0.22);
    group.add(sideBlade);

    const headlight = new THREE.Mesh(
      new RoundedBoxGeometry(0.5, 0.16, 0.08, 2, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xe2fcff, toneMapped: false })
    );
    headlight.position.set(side * 0.58, 0.56, 1.94);
    headlight.rotation.y = side * -0.07;
    group.add(headlight);

    const tail = new THREE.Mesh(
      new RoundedBoxGeometry(0.7, 0.13, 0.06, 2, 0.025),
      new THREE.MeshBasicMaterial({ color: 0xff1e45, toneMapped: false })
    );
    tail.position.set(side * 0.49, 0.72, -1.96);
    group.add(tail);

    const mirror = new THREE.Mesh(
      new RoundedBoxGeometry(0.23, 0.11, 0.33, 2, 0.03),
      bodyMaterial
    );
    mirror.position.set(side * 0.97, 0.92, 0.53);
    mirror.rotation.z = side * -0.12;
    group.add(mirror);

    const numberTexture = makeNumberTexture(number, accentColor);
    const numberPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.68, 0.68),
      new THREE.MeshBasicMaterial({
        map: numberTexture,
        transparent: true,
        depthWrite: false,
        toneMapped: false
      })
    );
    numberPlate.position.set(side * 1.094, 0.6, -0.1);
    numberPlate.rotation.y = side * Math.PI / 2;
    group.add(numberPlate);
  }

  const centerStripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 3.35), accentMaterial);
  centerStripe.position.set(0, 0.985, -0.35);
  group.add(centerStripe);
  addHoodIntake(group, chromeMaterial, darkMaterial);

  const wing = new THREE.Group();
  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 0.44), bodyMaterial);
  wingBlade.position.set(0, 1.22, -1.77);
  wingBlade.rotation.x = -0.09;
  wing.add(wingBlade);
  const wingLip = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.035, 0.08), accentMaterial);
  wingLip.position.set(0, 1.26, -1.96);
  wing.add(wingLip);
  for (const side of [-1, 1]) {
    const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.36, 0.5), chromeMaterial);
    endplate.position.set(side * 1.1, 1.17, -1.78);
    wing.add(endplate);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.52, 0.12), chromeMaterial);
    strut.position.set(side * 0.57, 0.95, -1.72);
    strut.rotation.x = -0.12;
    wing.add(strut);
  }
  group.add(wing);

  const rearLightBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.045, 0.025),
    new THREE.MeshBasicMaterial({ color: 0xff3458, toneMapped: false })
  );
  rearLightBar.position.set(0, 0.65, -1.995);
  group.add(rearLightBar);

  const exhausts = [];
  const boostFlames = [];
  for (const side of [-1, 1]) {
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.32, 10, 1, true),
      chromeMaterial
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(side * 0.54, 0.34, -1.99);
    group.add(exhaust);
    const anchor = new THREE.Object3D();
    anchor.position.set(side * 0.54, 0.34, -2.12);
    group.add(anchor);
    exhausts.push(anchor);

    const flame = new THREE.Group();
    const outerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.95, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x39eaff,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    outerFlame.rotation.x = -Math.PI / 2;
    flame.add(outerFlame);
    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.58, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    innerFlame.rotation.x = -Math.PI / 2;
    innerFlame.position.z = 0.08;
    flame.add(innerFlame);
    flame.position.copy(anchor.position);
    flame.position.z -= 0.38;
    flame.visible = false;
    group.add(flame);
    boostFlames.push(flame);
  }

  const wheels = [];
  const frontWheels = [];
  const rearWheels = [];
  const frontPivots = [];
  for (const front of [true, false]) {
    for (const side of [-1, 1]) {
      const wheel = createWheel(!front, accentMaterial);
      wheel.pivot.position.set(
        side * (front ? 0.92 : 0.96),
        front ? 0.4 : 0.43,
        front ? 1.32 : -1.3
      );
      group.add(wheel.pivot);
      wheels.push(wheel.spin);
      if (front) {
        frontWheels.push(wheel.spin);
        frontPivots.push(wheel.pivot);
      } else {
        rearWheels.push(wheel.spin);
      }
    }
  }

  const underglow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.9, 5.3),
    new THREE.MeshBasicMaterial({
      map: makeUnderglowTexture(numberColor(accentColor)),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    })
  );
  underglow.rotation.x = -Math.PI / 2;
  underglow.position.y = 0.025;
  group.add(underglow);

  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 4.6),
    new THREE.MeshBasicMaterial({
      map: makeUnderglowTexture('rgba(0,0,0,0.7)'),
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      toneMapped: false
    })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.015;
  contact.renderOrder = -1;
  group.add(contact);

  group.scale.setScalar(scale);
  group.userData = {
    wheels,
    frontWheels,
    rearWheels,
    frontPivots,
    boostFlames,
    exhausts,
    underglow,
    bodyMaterial,
    accentMaterial,
    wheelRadius: 0.41,
    dimensions: {
      width: 2.15,
      height: 1.35,
      length: 4.16
    }
  };
  return group;
}
