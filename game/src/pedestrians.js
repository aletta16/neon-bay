// Pedestrians. One job: sidewalk walkers who stroll, wait at corners and
// scatter (flee) when a car or a gunshot comes near.
import * as THREE from 'three';
import { mulberry32, pick, range } from './rng.js';
import { roadCenters } from './world.js';

const SHIRTS = [0xe63946, 0x2a9d8f, 0xf4a261, 0x8338ec, 0xffd166, 0x06d6a0, 0xef476f, 0x118ab2];
const PANTS = [0x222222, 0x3a4a6b, 0x6b4a3a, 0x2f4f2f];

export function buildPedMesh(shirt, pants, skin) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.18), pantsMat);
  legL.position.set(-0.12, 0.4, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.12; g.add(legR);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.3), shirtMat);
  torso.position.y = 1.12; torso.castShadow = true; g.add(torso);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), shirtMat);
  armL.position.set(-0.36, 1.1, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.36; g.add(armR);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), skinMat);
  head.position.y = 1.65; head.castShadow = true; g.add(head);
  g.userData.legL = legL; g.userData.legR = legR;
  g.userData.armL = armL; g.userData.armR = armR;
  return g;
}

export class Pedestrians {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = mulberry32(seed ^ 0x51ab);
    this.peds = [];
    for (let i = 0; i < 26; i++) this.spawn();
  }
  spawn() {
    const lines = roadCenters();
    const road = pick(this.rng, lines);
    const along = range(this.rng, -180, 180);
    const side = pick(this.rng, [-9, 9]);
    const horizontal = this.rng() < 0.5;
    const x = horizontal ? along : road + side;
    const z = horizontal ? road + side : along;
    const mesh = buildPedMesh(pick(this.rng, SHIRTS), pick(this.rng, PANTS),
      pick(this.rng, [0xf1c27d, 0xe0ac69, 0x8d5524, 0xffdbac]));
    mesh.position.set(x, 0, z);
    const dir = this.rng() < 0.5 ? 1 : -1;
    const heading = horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    mesh.rotation.y = heading;
    this.scene.add(mesh);
    const p = { mesh, pos: mesh.position, heading, speed: range(this.rng, 1, 1.8),
      horizontal, dir, flee: 0, walkPhase: this.rng() * 6 };
    this.peds.push(p);
    return p;
  }
  // Make nearby pedestrians run away from a point (car / gunshot).
  scare(x, z, radius) {
    for (const p of this.peds) {
      const d = Math.hypot(p.pos.x - x, p.pos.z - z);
      if (d < radius) {
        p.flee = 3;
        p.heading = Math.atan2(p.pos.x - x, p.pos.z - z);
      }
    }
  }
  update(dt) {
    for (const p of this.peds) {
      if (p.flee > 0) {
        p.flee -= dt;
        p.speed = 4.5;
      } else p.speed = 1.4;
      p.pos.x += Math.sin(p.heading) * p.speed * dt;
      p.pos.z += Math.cos(p.heading) * p.speed * dt;
      p.walkPhase += dt * p.speed * 4;
      const swing = Math.sin(p.walkPhase) * 0.5;
      p.mesh.userData.legL.rotation.x = swing;
      p.mesh.userData.legR.rotation.x = -swing;
      p.mesh.userData.armL.rotation.x = -swing * 0.7;
      p.mesh.userData.armR.rotation.x = swing * 0.7;
      p.mesh.rotation.y = p.heading;
      // Keep inside the city; turn around at the edge or after fleeing.
      if (p.pos.x > 190 || p.pos.x < -190 || p.pos.z > 190 || p.pos.z < -190) {
        p.heading += Math.PI;
      }
    }
  }
}
