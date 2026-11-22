// The Gilded Frame — everything the eye sees.
// One job: drawing. A night gallery with a parquet floor, a crimson carpet
// runner, gold-framed paintings and marble statues; vision cones raycast
// against the walls so safe cover, danger and loot read at a glance.

import { VIEW, PALETTE as P, TUNING, clamp, fmtMoney } from './config.js';

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

function rayDistance(x, y, dx, dy, range, blocks) {
  let best = range;
  for (const r of blocks) {
    // Slab test for the ray against this rect.
    let t0 = 0, t1 = best, ok = true;
    const invX = dx === 0 ? 1e9 : 1 / dx, invY = dy === 0 ? 1e9 : 1 / dy;
    let ta = (r.x - x) * invX, tb = (r.x + r.w - x) * invX;
    if (ta > tb) [ta, tb] = [tb, ta];
    let tc = (r.y - y) * invY, td = (r.y + r.h - y) * invY;
    if (tc > td) [tc, td] = [td, tc];
    t0 = Math.max(ta, tc); t1 = Math.min(tb, td);
    if (t0 > t1 || t1 < 0) ok = false;
    if (ok && t0 >= 0 && t0 < best) best = t0;
  }
  return best;
}

export function drawCone(ctx, x, y, dir, range, fov, blocks, color) {
  const rays = 26;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= rays; i++) {
    const a = dir - fov + (2 * fov * i) / rays;
    const d = rayDistance(x, y, Math.cos(a), Math.sin(a), range, blocks);
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawFloor(ctx, time) {
  ctx.fillStyle = P.floorA;
  ctx.fillRect(0, VIEW.floorTop, VIEW.w, VIEW.h - VIEW.floorTop - 8);
  // Parquet planks.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let y = VIEW.floorTop + 28; y < VIEW.floorBottom; y += 56) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW.w, y); ctx.stroke();
  }
  for (let x = 0; x < VIEW.w; x += 112) {
    for (let y = VIEW.floorTop; y < VIEW.floorBottom; y += 56) {
      const off = ((y - VIEW.floorTop) / 56) % 2 === 0 ? 0 : 56;
      ctx.beginPath(); ctx.moveTo(x + off, y); ctx.lineTo(x + off, y + 56); ctx.stroke();
    }
  }
  // Crimson carpet runner down the middle of each room.
  ctx.fillStyle = P.carpet;
  ctx.fillRect(0, 330, VIEW.w, 110);
  ctx.fillStyle = P.carpetEdge;
  ctx.fillRect(0, 330, VIEW.w, 5); ctx.fillRect(0, 435, VIEW.w, 5);
  ctx.fillStyle = P.carpetInner;
  for (let x = 40; x < VIEW.w; x += 120) {
    ctx.save(); ctx.translate(x, 385); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-11, -11, 22, 22); ctx.restore();
  }
  // Soft pools of lamplight.
  for (const lx of [200, 640, 1080]) {
    const g = ctx.createRadialGradient(lx, 385, 10, lx, 385, 190);
    g.addColorStop(0, 'rgba(255,214,120,0.10)'); g.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = g; ctx.fillRect(lx - 190, 195, 380, 380);
  }
  void time;
}

function drawPainting(ctx, p) {
  const glow = p.grand ? 0.9 + 0.1 * Math.sin(Date.now() / 300) : 1;
  ctx.save();
  ctx.shadowColor = P.gold; ctx.shadowBlur = p.grand ? 26 * glow : 0;
  ctx.fillStyle = P.goldDim; ctx.fillRect(p.x - 6, p.y - 6, p.w + 12, p.h + 12);
  ctx.fillStyle = P.gold; ctx.fillRect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
  ctx.shadowBlur = 0;
  ctx.fillStyle = `hsl(${p.hue},42%,26%)`;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  // A tiny generative canvas inside the frame: sun, hills, figure.
  const h = hashStr(p.title);
  ctx.fillStyle = `hsl(${(p.hue + 40) % 360},70%,62%)`;
  ctx.beginPath(); ctx.arc(p.x + (h % 60) + 30, p.y + 22, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `hsl(${(p.hue + 160) % 360},45%,38%)`;
  ctx.beginPath(); ctx.moveTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w * 0.4, p.y + p.h * 0.45);
  ctx.lineTo(p.x + p.w * 0.75, p.y + p.h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `hsl(${(p.hue + 200) % 360},50%,55%)`;
  ctx.fillRect(p.x + p.w * 0.62, p.y + p.h * 0.55, 8, p.h * 0.42);
  ctx.fillStyle = 'rgba(244,234,210,0.85)';
  ctx.font = '10px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText(p.title.toUpperCase(), p.x + p.w / 2, p.y + p.h + 16);
  ctx.restore();
}

function drawCover(ctx, c) {
  if (c.kind === 'statue') {
    ctx.fillStyle = '#2c2f36';
    ctx.fillRect(c.x + 8, c.y + c.h - 14, c.w - 16, 14);
    ctx.fillStyle = P.marble;
    ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + c.h / 2 - 4, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.marbleDark;
    ctx.beginPath(); ctx.arc(c.x + c.w / 2 - 8, c.y + c.h / 2 - 10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.inkDim; ctx.font = '10px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h + 12);
  } else {
    ctx.fillStyle = '#1d1420';
    ctx.fillRect(c.x - 2, c.y - 2, c.w + 4, c.h + 4);
    ctx.fillStyle = '#3d2c4e';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = P.goldDim;
    ctx.fillRect(c.x, c.y, c.w, 3);
  }
}

function drawLoot(ctx, item, time) {
  if (item.taken) return;
  const bob = Math.sin(time * 2.4 + item.x) * 3;
  const pulse = 0.7 + 0.3 * Math.sin(time * 3 + item.y);
  const g = ctx.createRadialGradient(item.x, item.y + bob, 2, item.x, item.y + bob, 34);
  g.addColorStop(0, `rgba(255,215,106,${0.5 * pulse})`); g.addColorStop(1, 'rgba(255,215,106,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(item.x, item.y + bob, 34, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(item.x, item.y + bob);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = item.grand ? '#ffe9a8' : P.gold;
  const s = item.grand ? 13 : 9;
  ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.fillStyle = '#fff6d8';
  ctx.fillRect(-s * 0.45, -s * 0.45, s * 0.9, s * 0.9);
  ctx.restore();
  ctx.fillStyle = P.ink; ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText(item.name.toUpperCase(), item.x, item.y + bob + 26);
  ctx.fillStyle = P.gold; ctx.font = '11px Georgia, serif';
  ctx.fillText(fmtMoney(item.value), item.x, item.y + bob + 40);
}

function drawGuard(ctx, g, time) {
  const hot = g.state === 'chase';
  const susp = g.state === 'suspicious' || g.state === 'search';
  const coneColor = hot ? P.coneHot : susp ? P.coneSusp : P.coneCalm;
  return { hot, susp, coneColor };
}

export function renderWorld(ctx, s, time) {
  const room = s.room;
  const blocks = s.blocks;
  drawFloor(ctx, time);
  // Exit door, glowing when it is the way out.
  const ex = room.exit;
  const exitOpen = s.roomIndex < 2 || s.player.grandTaken;
  ctx.fillStyle = exitOpen ? '#3f7a4a' : '#5a2a30';
  ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
  ctx.fillStyle = P.goldDim; ctx.fillRect(ex.x - 4, ex.y, 4, ex.h);
  ctx.fillStyle = P.ink; ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(ex.x + ex.w / 2, ex.y + ex.h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText(exitOpen ? 'EXIT →' : 'LOCKED', 0, 4); ctx.restore();
  ctx.fillStyle = P.inkDim; ctx.font = '10px Georgia, serif';
  ctx.fillText(ex.label, ex.x + ex.w / 2, ex.y + ex.h + 14);

  for (const p of room.paintings) drawPainting(ctx, p);
  // Walls with gold trim.
  for (const w of room.walls) {
    ctx.fillStyle = P.wallFace; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = P.wallTrim; ctx.fillRect(w.x, w.y, w.w, 3); ctx.fillRect(w.x, w.y + w.h - 3, w.w, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(w.x, w.y + w.h - 8, w.w, 8);
  }
  for (const c of room.covers) drawCover(ctx, c);
  for (const item of room.loot) drawLoot(ctx, item, time);

  // Lasers.
  for (const l of s.lasers) {
    const off = s.player.empLeft > 0;
    const alpha = off ? 0.12 : (0.55 + 0.45 * Math.sin(time * 6 + l.x1));
    ctx.strokeStyle = `rgba(255,45,85,${alpha})`;
    ctx.lineWidth = off ? 1 : 3;
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    ctx.fillStyle = P.laser;
    ctx.beginPath(); ctx.arc(l.x1, l.y1, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(l.x2, l.y2, 5, 0, Math.PI * 2); ctx.fill();
    if (l.tripped > 0) {
      ctx.fillStyle = `rgba(255,45,85,${l.tripped})`;
      ctx.font = 'bold 12px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText('TRIPPED!', (l.x1 + l.x2) / 2, (l.y1 + l.y2) / 2 - 12);
    }
  }

  // Camera cones, then guard cones (danger reads first).
  for (const cam of s.cameras) {
    const off = s.player.empLeft > 0;
    drawCone(ctx, cam.x, cam.y, cam.angle, TUNING.camRange, TUNING.camFov, blocks,
      off ? 'rgba(120,120,120,0.08)' : P.camCone);
  }
  for (const g of s.guards) {
    const { coneColor } = drawGuard(ctx, g, time);
    drawCone(ctx, g.x, g.y, g.dir, TUNING.guardRange, TUNING.guardFov, blocks, coneColor);
  }

  // Cameras.
  for (const cam of s.cameras) {
    const off = s.player.empLeft > 0;
    ctx.fillStyle = off ? '#555' : '#dfe9f2';
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = off ? '#333' : '#ff2d55';
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#dfe9f2'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cam.x, cam.y);
    ctx.lineTo(cam.x + Math.cos(cam.angle) * 18, cam.y + Math.sin(cam.angle) * 18); ctx.stroke();
    ctx.fillStyle = P.inkDim; ctx.font = '10px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(off ? 'CAMERA · EMP' : 'CAMERA', cam.x, cam.y + 24);
  }

  // Guards: navy uniforms, gold braid, a sweeping gaze.
  for (const g of s.guards) {
    const bob = Math.sin(g.stepPhase) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y + 13, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g.state === 'chase' ? '#7a1f2b' : '#1f2a4a';
    ctx.beginPath(); ctx.arc(g.x, g.y + bob, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = P.gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y + bob, 14, 0, Math.PI * 2); ctx.stroke();
    // Cap brim + face direction.
    ctx.fillStyle = '#141a2e';
    ctx.beginPath(); ctx.arc(g.x + Math.cos(g.dir) * 5, g.y + bob + Math.sin(g.dir) * 5, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4ead2';
    ctx.beginPath(); ctx.arc(g.x + Math.cos(g.dir) * 9, g.y + bob + Math.sin(g.dir) * 9, 4, 0, Math.PI * 2); ctx.fill();
    // Detection ring + mark.
    if (g.detect > 0.03) {
      ctx.strokeStyle = g.detect > 0.9 ? P.danger : P.gold;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(g.x, g.y + bob, 20, -Math.PI / 2, -Math.PI / 2 + g.detect * Math.PI * 2); ctx.stroke();
    }
    const mark = g.state === 'chase' ? '!' : g.state === 'suspicious' || g.state === 'search' ? '?' : null;
    if (mark) {
      ctx.fillStyle = g.state === 'chase' ? P.danger : P.gold;
      ctx.font = 'bold 26px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(mark, g.x, g.y + bob - 26);
    }
    ctx.fillStyle = P.inkDim; ctx.font = '10px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(g.name.toUpperCase(), g.x, g.y + 32);
  }

  // The thief, Vesper: burgundy mask, dark gala suit, soft shadow.
  const p = s.player;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#221a2e';
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e8b64c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#8e2432';
  ctx.fillRect(p.x - 8, p.y - 4, 16, 7);
  ctx.fillStyle = '#f4ead2';
  ctx.beginPath(); ctx.arc(p.x + Math.cos(p.dir) * 6, p.y + Math.sin(p.dir) * 6, 3.5, 0, Math.PI * 2); ctx.fill();
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(125,220,138,0.7)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  // Coin in flight / landing rings.
  if (p.coinFlight) {
    ctx.fillStyle = P.gold;
    ctx.beginPath(); ctx.arc(p.coinFlight.x, p.coinFlight.y, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const c of p.coinFx) {
    ctx.strokeStyle = `rgba(232,182,76,${clamp(c.life, 0, 1)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c.x, c.y, (1.6 - c.life) * 30 + 8, 0, Math.PI * 2); ctx.stroke();
  }
  if (p.empFx > 0) {
    ctx.strokeStyle = `rgba(90,200,255,${p.empFx})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, (0.9 - p.empFx) * 260 + 20, 0, Math.PI * 2); ctx.stroke();
  }

  // Alarm vignette when the house is hot.
  if (s.alarm > 55) {
    const a = ((s.alarm - 55) / 45) * (0.16 + 0.08 * Math.sin(time * 5));
    const g = ctx.createRadialGradient(640, 390, 240, 640, 390, 700);
    g.addColorStop(0, 'rgba(255,40,40,0)'); g.addColorStop(1, `rgba(255,40,40,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, VIEW.floorTop, VIEW.w, VIEW.h - VIEW.floorTop);
  }
}

export function renderHud(ctx, s) {
  ctx.fillStyle = '#120d1c';
  ctx.fillRect(0, 0, VIEW.w, VIEW.hud);
  ctx.fillStyle = P.goldDim;
  ctx.fillRect(0, VIEW.hud - 3, VIEW.w, 3);
  ctx.fillStyle = P.gold; ctx.font = 'bold 20px Georgia, serif'; ctx.textAlign = 'left';
  ctx.fillText('THE GILDED FRAME', 18, 28);
  ctx.fillStyle = P.inkDim; ctx.font = '12px Georgia, serif';
  ctx.fillText(s.room.name, 18, 48);
  // Objective line, small at the very top so it never collides with the alarm bar.
  ctx.fillStyle = P.inkDim; ctx.font = '12px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText(s.room.objective, 640, 16);
  // Alarm meter.
  const ax = 470, ay = 40, aw = 340, ah = 14;
  ctx.fillStyle = '#2a1a20'; ctx.fillRect(ax, ay, aw, ah);
  const frac = clamp(s.alarm / 100, 0, 1);
  const grad = ctx.createLinearGradient(ax, 0, ax + aw, 0);
  grad.addColorStop(0, '#7ddc8a'); grad.addColorStop(0.55, '#e8b64c'); grad.addColorStop(1, '#ff5040');
  ctx.fillStyle = grad; ctx.fillRect(ax, ay, aw * frac, ah);
  ctx.strokeStyle = P.goldDim; ctx.lineWidth = 1; ctx.strokeRect(ax, ay, aw, ah);
  ctx.fillStyle = s.lockdown ? P.danger : P.ink;
  ctx.font = 'bold 12px Georgia, serif'; ctx.textAlign = 'left';
  ctx.fillText(s.lockdown ? '⚠ ALARM — LOCKDOWN' : 'ALARM', ax, ay - 6);
  ctx.fillStyle = P.inkDim; ctx.font = '11px Georgia, serif'; ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(s.alarm)}%`, ax + aw + 44, ay + 12);
  // Loot + gadgets + timer, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = P.gold; ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText(`LOOT ${fmtMoney(s.player.lootValue)}`, 1262, 26);
  ctx.fillStyle = P.inkDim; ctx.font = '13px Georgia, serif';
  const mm = Math.floor(s.elapsed / 60), ss = Math.floor(s.elapsed % 60);
  ctx.fillText(`◉ COIN ×${s.player.coins}   ⚡ EMP ×${s.player.emps}   ⏱ ${mm}:${String(ss).padStart(2, '0')}`, 1262, 48);
  // Bottom hints.
  ctx.fillStyle = 'rgba(244,234,210,0.75)'; ctx.font = '12px Georgia, serif'; ctx.textAlign = 'left';
  ctx.fillText('WASD move · SHIFT run (loud) · C sneak · CLICK throw coin · E EMP · ESC pause · M mute · R retry', 18, 706);
  ctx.textAlign = 'right';
  ctx.fillText(s.grandHint, 1262, 706);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10,7,16,0.72)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = accent; ctx.font = 'bold 44px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText(title, 640, 250);
  ctx.fillStyle = P.ink; ctx.font = '18px Georgia, serif';
  lines.forEach((ln, i) => ctx.fillText(ln, 640, 300 + i * 30));
}

export function renderTitle(ctx, s) {
  overlay(ctx, 'THE GILDED FRAME', [
    'A museum gala heist, after midnight. You are Vesper, thief of the season.',
    'Slip past the wardens, dodge the cameras, cut the lasers —',
    'steal THE GILDED FRAME and walk out the service door with it.',
    '',
    'WASD move · SHIFT run · C sneak · CLICK throw a coin · E EMP · ESC pause · M mute',
    '',
    'CLICK OR PRESS ENTER TO BEGIN',
  ], P.gold);
}

export function renderPaused(ctx) {
  overlay(ctx, 'PAUSED', ['The gala waits. ESC to return, R to retry the room.'], P.ink);
}

export function renderCaught(ctx, s) {
  overlay(ctx, 'CAUGHT!', [
    `${s.caughtBy} has you. The gala gasps; the frame stays on its wall.`,
    `Loot kept so far: ${fmtMoney(s.player.lootValue)} — the room resets, the night does not.`,
    '',
    'Press R to try the room again.',
  ], P.danger);
}

export function renderWin(ctx, s) {
  const mins = Math.floor(s.elapsed / 60), secs = Math.floor(s.elapsed % 60);
  const rank = s.alarmPeak < 40 ? 'S — A GHOST' : s.alarmPeak < 75 ? 'A — A PROFESSIONAL' : 'B — A LOUD LEGEND';
  overlay(ctx, 'THE GETAWAY', [
    `You walk out into the night with ${fmtMoney(s.player.lootValue)} of gala treasure,`,
    `including THE GILDED FRAME itself. Time ${mins}:${String(secs).padStart(2, '0')} · peak alarm ${Math.round(s.alarmPeak)}%`,
    `Rank: ${rank}`,
    '',
    'Press R to steal it all over again.',
  ], P.gold);
}

export function renderToast(ctx, text) {
  if (!text) return;
  ctx.fillStyle = 'rgba(18,13,28,0.85)';
  const w = ctx.measureText(text).width + 36;
  ctx.fillRect(640 - w / 2, 84, w, 34);
  ctx.strokeStyle = P.goldDim; ctx.strokeRect(640 - w / 2, 84, w, 34);
  ctx.fillStyle = P.gold; ctx.font = 'bold 15px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText(text, 640, 106);
}
