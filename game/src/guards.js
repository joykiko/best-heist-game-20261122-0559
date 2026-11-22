// The Gilded Frame — guards, cameras and lasers.
// One job: the people and devices that can spot the thief. A guard walks a
// patrol, scans at each waypoint, and runs a small state machine:
// patrol -> suspicious (investigate what it saw or heard) -> chase
// (it saw the thief clearly) -> search -> patrol. Cameras sweep and feed the
// alarm; lasers trip it when crossed.

import { TUNING, clamp, dist, angleTo, angleDiff, segmentHitsRect } from './config.js';

export function makeGuard(def, index) {
  const [sx, sy] = def.path[0];
  return {
    name: def.name, path: def.path, x: sx, y: sy, dir: 0,
    wp: 1, wait: 0, state: 'patrol', detect: 0,
    seenX: sx, seenY: sy, loseTimer: 0, searchTimer: 0,
    investigateX: sx, investigateY: sy, index,
    stepPhase: Math.random() * Math.PI * 2, heardX: null, heardY: null,
  };
}

export function makeCamera(def) {
  return { x: def.x, y: def.y, base: def.base, sweep: def.sweep, speed: def.speed, phase: Math.random() * 2, angle: def.base };
}

export function makeLaser(def) {
  return { x1: def.x1, y1: def.y1, x2: def.x2, y2: def.y2, id: def.id, cooldown: 0, tripped: 0 };
}

// True when nothing blocks the straight line between two points.
export function lineOfSight(ax, ay, bx, by, blocks) {
  for (const r of blocks) {
    if (segmentHitsRect(ax, ay, bx, by, r)) return false;
  }
  return true;
}

// True when the target sits inside a watcher's cone and sight line is clear.
export function inCone(wx, wy, wdir, range, fov, tx, ty, blocks) {
  const d = dist(wx, wy, tx, ty);
  if (d > range) return false;
  if (d < 26) return lineOfSight(wx, wy, tx, ty, blocks);
  const a = angleTo(wx, wy, tx, ty);
  if (Math.abs(angleDiff(wdir, a)) > fov) return false;
  return lineOfSight(wx, wy, tx, ty, blocks);
}

function moveToward(g, tx, ty, speed, dt, blocks) {
  const d = dist(g.x, g.y, tx, ty);
  if (d < 2) return;
  const nx = g.x + ((tx - g.x) / d) * speed * dt;
  const ny = g.y + ((ty - g.y) / d) * speed * dt;
  g.dir = angleTo(g.x, g.y, tx, ty);
  if (!hitsBlock(nx, g.y, 13, blocks)) g.x = nx;
  if (!hitsBlock(g.x, ny, 13, blocks)) g.y = ny;
}

export function hitsBlock(x, y, r, blocks) {
  for (const b of blocks) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return x < 26 || x > 1254 || y < 92 || y > 692;
}

export function updateGuard(g, dt, player, blocks, events) {
  const seen = inCone(g.x, g.y, g.dir, TUNING.guardRange, TUNING.guardFov, player.x, player.y, blocks)
    && !player.hidden;
  const d = dist(g.x, g.y, player.x, player.y);
  if (seen) {
    // Close, lit and running fills the meter fast; far, sneaking and dark is slow.
    let rate = TUNING.detectFill * (1.25 - clamp(d / TUNING.guardRange, 0, 1));
    if (player.sneaking) rate *= 0.45;
    if (player.running) rate *= 1.6;
    g.detect = clamp(g.detect + rate * dt, 0, 1);
    g.seenX = player.x; g.seenY = player.y; g.loseTimer = 0;
  } else {
    g.detect = clamp(g.detect - TUNING.detectDecay * dt, 0, 1);
  }

  if (g.heardX !== null) {
    g.investigateX = g.heardX; g.investigateY = g.heardY;
    g.heardX = null; g.heardY = null;
    if (g.state === 'patrol') { g.state = 'suspicious'; g.searchTimer = 0; }
  }

  if (g.detect >= 1 && g.state !== 'chase') {
    g.state = 'chase'; g.loseTimer = 0;
    events.push({ type: 'spotted', guard: g.name });
  }

  switch (g.state) {
    case 'patrol': {
      if (g.detect > 0.55) { g.state = 'suspicious'; g.investigateX = g.seenX; g.investigateY = g.seenY; break; }
      if (g.wait > 0) {
        g.wait -= dt;
        g.dir += Math.sin(performance.now() / 900 + g.index) * 0.35 * dt;
        break;
      }
      const [tx, ty] = g.path[g.wp];
      const dd = dist(g.x, g.y, tx, ty);
      if (dd < 8) {
        g.wp = (g.wp + 1) % g.path.length;
        g.wait = 1.1; // pause and scan at every waypoint
      } else {
        moveToward(g, tx, ty, TUNING.guardWalk, dt, blocks);
      }
      break;
    }
    case 'suspicious': {
      const dd = dist(g.x, g.y, g.investigateX, g.investigateY);
      if (dd > 10) {
        moveToward(g, g.investigateX, g.investigateY, TUNING.guardSearch, dt, blocks);
      } else {
        g.searchTimer += dt;
        g.dir += 1.9 * dt; // look around, then give up
        if (g.searchTimer > 2.6) { g.state = 'patrol'; g.searchTimer = 0; }
      }
      if (g.detect <= 0.05 && g.searchTimer > 2.6) { g.state = 'patrol'; g.searchTimer = 0; }
      break;
    }
    case 'chase': {
      if (seen) { g.loseTimer = 0; } else {
        g.loseTimer += dt;
        if (g.loseTimer > 3.5) { g.state = 'search'; g.searchTimer = 0; g.loseTimer = 0; }
      }
      moveToward(g, player.x, player.y, TUNING.guardChase, dt, blocks);
      if (d < TUNING.catchDistance) events.push({ type: 'caught', guard: g.name });
      break;
    }
    case 'search': {
      g.searchTimer += dt;
      const dd = dist(g.x, g.y, g.seenX, g.seenY);
      if (dd > 12) moveToward(g, g.seenX, g.seenY, TUNING.guardSearch, dt, blocks);
      else g.dir += 2.4 * dt;
      if (g.searchTimer > 4) { g.state = 'patrol'; g.detect = 0; }
      break;
    }
  }
  g.stepPhase += dt * (g.state === 'chase' ? 11 : 6);
}

export function updateCamera(cam, dt, time) {
  cam.angle = cam.base + Math.sin(time * cam.speed + cam.phase) * cam.sweep;
}

// Returns true while the camera can see the player this frame.
export function cameraSees(cam, player, blocks) {
  return !player.hidden && inCone(cam.x, cam.y, cam.angle, TUNING.camRange, TUNING.camFov, player.x, player.y, blocks);
}

// Laser trip: the player's movement segment crossed the beam while it is live.
export function laserCrossed(laser, px, py, ox, oy, empLeft) {
  if (empLeft > 0 || laser.cooldown > 0) return false;
  return segmentsCross(px, py, ox, oy, laser.x1, laser.y1, laser.x2, laser.y2);
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = cross(dx - cx, dy - cy, ax - cx, ay - cy);
  const d2 = cross(dx - cx, dy - cy, bx - cx, by - cy);
  const d3 = cross(bx - ax, by - ay, cx - ax, cy - ay);
  const d4 = cross(bx - ax, by - ay, dx - ax, dy - ay);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
function cross(ax, ay, bx, by) { return ax * by - ay * bx; }
