// Neon Bay city builder. One job: build the 3D city (ground, beach, ocean,
// roads, buildings, palms, lamps, props, sky) and expose collision boxes.
import * as THREE from 'three';
import { CITY } from './config.js';
import { mulberry32, pick, range, rangeInt } from './rng.js';

export function roadCenters() {
  const lines = [];
  for (let c = -160; c <= 160; c += CITY.roadSpacing) lines.push(c);
  return lines;
}
export function isOnRoad(x, z) {
  const lines = roadCenters();
  const near = (v) => lines.some((c) => Math.abs(v - c) < CITY.roadWidth / 2 + 1);
  return near(x) || near(z);
}

function windowTexture(rng, base) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 8; y < 120; y += 16) for (let x = 8; x < 56; x += 14) {
    g.fillStyle = rng() < 0.35 ? '#ffe9a3' : '#1d2f45';
    g.fillRect(x, y, 9, 10);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene, seed) {
  const rng = mulberry32(seed);
  const colliders = [];   // {minX,maxX,minZ,maxZ}
  const buildings = [];   // {x,z,w,d,h,color} for minimap
  const group = new THREE.Group();
  scene.add(group);

  // --- sky, sun, fog -------------------------------------------------------
  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(0x9fc8e8, 220, 620);
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.6);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 600;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd9ff, 0.85));
  const hemi = new THREE.HemisphereLight(0xbfdcff, 0x3a5f4a, 0.5);
  scene.add(hemi);

  // --- ground: grass/concrete base ----------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x5d8a5a }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(-40, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // --- ocean + sand (west) -------------------------------------------------
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 560),
    new THREE.MeshLambertMaterial({ color: 0x1e7fa8 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(-300, 0.05, 0);
  ocean.receiveShadow = true;
  group.add(ocean);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 560),
    new THREE.MeshLambertMaterial({ color: 0xe8d29a }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(-209, 0.04, 0);
  sand.receiveShadow = true;
  group.add(sand);
  // Boardwalk strip along the beach
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.3, 560),
    new THREE.MeshLambertMaterial({ color: 0x9a7b52 }));
  boardwalk.position.set(-182, 0.15, 0); boardwalk.receiveShadow = true;
  group.add(boardwalk);

  // --- roads ----------------------------------------------------------------
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2c230 });
  for (const c of roadCenters()) {
    for (const [w, d, x, z] of [[CITY.roadWidth, 420, c, 0], [420, CITY.roadWidth, 0, c]]) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      r.rotation.x = -Math.PI / 2; r.position.set(x, 0.02, z);
      r.receiveShadow = true; group.add(r);
    }
    // dashed centre line
    for (let t = -200; t < 200; t += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), lineMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(c, 0.03, t);
      group.add(dash);
      const dash2 = dash.clone(); dash2.position.set(t, 0.03, c); dash2.rotation.z = Math.PI / 2;
      group.add(dash2);
    }
  }

  // --- buildings ------------------------------------------------------------
  const palette = ['#e8e0d0', '#d6a05a', '#7fb3d5', '#e07a5f', '#b5c4b1', '#c9a7c7', '#f2e394', '#8fa8bf'];
  const lines = roadCenters();
  for (let bx = -160; bx <= 120; bx += CITY.roadSpacing) {
    for (let bz = -160; bz <= 160; bz += CITY.roadSpacing) {
      if (rng() < 0.12) continue; // plaza / park gap
      const cx = bx + CITY.roadSpacing / 2, cz = bz + CITY.roadSpacing / 2;
      const w = range(rng, 16, 24), d = range(rng, 16, 24);
      const h = rng() < 0.18 ? range(rng, 40, 70) : range(rng, 10, 30); // towers + low-rise
      const color = pick(rng, palette);
      const tex = windowTexture(rng, color);
      const mat = new THREE.MeshLambertMaterial({ map: tex });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(cx, h / 2, cz);
      b.castShadow = true; b.receiveShadow = true;
      group.add(b);
      // rooftop rim
      const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6),
        new THREE.MeshLambertMaterial({ color: 0x444444 }));
      rim.position.set(cx, h + 0.4, cz); group.add(rim);
      colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
      buildings.push({ x: cx, z: cz, w, d, h, color });
      // rooftop sign on some towers
      if (h > 40 && rng() < 0.5) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(10, 2.4, 0.6),
          new THREE.MeshBasicMaterial({ color: pick(rng, [0xff2e88, 0x00e5ff, 0xffd400]) }));
        sign.position.set(cx, h + 2, cz - d / 2 - 0.4); group.add(sign);
      }
    }
  }

  // --- landmark buildings (named, for missions) ----------------------------
  const landmarks = [
    { name: 'Bank Merdeka', x: -30, z: -30, w: 30, d: 24, h: 26, color: '#e8e0d0' },
    { name: 'Bengkel Mara', x: 150, z: -130, w: 26, d: 20, h: 12, color: '#e07a5f' },
    { name: 'Pondok Pasir', x: -185, z: 150, w: 14, d: 12, h: 8, color: '#f2e394' },
    { name: 'Hideout Selatan', x: 30, z: 170, w: 20, d: 16, h: 10, color: '#7fb3d5' },
  ];
  for (const L of landmarks) {
    const tex = windowTexture(rng, L.color);
    const m = new THREE.Mesh(new THREE.BoxGeometry(L.w, L.h, L.d),
      new THREE.MeshLambertMaterial({ map: tex }));
    m.position.set(L.x, L.h / 2, L.z); m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    colliders.push({ minX: L.x - L.w / 2, maxX: L.x + L.w / 2, minZ: L.z - L.d / 2, maxZ: L.z + L.d / 2 });
    buildings.push({ x: L.x, z: L.z, w: L.w, d: L.d, h: L.h, color: L.color, landmark: L.name });
  }

  // --- palms along beach + parks --------------------------------------------
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
  const palms = [];
  for (let z = -190; z <= 190; z += 14) {
    if (rng() < 0.25) continue;
    palms.push([-192 + range(rng, -4, 4), z]);
    if (rng() < 0.4) palms.push([-172 + range(rng, -3, 3), z + 6]);
  }
  for (const [x, z] of palms) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 6), trunkMat);
    trunk.position.set(x, 3, z); trunk.castShadow = true; group.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.4, 7), leafMat);
    crown.position.set(x, 7, z); crown.castShadow = true; group.add(crown);
    colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
  }

  // --- street lamps -----------------------------------------------------------
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const c of lines) for (let t = -160; t <= 160; t += 80) {
    for (const [x, z] of [[c + 7, t], [t, c + 7]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), lampMat);
      pole.position.set(x, 2.5, z); group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bulbMat);
      bulb.position.set(x, 5.1, z); group.add(bulb);
    }
  }

  // --- plaza park with fountain (city centre) --------------------------------
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 0.6, 24),
    new THREE.MeshLambertMaterial({ color: 0x9fb8c8 }));
  plaza.position.set(20, 0.3, 20); plaza.receiveShadow = true; group.add(plaza);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.4, 24),
    new THREE.MeshLambertMaterial({ color: 0x2e9fc4 }));
  water.position.set(20, 0.7, 20); group.add(water);

  return { group, colliders, buildings, sun, landmarks };
}

// Push a circle (x,z,r) out of every AABB collider it overlaps.
export function resolveCollisions(pos, radius, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius; pos.z = nz + (dz / d) * radius;
      } else {
        // centre inside box: push out along the smallest penetration axis
        const pl = pos.x - c.minX, pr = c.maxX - pos.x, pt = pos.z - c.minZ, pb = c.maxZ - pos.z;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) pos.x = c.minX - radius; else if (m === pr) pos.x = c.maxX + radius;
        else if (m === pt) pos.z = c.minZ - radius; else pos.z = c.maxZ + radius;
      }
    }
  }
  // World bounds
  pos.x = Math.max(-228, Math.min(196, pos.x));
  pos.z = Math.max(-196, Math.min(196, pos.z));
}
