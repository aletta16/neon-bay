// Neon Bay — main bootstrap. One job: wire every system together, run the
// game loop, drive the third-person camera, and own the menu state machine.
import * as THREE from 'three';
import { CITY, MISSIONS, PLAYER, STORY_INTRO } from './config.js';
import { buildWorld } from './world.js';
import { Traffic, makeVehicle } from './vehicles.js';
import { Pedestrians } from './pedestrians.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { Player } from './player.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') || 1) || 1;
const SHOT = params.get('shot');

// --- renderer / scene --------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- systems -----------------------------------------------------------------
const world = buildWorld(scene, SEED);
const audio = new AudioEngine();
const input = new Input();
const traffic = new Traffic(scene, SEED, world.colliders);
const peds = new Pedestrians(scene, SEED);
const police = new Police(scene, SEED, audio);
const combat = new Combat(scene, SEED, audio);
const missions = new Missions(scene, audio);
const player = new Player(scene);
const hud = new Hud(world.buildings);

// Parked cars the player can steal (in addition to traffic).
const parked = [];
function addParked(type, color, x, z, heading) {
  const v = makeVehicle(type, color, x, z, heading);
  scene.add(v.mesh);
  parked.push(v);
  return v;
}
addParked('sports', 0xe63946, 20, 46, Math.PI / 2);
addParked('sedan', 0x3fa7d6, -46, -20, 0);
addParked('van', 0x2ec4b6, 86, 20, -Math.PI / 2);
addParked('taxi', 0xf2c230, -20, -86, Math.PI);
addParked('sedan', 0xd6d6d6, 126, -46, Math.PI / 2);
addParked('truck', 0x4a6b8a, -86, 126, 0);

// --- game state ---------------------------------------------------------------
const G = {
  state: 'menu', // menu | playing | paused | busted | wasted | complete
  money: 0, cameraSnap: false, player, traffic, police, missions, combat, hud,
  cameraYaw: 0, cameraPitch: 0.32,
  mouseDragging: false, lastMouseX: 0, lastMouseY: 0,
  shotMode: SHOT !== null,
  setSunset() {
    scene.background.set(0xff9a56);
    scene.fog.color.set(0xffb27a);
    world.sun.position.set(-180, 45, 40);
    world.sun.intensity = 2.0;
    world.sun.color.set(0xffb36b);
  },
  startGame,
};
window.__NEONBAY__ = G; // playtest hook: state, money, wanted, mission

// Mouse drag orbits the camera; click shoots on foot.
renderer.domElement.addEventListener('mousedown', (e) => {
  G.mouseDragging = true; G.lastMouseX = e.clientX; G.lastMouseY = e.clientY;
});
addEventListener('mouseup', () => { G.mouseDragging = false; });
addEventListener('mousemove', (e) => {
  if (!G.mouseDragging || G.state !== 'playing') return;
  G.cameraYaw -= (e.clientX - G.lastMouseX) * 0.004;
  G.cameraPitch = Math.max(0.08, Math.min(0.9, G.cameraPitch + (e.clientY - G.lastMouseY) * 0.003));
  G.lastMouseX = e.clientX; G.lastMouseY = e.clientY;
});

// --- missions wiring ----------------------------------------------------------
missions.onEvent = (event, data) => {
  if (event === 'missionStart') {
    const m = data;
    hud.setObjective(m.title, m.brief);
    hud.toast(`${m.title} — ${m.giver}: ${m.brief}`, 5000);
    if (m.id === 'heat') police.setWanted(2);
    if (m.id === 'rooftop-pickup') { /* enemies spawn when player arrives */ }
    if (m.id === 'neon-heist') { /* wanted set on bank arrival */ }
  } else if (event === 'step') {
    const s = data;
    hud.toast(s.text, 4000);
    if (s && s.kind === 'combat') {
      missions.beginCombat(s.count);
      combat.spawnEnemy(118, 96); combat.spawnEnemy(104, 84); combat.spawnEnemy(112, 102);
      police.addHeat(10);
    }
  } else if (event === 'missionComplete') {
    G.money += data.reward;
    hud.setMoney(G.money);
    hud.toast(`Misi selesai! +$${data.reward} — ${data.title}`, 5000);
    audio.jingle();
    saveGame(snapshot());
  } else if (event === 'missionFailed') {
    hud.toast(data + ' Misi diulang.', 4000);
    audio.fail();
  } else if (event === 'allComplete') {
    hud.setStats('complete-stats', `Uang: $${Math.floor(G.money)} • Semua 5 misi selesai`);
    hud.showMenu('menu-complete');
    G.state = 'complete';
    saveGame(snapshot());
  } else if (event === 'kill') {
    hud.toast(`Penagih dikalahkan: ${data.kills}/${data.needed}`, 2500);
  }
};

function snapshot() {
  return {
    money: G.money, missionIndex: missions.index, completedAll: missions.completedAll,
    pos: player.pos, heading: player.heading, health: player.health,
  };
}

function startGame(fromSave) {
  audio.init(); audio.resume();
  if (fromSave) {
    const s = loadGame();
    if (s) {
      G.money = s.money; player.health = s.health ?? PLAYER.maxHealth;
      player.pos.set(s.pos[0], 0, s.pos[1]); player.heading = s.heading || 0;
      missions.index = Math.min(s.missionIndex, MISSIONS.length - 1);
      missions.completedAll = !!s.completedAll;
    }
  } else {
    G.money = 0; player.health = PLAYER.maxHealth;
  }
  hud.setMoney(G.money);
  hud.setHealth(player.health, PLAYER.maxHealth);
  hud.showMenu(null);
  G.state = 'playing';
  if (!missions.completedAll) missions.start();
  else hud.setObjective('Neon Bay Bebas', 'Semua misi selesai! Jelajahi kota, kumpulkan uang.');
}

// --- menu buttons ---------------------------------------------------------------
hud.el['btn-start'].addEventListener('click', () => { clearSave(); startGame(false); });
hud.el['btn-continue'].addEventListener('click', () => startGame(true));
hud.el['btn-resume'].addEventListener('click', () => { hud.showMenu(null); G.state = 'playing'; });
hud.el['btn-restart'].addEventListener('click', () => { hud.showMenu(null); G.state = 'playing'; missions.restart(); });
hud.el['btn-quit'].addEventListener('click', () => { saveGame(snapshot()); location.reload(); });
hud.el['btn-busted'].addEventListener('click', () => {
  police.clearWanted(); G.money = Math.max(0, G.money - 200);
  player.health = PLAYER.maxHealth; hud.setMoney(G.money);
  player.pos.set(0, 0, 40); player.heading = 0;
  hud.showMenu(null); G.state = 'playing'; missions.restart();
});
hud.el['btn-wasted'].addEventListener('click', () => {
  player.health = PLAYER.maxHealth; police.clearWanted();
  player.pos.set(0, 0, 40); player.heading = 0;
  hud.showMenu(null); G.state = 'playing'; missions.restart();
});
hud.el['btn-complete'].addEventListener('click', () => { hud.showMenu(null); G.state = 'playing'; });

hud.setStory(STORY_INTRO);
hud.el['btn-continue'].style.display = loadGame() ? 'inline-block' : 'none';
hud.setMoney(0);
hud.setHealth(PLAYER.maxHealth, PLAYER.maxHealth);
hud.setWanted(0);

// --- camera ---------------------------------------------------------------------
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  const focus = player.inCar ? player.inCar.pos : player.pos;
  const yaw = player.inCar ? player.inCar.heading + Math.PI : G.cameraYaw;
  // Camera sits behind the focus point; on foot it follows the drag yaw.
  const dist = player.inCar ? 11 : 8;
  const height = player.inCar ? 4.5 : 3.4;
  const bx = focus.x - Math.sin(yaw) * dist;
  const bz = focus.z - Math.cos(yaw) * dist;
  const desired = new THREE.Vector3(bx, height, bz);
  if (G.cameraSnap) { camera.position.copy(desired); G.cameraSnap = false; }
  else camera.position.lerp(desired, Math.min(1, dt * 6));
  camTarget.lerp(new THREE.Vector3(focus.x, 1.6, focus.z), Math.min(1, dt * 10));
  camera.lookAt(camTarget);
}

// --- shooting (on foot, mouse click) --------------------------------------------
function tryShoot() {
  if (player.inCar || G.state !== 'playing') return;
  // Aim ray from camera through the mouse point into the world.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(
    (input.mouseX / innerWidth) * 2 - 1, -(input.mouseY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const target = ray.ray.at(45, new THREE.Vector3());
  const from = player.pos.clone(); from.y = 1.4;
  const killed = combat.shoot(from, target, camera);
  if (killed) {
    missions.onKill();
    peds.scare(player.pos.x, player.pos.z, 25);
    police.addHeat(8);
  } else {
    peds.scare(player.pos.x, player.pos.z, 20);
    police.addHeat(3);
  }
}

// --- main loop --------------------------------------------------------------------
const clock = new THREE.Clock();
let saveTimer = 0;
let lastShotClick = false;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  if (G.state === 'playing') {
    // Pause
    if (input.pressed('Escape')) { G.state = 'paused'; hud.showMenu('menu-pause');
      hud.setStats('pause-stats', `Uang: $${Math.floor(G.money)} • Misi: ${missions.current() ? missions.current().title : '—'} • Wanted: ${'★'.repeat(police.wanted) || '—'}`);
    }
    // Enter / exit car
    if (input.pressed('KeyE')) {
      if (player.inCar) {
        player.exitCar();
        hud.setHint('WASD jalan • Shift lari • E masuk mobil • Klik tembak • Esc jeda');
      } else {
        const near = traffic.nearestCar(player.pos, 4.5) ||
          parked.reduce((best, v) => {
            const d = Math.hypot(v.pos.x - player.pos.x, v.pos.z - player.pos.z);
            return d < 4.5 && (!best || d < best.d) ? { v, d } : best;
          }, null)?.v;
        if (near) {
          const wasTraffic = traffic.cars.includes(near);
          if (wasTraffic) { traffic.removeCar(near); police.addHeat(15); hud.toast('Mobil dicuri! Pemiliknya menelepon polisi…', 3000); }
          player.enterCar(near);
          if (!parked.includes(near) && !wasTraffic) { /* already handled */ }
          hud.setHint('W/S gas & rem • A/D belok • E turun • Esc jeda');
          audio.pickup();
          if (missions.currentStep() && missions.currentStep().kind === 'stealCar') { /* advance via update */ }
        }
      }
    }
    // Punch / shoot on foot
    if (input.mouseDown && !lastShotClick) tryShoot();
    lastShotClick = input.mouseDown;

    // Movement
    if (player.inCar) {
      const speed = player.updateDriving(dt, input, world.colliders, (s) => {
        audio.crash(); police.addHeat(4); peds.scare(player.pos.x, player.pos.z, 12);
      });
      audio.setEngine(Math.abs(speed) / 40, true);
      // Running over a pedestrian is a crime.
      for (const p of peds.peds) {
        if (Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z) < 1.6 && Math.abs(speed) > 4) {
          p.pos.x += 8; p.pos.z += 8; police.addHeat(20); audio.crash();
        }
      }
    } else {
      player.updateOnFoot(dt, input, world.colliders, G.cameraYaw);
      audio.setEngine(0, false);
    }

    // Systems
    traffic.update(dt, player.inCar, player.pos);
    peds.update(dt);
    const busted = police.update(dt, player.pos, player.speed, !!player.inCar);
    combat.update(dt, player.pos, (dmg) => {
      player.health -= dmg;
      hud.setHealth(player.health, PLAYER.maxHealth);
      if (player.health <= 0) {
        G.state = 'wasted';
        hud.setStats('wasted-stats', `Uang: $${Math.floor(G.money)} • Misi: ${missions.current() ? missions.current().title : '—'}`);
        hud.showMenu('menu-wasted');
        audio.fail();
      }
    });
    if (busted) {
      G.state = 'busted';
      hud.setStats('busted-stats', `Ditangkap NBPD — denda $200 • Uang: $${Math.floor(G.money)}`);
      hud.showMenu('menu-busted');
      audio.fail();
    }

    // Mission progress
    missions.update(dt, { pos: player.pos, inCar: !!player.inCar, wanted: police.wanted });
    // Bank arrival in the heist triggers wanted 3.
    const ms = missions.currentStep();
    if (missions.current() && missions.current().id === 'neon-heist' && ms && ms.kind === 'goto' &&
        Math.hypot(player.pos.x + 30, player.pos.z + 30) < 19 && police.wanted < 3) {
      police.setWanted(3);
      hud.toast('Alarm bank berbunyi! NBPD mengejarmu — kabur ke selatan!', 4000);
    }

    // HUD
    const m = missions.current();
    hud.setObjective(m && !missions.completedAll ? m.title : 'Neon Bay Bebas',
      missions.objectiveText(),
      m && m.timeLimit && missions.active ? `⏱ ${Math.ceil(missions.timer)} dtk` : '');
    hud.setMoney(G.money);
    hud.setHealth(player.health, PLAYER.maxHealth);
    hud.setWanted(police.wanted);
    hud.setSpeed(player.inCar ? Math.abs(player.inCar.speed) * 3.6 : 0, !!player.inCar);
    hud.setCrosshair(!player.inCar);
    hud.setBustedMeter(police.bustedMeter);
    const markerStep = missions.currentStep();
    hud.drawMinimap(player.pos, player.heading, traffic.cars.concat(parked), peds.peds,
      police.cars, combat.enemies, markerStep && markerStep.pos ? markerStep.pos : null);

    // Autosave every 20 s
    saveTimer += dt;
    if (saveTimer > 20) { saveTimer = 0; saveGame(snapshot()); }

    audio.update(dt);
    updateCamera(dt);
  } else if (G.state === 'menu') {
    // Slow orbit around downtown behind the title screen.
    const t = performance.now() / 1000;
    camera.position.set(Math.sin(t * 0.05) * 90, 45, Math.cos(t * 0.05) * 90);
    camera.lookAt(0, 10, 0);
  }
  renderer.render(scene, camera);
}

// Screenshot staging: start directly into a composed scene.
if (SHOT) {
  const n = Number(SHOT);
  if (n >= 1 && n <= 4) applyShot(G, n);
  else if (SHOT === 'start') { /* leave menu up */ }
  else if (SHOT === 'play') applyShot(G, 1);
  else if (SHOT === 'end') { G.setSunset(); applyShot(G, 4); }
}
animate();
