// The Gilded Frame — the thief, Vesper, and her two gadgets.
// One job: movement, noise and tools. WASD/arrows move, Shift runs (fast and
// loud), C sneaks (slow and quiet). Click throws a coin to distract a guard;
// E (or right-click) fires an EMP that kills cameras and lasers for a while
// at the cost of alarm. Loot is picked up by walking over it.

import { TUNING, clamp, dist } from './config.js';
import { hitsBlock } from './guards.js';

export function makePlayer(x, y) {
  return {
    x, y, r: 13, vx: 0, vy: 0, dir: -Math.PI / 2,
    sneaking: false, running: false, hidden: false,
    coins: TUNING.coinCount, emps: TUNING.empCount, empLeft: 0,
    coinFlight: null, coinFx: [], empFx: 0,
    stepTimer: 0, moving: false, lootValue: 0, lootCount: 0, grandTaken: false,
  };
}

export function updatePlayer(p, dt, keys, blocks, events) {
  let ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  let iy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  p.sneaking = keys.has('KeyC');
  p.running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  p.moving = ix !== 0 || iy !== 0;
  const speed = p.sneaking ? TUNING.playerSneak : p.running ? TUNING.playerRun : TUNING.playerWalk;
  if (p.moving) {
    const len = Math.hypot(ix, iy);
    ix /= len; iy /= len;
    p.dir = Math.atan2(iy, ix);
    const nx = p.x + ix * speed * dt;
    const ny = p.y + iy * speed * dt;
    if (!hitsBlock(nx, p.y, p.r, blocks)) p.x = nx;
    if (!hitsBlock(p.x, ny, p.r, blocks)) p.y = ny;
    p.stepTimer -= dt * (p.running ? 1.7 : 1);
    if (p.stepTimer <= 0) {
      p.stepTimer = p.sneaking ? 0.55 : 0.38;
      events.push({ type: 'step', loud: p.running });
    }
  }
  if (p.empLeft > 0) p.empLeft -= dt;
  if (p.empFx > 0) p.empFx -= dt;
  for (const c of p.coinFx) c.life -= dt;
  p.coinFx = p.coinFx.filter((c) => c.life > 0);
  if (p.coinFlight) {
    const c = p.coinFlight;
    c.t += dt * 2.4;
    c.x = c.x0 + (c.x1 - c.x0) * c.t;
    c.y = c.y0 + (c.y1 - c.y0) * c.t - Math.sin(c.t * Math.PI) * 46;
    if (c.t >= 1) {
      p.coinFx.push({ x: c.x1, y: c.y1, life: 1.6 });
      events.push({ type: 'coinLand', x: c.x1, y: c.y1 });
      p.coinFlight = null;
    }
  }
}

export function throwCoin(p, mx, my) {
  if (p.coins <= 0 || p.coinFlight) return false;
  const d = dist(p.x, p.y, mx, my);
  const reach = Math.min(d, 320);
  const a = Math.atan2(my - p.y, mx - p.x);
  p.coins -= 1;
  p.coinFlight = {
    x0: p.x, y0: p.y, x1: p.x + Math.cos(a) * reach, y1: p.y + Math.sin(a) * reach,
    x: p.x, y: p.y, t: 0,
  };
  return true;
}

export function fireEmp(p) {
  if (p.emps <= 0 || p.empLeft > 0) return false;
  p.emps -= 1;
  p.empLeft = TUNING.empSeconds;
  p.empFx = 0.9;
  return true;
}

// Walk-over pickup. Returns the loot taken, if any.
export function tryPickup(p, loot, events) {
  for (const item of loot) {
    if (item.taken) continue;
    if (dist(p.x, p.y, item.x, item.y) < 30) {
      item.taken = true;
      p.lootValue += item.value;
      p.lootCount += 1;
      if (item.grand) p.grandTaken = true;
      events.push({ type: 'loot', item });
      return item;
    }
  }
  return null;
}

export function resetPlayer(p, x, y) {
  p.x = x; p.y = y; p.dir = -Math.PI / 2;
  p.coinFlight = null; p.coinFx = []; p.empLeft = 0; p.empFx = 0;
}
