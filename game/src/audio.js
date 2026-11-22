// The Gilded Frame — synthesised sound, no audio files.
// One job: every sound the game makes, built from WebAudio oscillators and
// filtered noise. A low string pad hums under the gala; footsteps tick,
// coins clink, loot chimes, the alarm swells, and a chase stings.

export function makeAudio() {
  const a = { ctx: null, master: null, muted: false, pad: null, alarmOsc: null, alarmGain: null };
  return a;
}

export function ensureAudio(a) {
  if (a.ctx) { if (a.ctx.state === 'suspended') a.ctx.resume(); return; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  a.ctx = new Ctx();
  a.master = a.ctx.createGain();
  a.master.gain.value = a.muted ? 0 : 0.5;
  a.master.connect(a.ctx.destination);
  startPad(a);
}

function startPad(a) {
  // Two detuned triangle waves through a lowpass: a quiet gala-room hum.
  const g = a.ctx.createGain(); g.gain.value = 0.045; g.connect(a.master);
  const f = a.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.connect(g);
  for (const freq of [110, 164.8, 220.5]) {
    const o = a.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    o.detune.value = (Math.random() - 0.5) * 6; o.connect(f); o.start();
  }
  a.pad = g;
}

function tone(a, freq, dur, type, vol, when = 0, slideTo = null) {
  if (!a.ctx || a.muted) return;
  const t = a.ctx.currentTime + when;
  const o = a.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(a, dur, vol, freq, when = 0) {
  if (!a.ctx || a.muted) return;
  const t = a.ctx.currentTime + when;
  const len = Math.max(1, Math.floor(a.ctx.sampleRate * dur));
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.ctx.createBufferSource(); src.buffer = buf;
  const f = a.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = a.ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(a.master);
  src.start(t);
}

export function playStep(a, loud) {
  if (!a.ctx) return;
  noise(a, 0.07, loud ? 0.16 : 0.05, loud ? 300 : 520);
}

export function playCoin(a) { tone(a, 2400, 0.12, 'sine', 0.16); tone(a, 3200, 0.18, 'sine', 0.12, 0.05); }
export function playCoinLand(a) { tone(a, 1800, 0.1, 'triangle', 0.14); noise(a, 0.05, 0.08, 2400, 0.02); }
export function playLoot(a) {
  tone(a, 660, 0.14, 'sine', 0.16); tone(a, 880, 0.16, 'sine', 0.16, 0.07); tone(a, 1320, 0.24, 'sine', 0.14, 0.14);
}
export function playGrand(a) {
  [523, 659, 784, 1046].forEach((f, i) => tone(a, f, 0.5, 'triangle', 0.15, i * 0.09));
}
export function playSpotted(a) {
  tone(a, 220, 0.5, 'sawtooth', 0.14, 0, 440); tone(a, 233, 0.5, 'sawtooth', 0.1, 0, 466);
}
export function playLaser(a) { tone(a, 1400, 0.22, 'square', 0.1, 0, 700); }
export function playEmp(a) { noise(a, 0.5, 0.2, 900); tone(a, 900, 0.5, 'sine', 0.12, 0, 120); }
export function playCaught(a) {
  tone(a, 392, 0.3, 'sawtooth', 0.16); tone(a, 311, 0.3, 'sawtooth', 0.16, 0.22); tone(a, 233, 0.7, 'sawtooth', 0.18, 0.44);
}
export function playWin(a) {
  [523, 659, 784, 1046, 1318].forEach((f, i) => tone(a, f, 0.6, 'triangle', 0.15, i * 0.11));
}
export function playDoor(a) { tone(a, 180, 0.25, 'sine', 0.12, 0, 320); noise(a, 0.2, 0.06, 500); }

export function setAlarmLevel(a, level) {
  // level 0..1: a pulsing sawtooth that grows with the alarm meter.
  if (!a.ctx) return;
  if (level > 0.25 && !a.alarmOsc) {
    const o = a.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 98;
    const g = a.ctx.createGain(); g.gain.value = 0;
    const lfo = a.ctx.createOscillator(); lfo.frequency.value = 2.2;
    const lg = a.ctx.createGain(); lg.gain.value = 0.02;
    lfo.connect(lg); lg.connect(g.gain);
    o.connect(g); g.connect(a.master);
    o.start(); lfo.start();
    a.alarmOsc = o; a.alarmGain = g; a.alarmLfo = lfo;
  }
  if (a.alarmGain) {
    a.alarmGain.gain.setTargetAtTime(a.muted ? 0 : level * 0.05, a.ctx.currentTime, 0.3);
  }
  if (level <= 0.2 && a.alarmOsc) {
    try { a.alarmOsc.stop(); a.alarmLfo.stop(); } catch { /* already stopped */ }
    a.alarmOsc = null; a.alarmGain = null;
  }
}

export function toggleMute(a) {
  a.muted = !a.muted;
  if (a.master && a.ctx) a.master.gain.setTargetAtTime(a.muted ? 0 : 0.5, a.ctx.currentTime, 0.05);
  return a.muted;
}
