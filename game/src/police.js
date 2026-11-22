// Wanted system + NBPD police. One job: track the wanted level, spawn and
// drive police interceptors that chase and ram the player, and handle
// busted / escape.
import * as THREE from 'three';
import { makeVehicle } from './vehicles.js';
import { mulberry32 } from './rng.js';

export class Police {
  constructor(scene, seed, audio) {
    this.scene = scene; this.audio = audio;
    this.rng = mulberry32(seed ^ 0x77aa);
    this.cars = [];
    this.wanted = 0;            // 0..5 stars
    this.heat = 0;              // 0..100, builds on crimes, decays when hidden
    this.escapeTimer = 0;
    this.bustedMeter = 0;       // fills while a cop is touching a slow player
    this.spawnTimer = 0;
    this.flash = 0;
  }
  addHeat(amount) {
    if (this.wanted >= 5) return;
    this.heat = Math.min(100, this.heat + amount);
    const level = this.heat < 25 ? 1 : this.heat < 50 ? 2 : this.heat < 75 ? 3 : this.heat < 95 ? 4 : 5;
    if (level > this.wanted) {
      this.wanted = level;
      this.spawnTimer = 0;
    }
  }
  clearWanted() { this.wanted = 0; this.heat = 0; this.bustedMeter = 0; this.escapeTimer = 0; }
  setWanted(n) { this.wanted = n; this.heat = n * 20; this.spawnTimer = 0; }

  spawnCopNear(x, z) {
    const a = this.rng() * Math.PI * 2;
    const d = 45 + this.rng() * 25;
    const car = makeVehicle('police', 0x101418, x + Math.sin(a) * d, z + Math.cos(a) * d, a);
    car.speed = 18;
    this.scene.add(car.mesh);
    this.cars.push(car);
    return car;
  }
  removeCop(car) {
    this.scene.remove(car.mesh);
    this.cars = this.cars.filter((c) => c !== car);
  }
  update(dt, playerPos, playerSpeed, playerInCar) {
    this.flash += dt;
    const targetCount = this.wanted === 0 ? 0 : Math.min(this.wanted + 1, 6);
    this.spawnTimer -= dt;
    if (this.cars.length < targetCount && this.spawnTimer <= 0) {
      this.spawnCopNear(playerPos.x, playerPos.z);
      this.spawnTimer = 2.5;
    }
    if (this.cars.length > targetCount) this.removeCop(this.cars[0]);
    this.audio.setSiren(this.wanted > 0);

    // Chase steering: steer toward the player, ram on contact.
    let nearest = Infinity;
    for (const car of this.cars) {
      const dx = playerPos.x - car.pos.x, dz = playerPos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      nearest = Math.min(nearest, dist);
      const desired = Math.atan2(dx, dz);
      let diff = desired - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
      const top = 20 + this.wanted * 2.2;
      car.speed += ((dist > 8 ? top : top * 0.6) - car.speed) * Math.min(1, dt * 1.2);
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      car.mesh.rotation.y = car.heading;
      // flashing light bar
      if (car.mesh.userData.lightBar) {
        car.mesh.userData.lightBar.material.color.setHex(
          Math.floor(this.flash * 4) % 2 === 0 ? 0xff2222 : 0x2244ff);
      }
      // Ram: slow the player down on contact.
      if (dist < 3.4) {
        this.bustedMeter += dt * (playerSpeed < 3 ? 0.5 : 0.12);
        if (this.audio) { /* crash thud throttled by meter */ }
      }
    }
    // Escape: no cop within 90m for a while → wanted decays.
    if (this.wanted > 0) {
      if (nearest > 90) {
        this.escapeTimer += dt;
        if (this.escapeTimer > 6) {
          this.wanted--; this.heat = this.wanted * 20;
          this.escapeTimer = 0;
          if (this.wanted === 0) this.clearWanted();
        }
      } else this.escapeTimer = 0;
      // Slow decay of heat when cops are far but not gone.
      if (nearest > 60) this.heat = Math.max(this.wanted * 20 - 10, this.heat - dt * 1.5);
    }
    if (this.bustedMeter > 0 && nearest > 6) this.bustedMeter = Math.max(0, this.bustedMeter - dt * 0.2);
    return this.bustedMeter >= 1;
  }
}
