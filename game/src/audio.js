// Procedural sound: every effect is synthesized with WebAudio, so the game
// ships no audio files and makes no network request. Sounds start only
// after the player's first gesture (browsers block audio before that).

let ctx = null;
let muted = false;
let ambientNode = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    startAmbient();
  } catch {
    ctx = null;
  }
}

export function setMuted(m) {
  muted = m;
  if (ambientNode) ambientNode.gain.value = m ? 0 : 0.035;
}

export function isMuted() {
  return muted;
}

// A low room tone so the museum never feels dead silent.
function startAmbient() {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 55;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 55.7;
  const gain = ctx.createGain();
  gain.gain.value = muted ? 0 : 0.035;
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc2.start();
  ambientNode = { gain, osc, osc2 };
}

// One short tone: frequency slides from `from` to `to` over `dur` seconds.
function tone(from, to, dur, type, volume, delay = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// A filtered noise burst: footsteps, coin ticks, the alarm's edge.
function noiseBurst(dur, volume, cutoff, delay = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t0);
}

export const sfx = {
  // Soft shoe tap; quieter and lower when sneaking.
  step(sneaking) {
    noiseBurst(0.05, sneaking ? 0.05 : 0.11, sneaking ? 500 : 900);
  },
  // Coin leaves the hand, then lands with a bright ping.
  coinThrow() {
    tone(1400, 900, 0.12, 'sine', 0.1);
  },
  coinLand() {
    tone(2400, 1800, 0.18, 'sine', 0.16);
    tone(3200, 2400, 0.1, 'sine', 0.07, 0.02);
  },
  // Two-note chime when an artifact is pocketed.
  pickup() {
    tone(660, 660, 0.1, 'sine', 0.16);
    tone(990, 990, 0.16, 'sine', 0.16, 0.09);
  },
  // Guard grows suspicious: a short questioning blip.
  suspicious() {
    tone(520, 700, 0.14, 'triangle', 0.14);
  },
  // Full alarm: a descending sawtooth sting, twice.
  alarm() {
    tone(880, 220, 0.35, 'sawtooth', 0.16);
    tone(880, 220, 0.35, 'sawtooth', 0.16, 0.38);
  },
  // Caught: a dull thud.
  caught() {
    noiseBurst(0.25, 0.3, 300);
    tone(160, 60, 0.3, 'sine', 0.22);
  },
  // Level complete: a small rising arpeggio.
  levelClear() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'sine', 0.15, i * 0.11));
  },
  // Exit unlocks: a soft unlocking click and chime.
  unlock() {
    tone(1200, 1200, 0.06, 'square', 0.06);
    tone(1560, 1560, 0.14, 'sine', 0.12, 0.07);
  },
  click() {
    tone(900, 700, 0.05, 'sine', 0.08);
  },
};
