// Mission + story state machine. One job: track the current mission and
// step, place the glowing objective marker, and pay out rewards.
import * as THREE from 'three';
import { MISSIONS } from './config.js';

export class Missions {
  constructor(scene, audio) {
    this.scene = scene; this.audio = audio;
    this.index = 0;          // mission in MISSIONS
    this.step = 0;
    this.active = false;
    this.completedAll = false;
    this.timer = 0;          // mission time limit countdown
    this.killsNeeded = 0;
    this.kills = 0;
    this.marker = null;
    this.beacon = null;
    this.onEvent = null;     // (event, data) — main.js wires side effects
    this.buildMarker();
  }
  buildMarker() {
    const geo = new THREE.CylinderGeometry(3.2, 3.2, 0.4, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.55 });
    this.marker = new THREE.Mesh(geo, mat);
    this.marker.visible = false;
    this.scene.add(this.marker);
    const beamGeo = new THREE.CylinderGeometry(0.9, 1.6, 60, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    this.beacon = new THREE.Mesh(beamGeo, beamMat);
    this.beacon.visible = false;
    this.scene.add(this.beacon);
  }
  current() { return MISSIONS[this.index] || null; }
  currentStep() { const m = this.current(); return m ? m.steps[this.step] : null; }
  start() {
    this.active = true;
    this.step = 0;
    const m = this.current();
    if (m && m.timeLimit) this.timer = m.timeLimit;
    this.emit('missionStart', m);
    this.refreshMarker();
  }
  emit(event, data) { if (this.onEvent) this.onEvent(event, data); }
  refreshMarker() {
    const s = this.currentStep();
    if (!s || !s.pos) { this.marker.visible = false; this.beacon.visible = false; return; }
    this.marker.position.set(s.pos[0], 0.25, s.pos[1]);
    this.beacon.position.set(s.pos[0], 30, s.pos[1]);
    this.marker.visible = true; this.beacon.visible = true;
  }
  objectiveText() {
    if (this.completedAll) return 'Semua misi selesai! Neon Bay milikmu, Kai. Jelajahi kota, kumpulkan uang.';
    const m = this.current();
    if (!m) return '';
    const s = this.currentStep();
    return s ? s.text : m.brief;
  }
  advance() {
    const m = this.current();
    this.step++;
    this.audio.jingle();
    if (this.step >= m.steps.length) {
      // Mission complete: pay out.
      this.emit('missionComplete', m);
      this.index++;
      this.step = 0;
      if (this.index >= MISSIONS.length) {
        this.completedAll = true; this.active = false;
        this.marker.visible = false; this.beacon.visible = false;
        this.emit('allComplete', null);
        return;
      }
      this.start();
      return;
    }
    this.refreshMarker();
    this.emit('step', this.currentStep());
  }
  // Called every frame with the player's position / state.
  update(dt, ctx) {
    if (!this.active || this.completedAll) return;
    const m = this.current();
    if (m && m.timeLimit) {
      this.timer -= dt;
      if (this.timer <= 0) { this.emit('missionFailed', 'Waktu habis!'); this.restart(); return; }
    }
    // Marker pulse
    if (this.marker.visible) {
      const s = 1 + Math.sin(performance.now() / 300) * 0.12;
      this.marker.scale.set(s, 1, s);
      this.beacon.rotation.y += dt;
    }
    const s = this.currentStep();
    if (!s) return;
    const px = ctx.pos.x, pz = ctx.pos.z;
    if (s.kind === 'goto' || s.kind === 'escape') {
      const d = Math.hypot(px - s.pos[0], pz - s.pos[1]);
      if (d < s.radius) this.advance();
    } else if (s.kind === 'stealCar') {
      if (ctx.inCar) this.advance();
    } else if (s.kind === 'loseCops') {
      if (ctx.wanted === 0) this.advance();
    } else if (s.kind === 'combat') {
      if (this.kills >= this.killsNeeded) this.advance();
    }
  }
  beginCombat(count) { this.killsNeeded = count; this.kills = 0; }
  onKill() { this.kills++; this.emit('kill', { kills: this.kills, needed: this.killsNeeded }); }
  restart() {
    this.step = 0;
    if (this.current() && this.current().timeLimit) this.timer = this.current().timeLimit;
    this.kills = 0;
    this.refreshMarker();
    this.emit('missionRestart', this.current());
  }
}
