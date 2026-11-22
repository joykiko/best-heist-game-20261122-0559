// The Gilded Frame — shared tuning, palette and helpers.
// One job: every number and colour the rest of the game agrees on.

export const VIEW = { w: 1280, h: 720, hud: 64, floorTop: 72, floorBottom: 712 };

export const PALETTE = {
  floorA: '#3a2a1c', floorB: '#33241a', parquet: '#4a3524',
  carpet: '#7a1f2b', carpetEdge: '#c9a227', carpetInner: '#8e2432',
  wall: '#241a30', wallTrim: '#c9a227', wallFace: '#2e2138',
  marble: '#9db3a8', marbleDark: '#5f7a6e', velvet: '#5b1a24',
  gold: '#e8b64c', goldDim: '#a87f2e', lootGlow: '#ffd76a',
  coneCalm: 'rgba(232,182,76,0.20)', coneHot: 'rgba(255,64,48,0.30)',
  coneSusp: 'rgba(255,170,40,0.26)', camCone: 'rgba(90,200,255,0.16)',
  laser: '#ff2d55', shadow: 'rgba(8,6,14,0.55)',
  ink: '#f4ead2', inkDim: '#b8a888', danger: '#ff5040', safe: '#7ddc8a',
};

export const TUNING = {
  playerWalk: 165, playerRun: 255, playerSneak: 95,
  guardWalk: 78, guardChase: 178, guardSearch: 105,
  guardRange: 265, guardFov: 1.22, // ~70 degrees
  camRange: 250, camFov: 0.62,
  detectFill: 1.0, detectDecay: 0.45, // per second, scaled by distance
  alarmChase: 11, alarmCamera: 7, alarmLaser: 16, alarmEmp: 8,
  alarmDecay: 2.2, lockdownAt: 100, lockdownRelease: 68,
  empSeconds: 6, coinCount: 3, empCount: 2, coinRadius: 190,
  catchDistance: 24, laserCooldown: 2.0,
};

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function fmtMoney(n) { return '$' + n.toLocaleString('en-US'); }

// Segment (ax,ay)-(bx,by) vs axis-aligned rect: true when the segment touches it.
export function segmentHitsRect(ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay;
  let t0 = 0, t1 = 1;
  const slabs = [
    [-dx, ax - r.x], [dx, r.x + r.w - ax],
    [-dy, ay - r.y], [dy, r.y + r.h - ay],
  ];
  for (const [p, q] of slabs) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
