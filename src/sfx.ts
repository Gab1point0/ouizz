// Sons synthétisés (Web Audio) : aucun fichier à télécharger, aucun droit d'auteur.
// Pour ajouter un son : une fonction de plus dans SOUNDS.

let ctx: AudioContext | null = null;
let enabled = true;
let musicOn = true;
let musicTimer = 0;

function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; delay?: number; slide?: number } = {}) {
  const c = ac();
  if (!c || !enabled) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t0 + dur);
  const v = opts.vol ?? 0.15;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const SOUNDS = {
  join: () => { tone(660, 0.12, { type: 'triangle' }); tone(990, 0.15, { type: 'triangle', delay: 0.08 }); },
  answer: () => tone(520, 0.07, { type: 'square', vol: 0.05 }),
  tick: () => tone(1200, 0.05, { type: 'square', vol: 0.06 }),
  start: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.18, { type: 'triangle', delay: i * 0.09 })),
  reveal: () => { tone(300, 0.25, { type: 'sawtooth', vol: 0.06, slide: 900 }); tone(880, 0.3, { type: 'triangle', delay: 0.22 }); },
  correct: () => { tone(660, 0.12, { type: 'triangle' }); tone(880, 0.2, { type: 'triangle', delay: 0.1 }); },
  wrong: () => tone(220, 0.35, { type: 'sawtooth', vol: 0.08, slide: 150 }),
  buzz: () => tone(180, 0.35, { type: 'square', vol: 0.12 }),
  podium: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', delay: i * 0.14, vol: 0.12 })),
  pop: () => tone(900, 0.06, { type: 'sine', vol: 0.08, slide: 1400 }),
};

export type SoundName = keyof typeof SOUNDS;

export function play(name: SoundName) {
  if (!enabled) return;
  try { SOUNDS[name](); } catch { /* ignore */ }
}

export function setSoundEnabled(v: boolean) { enabled = v; if (!v) stopMusic(); }
export function isSoundEnabled() { return enabled; }

/** Petite boucle d'attente (salle d'attente), très discrète. */
export function startMusic() {
  if (!musicOn || !enabled || musicTimer) return;
  const notes = [262, 330, 392, 330, 294, 349, 440, 349];
  let i = 0;
  const step = () => {
    tone(notes[i % notes.length], 0.22, { type: 'triangle', vol: 0.035 });
    if (i % 4 === 0) tone(notes[i % notes.length] / 2, 0.4, { type: 'sine', vol: 0.04 });
    i++;
  };
  step();
  musicTimer = window.setInterval(step, 300);
}
export function stopMusic() { clearInterval(musicTimer); musicTimer = 0; }
export function setMusicEnabled(v: boolean) { musicOn = v; if (!v) stopMusic(); }
