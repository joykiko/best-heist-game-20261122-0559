// The Gilded Frame — the game loop and state machine.
// One job: wire the pieces together. States: title -> play -> paused /
// caught / win. The alarm rises on chases, cameras and lasers and falls when
// the thief is unseen; at 100 the house locks down until it cools. Rooms
// advance through the east arch; the service door opens only once the grand
// loot is taken. ?shot=title|patrol|chase|win stages a fixed frame for
// screenshots, rendered from this same code.

import { VIEW, TUNING, clamp } from './config.js';
import { ROOMS, blockers } from './levels.js';
import { makeGuard, makeCamera, makeLaser, updateGuard, updateCamera, cameraSees, laserCrossed } from './guards.js';
import { makePlayer, updatePlayer, throwCoin, fireEmp, tryPickup, resetPlayer } from './player.js';
import { makeAudio, ensureAudio, playStep, playCoin, playCoinLand, playLoot, playGrand, playSpotted, playLaser, playEmp, playCaught, playWin, playDoor, setAlarmLevel, toggleMute } from './audio.js';
import { renderWorld, renderHud, renderTitle, renderPaused, renderCaught, renderWin, renderToast } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(location.search);
const shot = params.get('shot');

const audio = makeAudio();
const keys = new Set();

const s = {
  state: 'title', roomIndex: 0, room: ROOMS[0], blocks: [],
  guards: [], cameras: [], lasers: [], player: null,
  alarm: 0, alarmPeak: 0, lockdown: false, elapsed: 0,
  caughtBy: '', toast: '', toastTimer: 0, time: 0,
  grandHint: 'THE GILDED FRAME → the service door.',
};

function loadRoom(index, keepLoot) {
  s.roomIndex = index;
  s.room = ROOMS[index];
  s.blocks = blockers(s.room);
  s.guards = s.room.guards.map((g, i) => makeGuard(g, i));
  s.cameras = s.room.cameras.map(makeCamera);
  s.lasers = s.room.lasers.map(makeLaser);
  for (const item of s.room.loot) item.taken = keepLoot ? item.taken : false;
  if (!s.player) s.player = makePlayer(s.room.playerStart[0], s.room.playerStart[1]);
  else resetPlayer(s.player, s.room.playerStart[0], s.room.playerStart[1]);
  s.toast = s.room.name;
  s.toastTimer = 2.6;
}

function resetRun() {
  for (const r of ROOMS) for (const item of r.loot) item.taken = false;
  s.player = makePlayer(ROOMS[0].playerStart[0], ROOMS[0].playerStart[1]);
  s.alarm = 0; s.alarmPeak = 0; s.lockdown = false; s.elapsed = 0;
  loadRoom(0, false);
  s.state = 'play';
}

function startGame() {
  ensureAudio(audio);
  resetRun();
  setStatus('Playing. Steal the loot and reach the exit.');
}

function setStatus(text) { if (statusEl) statusEl.textContent = text; }

function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'step') playStep(audio, e.loud);
    else if (e.type === 'coinLand') {
      playCoinLand(audio);
      for (const g of s.guards) {
        if (Math.hypot(g.x - e.x, g.y - e.y) < TUNING.coinRadius) {
          g.heardX = e.x; g.heardY = e.y;
        }
      }
    } else if (e.type === 'loot') {
      if (e.item.grand) { playGrand(audio); s.toast = 'THE GILDED FRAME IS YOURS — RUN FOR THE SERVICE DOOR!'; }
      else { playLoot(audio); s.toast = `${e.item.name} lifted!`; }
      s.toastTimer = 2.4;
    } else if (e.type === 'spotted') {
      playSpotted(audio);
      s.toast = `${e.guard} spotted you!`; s.toastTimer = 1.8;
    } else if (e.type === 'caught') {
      s.state = 'caught'; s.caughtBy = e.guard;
      playCaught(audio);
      setStatus(`Caught by ${e.guard}. Press R to retry.`);
    }
  }
}

function update(dt) {
  s.time += dt;
  if (s.state !== 'play') return;
  s.elapsed += dt;
  if (s.toastTimer > 0) s.toastTimer -= dt;

  const p = s.player;
  const oldX = p.x, oldY = p.y;
  const events = [];
  updatePlayer(p, dt, keys, s.blocks, events);

  let chasing = false;
  for (const g of s.guards) {
    updateGuard(g, dt, p, s.blocks, events);
    if (g.state === 'chase') chasing = true;
  }
  for (const cam of s.cameras) updateCamera(cam, dt, s.time);
  for (const l of s.lasers) {
    if (l.cooldown > 0) l.cooldown -= dt;
    if (l.tripped > 0) l.tripped -= dt;
    if (laserCrossed(l, p.x, p.y, oldX, oldY, p.empLeft)) {
      s.alarm = clamp(s.alarm + TUNING.alarmLaser, 0, 100);
      l.cooldown = TUNING.laserCooldown; l.tripped = 1;
      playLaser(audio);
      s.toast = 'Laser tripped!'; s.toastTimer = 1.6;
    }
  }

  // Alarm: chases and camera sight push it up; quiet darkness lets it fall.
  let rise = 0;
  if (chasing) rise += TUNING.alarmChase;
  for (const cam of s.cameras) {
    if (cameraSees(cam, p, s.blocks)) rise += TUNING.alarmCamera;
  }
  if (rise > 0) s.alarm = clamp(s.alarm + rise * dt, 0, 100);
  else s.alarm = clamp(s.alarm - TUNING.alarmDecay * dt, 0, 100);
  s.alarmPeak = Math.max(s.alarmPeak, s.alarm);
  if (!s.lockdown && s.alarm >= TUNING.lockdownAt) {
    s.lockdown = true;
    s.toast = 'LOCKDOWN — the doors seal until the alarm cools!'; s.toastTimer = 3;
  }
  if (s.lockdown && s.alarm <= TUNING.lockdownRelease) s.lockdown = false;
  setAlarmLevel(audio, s.alarm / 100);

  tryPickup(p, s.room.loot, events);
  handleEvents(events);
  if (s.state !== 'play') return; // caught during this frame

  // Room exit: the arch leads on; the service door needs the grand loot.
  const ex = s.room.exit;
  if (p.x + p.r > ex.x && p.y > ex.y && p.y < ex.y + ex.h) {
    if (s.roomIndex < 2) {
      if (!s.lockdown) { playDoor(audio); loadRoom(s.roomIndex + 1, true); }
      else { s.toast = 'Locked down — cool the alarm first!'; s.toastTimer = 1.6; p.x = ex.x - p.r - 2; }
    } else if (p.grandTaken) {
      if (!s.lockdown) {
        s.state = 'win'; playWin(audio);
        setStatus('You escaped with The Gilded Frame. Press R to play again.');
      } else { s.toast = 'Locked down — cool the alarm first!'; s.toastTimer = 1.6; p.x = ex.x - p.r - 2; }
    } else {
      s.toast = 'The service door stays shut without THE GILDED FRAME.'; s.toastTimer = 1.6;
      p.x = ex.x - p.r - 2;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  renderWorld(ctx, s, s.time);
  renderHud(ctx, s);
  if (s.toastTimer > 0) renderToast(ctx, s.toast);
  if (s.state === 'title') renderTitle(ctx, s);
  else if (s.state === 'paused') renderPaused(ctx);
  else if (s.state === 'caught') renderCaught(ctx, s);
  else if (s.state === 'win') renderWin(ctx, s);
}

// ---- Staged screenshots: the same game, a fixed moment in it. ----
function stageShot(name) {
  resetRun();
  if (name === 'title') {
    s.state = 'title';
    s.toastTimer = 0;
    s.player.x = 640; s.player.y = 480; s.player.sneaking = true;
    s.guards[0].x = 430; s.guards[0].y = 300; s.guards[0].dir = 0.6;
    s.guards[1].x = 980; s.guards[1].y = 500; s.guards[1].dir = -2.2;
    return;
  }
  if (name === 'patrol') {
    loadRoom(1, false);
    s.state = 'play';
    s.player.x = 560; s.player.y = 500; s.player.sneaking = true; s.player.dir = 0;
    s.player.lootValue = 4000; s.player.lootCount = 1;
    s.alarm = 18; s.elapsed = 96;
    s.guards[0].x = 300; s.guards[0].y = 480; s.guards[0].dir = 1.2;
    s.guards[1].x = 980; s.guards[1].y = 300; s.guards[1].dir = -0.9;
    s.guards[2].x = 700; s.guards[2].y = 260; s.guards[2].dir = 1.57;
    s.guards[2].detect = 0.4;
    s.room.loot[0].taken = true;
    s.toast = 'ROOM 2 · THE PORTRAIT HALL'; s.toastTimer = 99;
    return;
  }
  if (name === 'chase') {
    loadRoom(2, false);
    s.state = 'play';
    s.player.x = 640; s.player.y = 500; s.player.running = true; s.player.dir = 2.6;
    s.player.lootValue = 24000; s.player.lootCount = 3; s.player.grandTaken = true;
    s.player.coins = 1; s.player.emps = 1;
    s.alarm = 78; s.alarmPeak = 78; s.elapsed = 244;
    s.guards[0].x = 520; s.guards[0].y = 420; s.guards[0].dir = 0.9; s.guards[0].state = 'chase'; s.guards[0].detect = 1;
    s.guards[1].x = 900; s.guards[1].y = 300; s.guards[1].dir = 2.4; s.guards[1].detect = 0.7; s.guards[1].state = 'suspicious';
    s.guards[2].x = 700; s.guards[2].y = 560; s.guards[2].dir = -1.2;
    s.room.loot[0].taken = true; s.room.loot[1].taken = true; s.room.loot[2].taken = true;
    s.toast = 'SPOTTED — RUN FOR THE SERVICE DOOR!'; s.toastTimer = 99;
    return;
  }
  if (name === 'win') {
    loadRoom(2, false);
    s.state = 'win';
    s.toastTimer = 0;
    s.player.x = 1180; s.player.y = 620; s.player.grandTaken = true;
    s.player.lootValue = 73000; s.player.lootCount = 6;
    s.alarm = 34; s.alarmPeak = 61; s.elapsed = 318;
    s.room.loot[0].taken = true; s.room.loot[1].taken = true; s.room.loot[2].taken = true;
    s.guards[0].x = 400; s.guards[0].y = 300; s.guards[0].dir = 0.5;
    s.guards[1].x = 950; s.guards[1].y = 200; s.guards[1].dir = 2.0;
    return;
  }
}

// ---- Input ----
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') { ensureAudio(audio); toggleMute(audio); return; }
  if (e.code === 'KeyR' && s.state !== 'title') { startGame(); return; }
  if (e.code === 'Escape') {
    if (s.state === 'play') { s.state = 'paused'; setStatus('Paused.'); }
    else if (s.state === 'paused') { s.state = 'play'; }
    return;
  }
  if (e.code === 'Enter' && (s.state === 'title' || s.state === 'win' || s.state === 'caught')) { startGame(); return; }
  if (e.code === 'KeyE' && s.state === 'play') {
    if (fireEmp(s.player)) { playEmp(audio); s.alarm = clamp(s.alarm + TUNING.alarmEmp, 0, 100); s.toast = 'EMP burst — cameras and lasers dark!'; s.toastTimer = 1.8; }
    return;
  }
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

canvas.addEventListener('mousedown', (e) => {
  ensureAudio(audio);
  if (s.state === 'title') { startGame(); return; }
  if (s.state !== 'play') return;
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * VIEW.w;
  const my = ((e.clientY - rect.top) / rect.height) * VIEW.h;
  if (e.button === 2) {
    if (fireEmp(s.player)) { playEmp(audio); s.alarm = clamp(s.alarm + TUNING.alarmEmp, 0, 100); }
    return;
  }
  if (throwCoin(s.player, mx, my)) playCoin(audio);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- Boot ----
loadRoom(0, false);
if (shot) {
  stageShot(shot);
  // Freeze the staged frame: draw once (and keep redrawing the same pose).
  draw();
} else {
  let last = performance.now();
  const loop = (now) => {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
