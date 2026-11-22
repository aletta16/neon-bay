// Player controller. One job: on-foot movement (WASD + mouse-aim heading)
// and arcade car driving (W/S throttle, A/D steering), plus entering and
// exiting cars with E.
import * as THREE from 'three';
import { PLAYER, CAR } from './config.js';
import { buildPedMesh } from './pedestrians.js';
import { resolveCollisions } from './world.js';

export class Player {
  constructor(scene) {
    this.mesh = buildPedMesh(0x2ec4b6, 0x222831, 0xf1c27d);
    // Kai Vega: teal jacket, dark jeans.
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.heading = 0;
    this.speed = 0;
    this.inCar = null;      // vehicle object or null
    this.health = PLAYER.maxHealth;
    this.walkPhase = 0;
    this.pos.set(0, 0, 40);
  }
  // --- on foot ---------------------------------------------------------------
  updateOnFoot(dt, input, colliders, cameraYaw) {
    const fwd = input.axis('KeyS', 'KeyW');
    const strafe = input.axis('KeyA', 'KeyD');
    const running = input.down('ShiftLeft') || input.down('ShiftRight');
    const max = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
    // Movement is camera-relative.
    const sin = Math.sin(cameraYaw), cos = Math.cos(cameraYaw);
    let mx = sin * fwd + cos * strafe;
    let mz = cos * fwd - sin * strafe;
    const len = Math.hypot(mx, mz);
    if (len > 0.01) {
      mx /= len; mz /= len;
      this.heading = Math.atan2(mx, mz);
      this.speed = max;
      this.pos.x += mx * max * dt;
      this.pos.z += mz * max * dt;
      this.walkPhase += dt * max * 1.6;
      const swing = Math.sin(this.walkPhase) * 0.55;
      this.mesh.userData.legL.rotation.x = swing;
      this.mesh.userData.legR.rotation.x = -swing;
      this.mesh.userData.armL.rotation.x = -swing * 0.7;
      this.mesh.userData.armR.rotation.x = swing * 0.7;
    } else {
      this.speed = 0;
      this.mesh.userData.legL.rotation.x *= 0.8;
      this.mesh.userData.legR.rotation.x *= 0.8;
      this.mesh.userData.armL.rotation.x *= 0.8;
      this.mesh.userData.armR.rotation.x *= 0.8;
    }
    this.mesh.rotation.y = this.heading;
    resolveCollisions(this.pos, PLAYER.radius, colliders);
  }
  // --- driving ---------------------------------------------------------------
  updateDriving(dt, input, colliders, onCrash) {
    const car = this.inCar;
    const throttle = input.axis('KeyS', 'KeyW');
    const steer = input.axis('KeyA', 'KeyD');
    const def = car.def;
    const maxSpeed = CAR.maxSpeed * def.speed;
    if (throttle > 0) car.speed += CAR.accel * def.accel * dt;
    else if (throttle < 0) {
      if (car.speed > 0.5) car.speed -= CAR.brake * dt;
      else car.speed -= CAR.reverseAccel * dt;
    } else {
      car.speed -= Math.sign(car.speed) * CAR.drag * 8 * dt;
      if (Math.abs(car.speed) < 0.3) car.speed = 0;
    }
    car.speed = Math.max(-CAR.maxReverse, Math.min(maxSpeed, car.speed));
    // Steering scales with speed, reverses when reversing.
    const steerAmount = steer * CAR.turnRate * dt * Math.min(1, Math.abs(car.speed) / 8) * Math.sign(car.speed || 1);
    car.heading += steerAmount;
    const nx = car.pos.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.pos.z + Math.cos(car.heading) * car.speed * dt;
    const before = { x: car.pos.x, z: car.pos.z };
    car.pos.x = nx; car.pos.z = nz;
    // Building collision: if pushed back hard, it was a crash.
    const px = car.pos.x, pz = car.pos.z;
    resolveCollisions(car.pos, 1.6, colliders);
    const pushed = Math.hypot(car.pos.x - px, car.pos.z - pz);
    if (pushed > 0.05 && Math.abs(car.speed) > 6) {
      car.speed *= -0.25;
      if (onCrash) onCrash(Math.abs(car.speed));
    }
    car.mesh.rotation.y = car.heading;
    this.pos.copy(car.pos);
    this.heading = car.heading;
    this.speed = Math.abs(car.speed);
    return car.speed;
  }
  enterCar(car) {
    this.inCar = car;
    car.speed = 0;
    this.mesh.visible = false;
  }
  exitCar() {
    if (!this.inCar) return null;
    const car = this.inCar;
    this.inCar = null;
    const side = Math.cos(car.heading) > 0 ? 1 : -1;
    this.pos.set(car.pos.x + Math.cos(car.heading) * 2.2 * side, 0, car.pos.z - Math.sin(car.heading) * 2.2 * side);
    this.heading = car.heading;
    this.mesh.visible = true;
    this.mesh.rotation.y = this.heading;
    return car;
  }
}
