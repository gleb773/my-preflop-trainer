// Синтезированные звуки комбо (Web Audio, без файлов)
let ctx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(c, { freq, type = 'square', start = 0, dur = 0.2, gain = 0.15, slideTo }) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseHit(c, { start = 0, dur = 0.15, gain = 0.3 }) {
  const t0 = c.currentTime + start;
  const len = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

/** Удар + аккорд, мощнее с ростом уровня (1..4) */
export function playComboSound(level) {
  const c = getCtx();
  if (!c) return;
  noiseHit(c, { gain: 0.2 + level * 0.08 });
  tone(c, { freq: 110, type: 'sine', dur: 0.25, gain: 0.35, slideTo: 55 });
  const chords = {
    1: [523, 659],
    2: [523, 659, 784],
    3: [392, 523, 659, 784],
    4: [262, 392, 523, 659, 784, 1047],
  };
  (chords[level] || chords[1]).forEach((f, i) => {
    tone(c, { freq: f, type: 'square', start: 0.05 + i * 0.05, dur: 0.25 + level * 0.12, gain: 0.05 });
  });
  if (level >= 4) {
    noiseHit(c, { start: 0.35, dur: 0.4, gain: 0.35 });
    tone(c, { freq: 80, type: 'sawtooth', start: 0.35, dur: 0.6, gain: 0.12, slideTo: 40 });
  }
}

/** Нисходящий «бзз» при прерывании комбо */
export function playBreakerSound() {
  const c = getCtx();
  if (!c) return;
  noiseHit(c, { gain: 0.35, dur: 0.2 });
  tone(c, { freq: 400, type: 'sawtooth', dur: 0.5, gain: 0.12, slideTo: 60 });
}

/** Короткий звон для нового рекорда */
export function playRecordSound() {
  const c = getCtx();
  if (!c) return;
  [784, 988, 1319].forEach((f, i) => tone(c, { freq: f, type: 'triangle', start: i * 0.08, dur: 0.3, gain: 0.12 }));
}
