// Simple third-person combat. One job: enemy thugs, shooting (hitscan with
// a tracer + muzzle flash), and enemy health / death.
import * as THREE from 'three';
import { buildPedMesh } from './pedestrians.js';
import { mulberry32, range } from './rng.js';

export class Combat {
  constructor(scene, seed, audio) {
    this.scene = scene; this.audio = audio;
    this.rng = mulberry32(seed ^ 0x33cc);
    this.enemies = [];
    this.tracers = [];
    this.shootCooldown = 0;
    this.enemyShootTimer = 0;
  }
  spawnEnemy(x, z) {
    const mesh = buildPedMesh(0x8b1e1e, 0x222222, 0xe0ac69);
    mesh.position.set(x, 0, z);
    // red bandana marker
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34),
      new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    band.position.y = 1.82; mesh.add(band);
    this.scene.add(mesh);
    const e = { mesh, pos: mesh.position, health: 100, shootTimer: range(this.rng, 1, 2.5) };
    this.enemies.push(e);
    return e;
  }
  clearEnemies() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
  }
  // Hitscan shot from the player toward a world point. Returns enemy hit or null.
  shoot(from, target, camera) {
    if (this.shootCooldown > 0) return null;
    this.shootCooldown = 0.28;
    this.audio.gunshot();
    // tracer line
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), target.clone()]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe14d }));
    this.scene.add(line);
    this.tracers.push({ line, life: 0.08 });
    // muzzle flash light
    const flash = new THREE.PointLight(0xffcc66, 30, 12);
    flash.position.copy(from); this.scene.add(flash);
    this.tracers.push({ line: flash, life: 0.06, isLight: true });
    // nearest enemy within a cone of the aim ray
    const dir = target.clone().sub(from).normalize();
    let best = null, bestD = Infinity;
    for (const e of this.enemies) {
      const toE = new THREE.Vector3(e.pos.x, 1.2, e.pos.z).sub(from);
      const along = toE.dot(dir);
      if (along < 0 || along > 60) continue;
      const perp = toE.clone().addScaledVector(dir, -along).length();
      if (perp < 1.6 && along < bestD) { bestD = along; best = e; }
    }
    if (best) {
      best.health -= 50;
      if (best.health <= 0) {
        this.scene.remove(best.mesh);
        this.enemies = this.enemies.filter((e) => e !== best);
        this.audio.pickup();
        return best;
      }
    }
    return null;
  }
  update(dt, playerPos, onPlayerHit) {
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    for (const t of this.tracers) t.life -= dt;
    for (const t of this.tracers.filter((t) => t.life <= 0)) {
      this.scene.remove(t.line);
    }
    this.tracers = this.tracers.filter((t) => t.life > 0);
    // Enemies face the player and shoot back (inaccurate, telegraphed).
    for (const e of this.enemies) {
      const dx = playerPos.x - e.pos.x, dz = playerPos.z - e.pos.z;
      const dist = Math.hypot(dx, dz);
      e.mesh.rotation.y = Math.atan2(dx, dz);
      e.shootTimer -= dt;
      if (dist < 45 && e.shootTimer <= 0) {
        e.shootTimer = range(this.rng, 1.6, 2.8);
        this.audio.noise(0.12, 0.25, 800);
        const from = new THREE.Vector3(e.pos.x, 1.4, e.pos.z);
        const to = new THREE.Vector3(playerPos.x, 1.2, playerPos.z);
        const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff5544 }));
        this.scene.add(line);
        this.tracers.push({ line, life: 0.1 });
        if (this.rng() < 0.35) onPlayerHit(12);
      }
    }
  }
}
