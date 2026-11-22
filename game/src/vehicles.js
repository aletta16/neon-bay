// Vehicle factory + traffic system. One job: build car meshes and drive
// the ambient traffic along the road grid.
import * as THREE from 'three';
import { CAR, VEHICLE_TYPES, CITY } from './config.js';
import { mulberry32, pick, range } from './rng.js';
import { roadCenters, resolveCollisions } from './world.js';

export function buildCarMesh(type, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x18242f });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const isTruck = type === 'truck';
  const len = type === 'sports' ? 4.4 : isTruck ? 5.6 : 4.2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, len), bodyMat);
  body.position.y = 0.62; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, isTruck ? 1.4 : 2.1), glassMat);
  cabin.position.set(0, 1.3, isTruck ? 1.2 : -0.2); cabin.castShadow = true; g.add(cabin);
  if (isTruck) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 2.6),
      new THREE.MeshLambertMaterial({ color: 0x5a5a5a }));
    bed.position.set(0, 1.0, -1.3); g.add(bed);
  }
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  for (const [x, z] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.38, z); g.add(w);
  }
  // headlights + taillights
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const x of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), hl);
    h.position.set(x, 0.65, len / 2 + 0.02); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tl);
    t.position.set(x, 0.65, -len / 2 - 0.02); g.add(t);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffe14d }));
    sign.position.set(0, 1.75, -0.2); g.add(sign);
  }
  if (type === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar.position.set(0, 1.72, -0.2); g.add(bar);
    g.userData.lightBar = bar;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 3.6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.y = 0.85; g.add(stripe);
  }
  g.userData.length = len;
  return g;
}

export function makeVehicle(type, color, x, z, heading) {
  const def = VEHICLE_TYPES[type];
  const mesh = buildCarMesh(type, color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  return {
    type, def, mesh, color,
    pos: mesh.position, heading,
    speed: 0, steer: 0,
    // traffic AI fields
    ai: null, stopped: false,
  };
}

// --- traffic ----------------------------------------------------------------
export class Traffic {
  constructor(scene, seed, colliders) {
    this.scene = scene; this.colliders = colliders;
    this.rng = mulberry32(seed ^ 0x9e3779b9);
    this.cars = [];
    const types = ['sedan', 'sedan', 'taxi', 'sports', 'truck', 'van'];
    for (let i = 0; i < 16; i++) this.spawn(pick(this.rng, types), true);
  }
  spawn(type, anywhere = false) {
    const lines = roadCenters();
    const road = pick(this.rng, lines);
    const along = range(this.rng, -180, 180);
    const horizontal = this.rng() < 0.5;
    const dir = this.rng() < 0.5 ? 1 : -1;
    const lane = 3;
    const x = horizontal ? along : road + (dir > 0 ? lane : -lane);
    const z = horizontal ? road + (dir > 0 ? -lane : lane) : along;
    const heading = horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const v = makeVehicle(type, pick(this.rng, VEHICLE_TYPES[type].colors), x, z, heading);
    v.ai = { horizontal, dir, speed: range(this.rng, 7, 12), road };
    v.speed = v.ai.speed;
    this.scene.add(v.mesh);
    this.cars.push(v);
    return v;
  }
  // Car ahead on the same lane within dist?
  carAhead(v, dist) {
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    for (const o of this.cars) {
      if (o === v) continue;
      const dx = o.pos.x - v.pos.x, dz = o.pos.z - v.pos.z;
      const along = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      if (along > 0 && along < dist && side < 2.5) return true;
    }
    return false;
  }
  update(dt, playerCar, playerPos) {
    const lines = roadCenters();
    for (const v of this.cars) {
      if (v === playerCar) continue; // driven by the player, not traffic AI
      const ai = v.ai;
      // stop for the car ahead (traffic or player)
      let blocked = this.carAhead(v, 9);
      if (playerCar && playerCar !== v) {
        const dx = playerCar.pos.x - v.pos.x, dz = playerCar.pos.z - v.pos.z;
        const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
        const along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
        if (along > 0 && along < 10 && side < 3) blocked = true;
      }
      const target = blocked ? 0 : ai.speed;
      v.speed += (target - v.speed) * Math.min(1, dt * 2);
      v.pos.x += Math.sin(v.heading) * v.speed * dt;
      v.pos.z += Math.cos(v.heading) * v.speed * dt;
      // At an intersection, sometimes turn onto the crossing road.
      const onLine = (val) => lines.some((c) => Math.abs(val - c) < 1.2);
      const cross = ai.horizontal ? v.pos.x : v.pos.z;
      const alongCoord = ai.horizontal ? v.pos.z : v.pos.x;
      if (onLine(cross) && this.rng() < dt * 0.35) {
        const turnLeft = this.rng() < 0.5;
        const newDir = turnLeft ? -ai.dir : ai.dir;
        const newRoad = Math.round(alongCoord / CITY.roadSpacing) * CITY.roadSpacing;
        if (ai.horizontal) {
          v.pos.z = newRoad + (newDir > 0 ? 3 : -3);
          v.heading = newDir > 0 ? 0 : Math.PI;
          v.ai = { horizontal: false, dir: newDir, speed: ai.speed, road: newRoad };
        } else {
          v.pos.x = newRoad + (newDir > 0 ? -3 : 3);
          v.heading = newDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          v.ai = { horizontal: true, dir: newDir, speed: ai.speed, road: newRoad };
        }
      }
      // Wrap around the city edge instead of despawning.
      if (v.pos.x > 195) v.pos.x = -195; if (v.pos.x < -195) v.pos.x = 195;
      if (v.pos.z > 195) v.pos.z = -195; if (v.pos.z < -195) v.pos.z = 195;
      v.mesh.rotation.y = v.heading;
    }
  }
  nearestCar(pos, maxDist) {
    let best = null, bestD = maxDist;
    for (const v of this.cars) {
      const d = Math.hypot(v.pos.x - pos.x, v.pos.z - pos.z);
      if (d < bestD) { bestD = d; best = v; }
    }
    return best;
  }
  removeCar(v) {
    this.scene.remove(v.mesh);
    this.cars = this.cars.filter((c) => c !== v);
  }
}
