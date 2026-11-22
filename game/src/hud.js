// HUD + minimap. One job: every DOM overlay (money, health, wanted stars,
// objective, speed, toasts, menus) and the 2D canvas minimap.
import { CITY } from './config.js';

export class Hud {
  constructor(buildings) {
    this.buildings = buildings;
    this.el = {};
    const ids = ['money', 'health-fill', 'health-num', 'stars', 'objective', 'objective-title',
      'speed', 'speed-box', 'toast', 'crosshair', 'hint', 'timer', 'busted-meter',
      'menu-start', 'menu-pause', 'menu-busted', 'menu-wasted', 'menu-complete',
      'btn-start', 'btn-continue', 'btn-resume', 'btn-restart', 'btn-quit',
      'btn-busted', 'btn-wasted', 'btn-complete', 'start-story', 'pause-stats',
      'complete-stats', 'busted-stats', 'wasted-stats'];
    for (const id of ids) this.el[id] = document.getElementById(id);
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.toastTimer = null;
  }
  setMoney(n) { this.el.money.textContent = '$' + Math.floor(n).toLocaleString('en-US'); }
  setHealth(h, max) {
    const pct = Math.max(0, Math.min(100, (h / max) * 100));
    this.el['health-fill'].style.width = pct + '%';
    this.el['health-num'].textContent = Math.ceil(h);
    this.el['health-fill'].style.background = pct > 50 ? '#2ec4b6' : pct > 25 ? '#f2c230' : '#e63946';
  }
  setWanted(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    this.el.stars.textContent = s;
    this.el.stars.style.color = n > 0 ? '#ffd400' : 'rgba(255,255,255,0.35)';
  }
  setObjective(title, text, timerText = '') {
    this.el['objective-title'].textContent = title;
    this.el.objective.textContent = text;
    this.el.timer.textContent = timerText;
  }
  setSpeed(kmh, inCar) {
    this.el['speed-box'].style.display = inCar ? 'block' : 'none';
    this.el.speed.textContent = Math.round(kmh);
  }
  setHint(text) { this.el.hint.textContent = text; }
  setCrosshair(on) { this.el.crosshair.style.display = on ? 'block' : 'none'; }
  setBustedMeter(v) {
    this.el['busted-meter'].style.display = v > 0.02 ? 'block' : 'none';
    this.el['busted-meter'].querySelector('div div').style.width = Math.round(v * 100) + '%';
  }
  toast(text, ms = 3500) {
    this.el.toast.textContent = text;
    this.el.toast.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.el.toast.style.opacity = '0'; }, ms);
  }
  showMenu(name) {
    for (const m of ['menu-start', 'menu-pause', 'menu-busted', 'menu-wasted', 'menu-complete']) {
      this.el[m].classList.toggle('hidden', m !== name);
    }
    if (!name) for (const m of ['menu-start', 'menu-pause', 'menu-busted', 'menu-wasted', 'menu-complete']) this.el[m].classList.add('hidden');
  }
  setStory(text) { this.el['start-story'].textContent = text; }
  setStats(id, text) { this.el[id].textContent = text; }

  // --- minimap ---------------------------------------------------------------
  drawMinimap(playerPos, playerHeading, cars, peds, policeCars, enemies, markerPos, northUp = true) {
    const ctx = this.mapCtx, S = 180, half = CITY.half + 40;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(10,20,28,0.85)';
    ctx.fillRect(0, 0, S, S);
    const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
    // ocean + sand
    ctx.fillStyle = '#1e7fa8'; ctx.fillRect(0, 0, ((CITY.oceanX + 70 + half) / (half * 2)) * S, S);
    ctx.fillStyle = '#e8d29a';
    const [sx] = toMap(CITY.beachX, 0); ctx.fillRect(sx - 8, 0, 16, S);
    // roads
    ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 5;
    for (let c = -160; c <= 160; c += 40) {
      const [x1] = toMap(c, -half); const [, z1] = toMap(0, c);
      ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, z1); ctx.lineTo(S, z1); ctx.stroke();
    }
    // buildings
    ctx.fillStyle = '#8a94a3';
    for (const b of this.buildings) {
      const [x, z] = toMap(b.x, b.z);
      ctx.fillRect(x - (b.w / (half * 2)) * S / 2, z - (b.d / (half * 2)) * S / 2,
        (b.w / (half * 2)) * S, (b.d / (half * 2)) * S);
    }
    const dot = (x, z, color, r) => {
      const [mx, mz] = toMap(x, z);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(mx, mz, r, 0, Math.PI * 2); ctx.fill();
    };
    // mission marker
    if (markerPos) {
      const [mx, mz] = toMap(markerPos[0], markerPos[1]);
      ctx.fillStyle = '#ffd400';
      ctx.beginPath(); ctx.arc(mx, mz, 6 + Math.sin(performance.now() / 200) * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, mz, 10, 0, Math.PI * 2); ctx.stroke();
    }
    for (const e of enemies) dot(e.pos.x, e.pos.z, '#ff2222', 3.5);
    for (const c of policeCars) dot(c.pos.x, c.pos.z, '#2244ff', 3.5);
    for (const c of cars) dot(c.pos.x, c.pos.z, '#ffffff', 2.5);
    for (const p of peds) dot(p.pos.x, p.pos.z, '#bbbbbb', 1.8);
    // player arrow
    const [px, pz] = toMap(playerPos.x, playerPos.z);
    ctx.save();
    ctx.translate(px, pz); ctx.rotate(playerHeading);
    ctx.fillStyle = '#2ec4b6';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
}
