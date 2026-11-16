// Sons synthétisés (Web Audio) : aucun fichier à télécharger, aucun droit d'auteur.
// Ambiances au choix : packs de sons (classique, rétro, doux) et musiques d'attente.
// Pour ajouter un son : une fonction de plus dans SOUNDS ; une musique : une entrée dans MUSIC.

let ctx: AudioContext | null = null;
let enabled = true;
let musicOn = true;
let musicTimer = 0;
type Pack = 'classic' | 'retro' | 'soft' | 'none';
let pack: Pack = 'classic';

function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; delay?: number; slide?: number; music?: boolean } = {}) {
  const c = ac();
  if (!c || !enabled) return;
  if (!opts.music && pack === 'none') return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  let type = opts.type ?? 'sine';
  let v = opts.vol ?? 0.15;
  if (!opts.music) {
    if (pack === 'retro') { type = 'square'; v *= 0.6; }
    if (pack === 'soft') { type = 'sine'; v *= 0.55; }
  }
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t0 + dur);
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
export function setSoundPack(p?: string) { pack = (p as Pack) || 'classic'; }

// ---------- musiques d'attente (boucles très discrètes) ----------
type MusicDef = { step: number; notes: number[]; play: (f: number, i: number) => void };
const MUSIC: Record<string, MusicDef> = {
  calm: { step: 300, notes: [262, 330, 392, 330, 294, 349, 440, 349], play: (f, i) => { tone(f, 0.22, { type: 'triangle', vol: 0.035, music: true }); if (i % 4 === 0) tone(f / 2, 0.4, { vol: 0.04, music: true }); } },
  party: { step: 180, notes: [392, 392, 523, 392, 440, 440, 587, 440, 349, 349, 466, 349, 392, 523, 494, 440], play: (f, i) => { tone(f, 0.12, { type: 'square', vol: 0.025, music: true }); if (i % 2 === 0) tone(98 * (i % 8 < 4 ? 1 : 1.12), 0.12, { type: 'triangle', vol: 0.06, music: true }); } },
  retro: { step: 140, notes: [523, 659, 784, 1047, 784, 659, 587, 698, 880, 698, 523, 659], play: (f, i) => { tone(f, 0.1, { type: 'square', vol: 0.025, music: true }); if (i % 3 === 0) tone(f / 4, 0.12, { type: 'square', vol: 0.03, music: true }); } },
  suspense: { step: 600, notes: [110, 116.5, 110, 103.8, 110, 130.8, 123.5, 116.5], play: (f) => { tone(f, 0.9, { type: 'sawtooth', vol: 0.025, music: true }); tone(f * 4, 0.15, { type: 'sine', vol: 0.02, music: true, delay: 0.3 }); } },
  lounge: { step: 420, notes: [349, 440, 523, 659, 392, 494, 587, 698, 330, 415, 494, 622], play: (f, i) => { tone(f, 0.5, { type: 'sine', vol: 0.03, music: true }); if (i % 4 === 0) tone(f / 2, 1.2, { type: 'sine', vol: 0.035, music: true }); } },
};

export function startMusic(style: string = 'calm') {
  if (!musicOn || !enabled || musicTimer || style === 'none') return;
  const m = MUSIC[style] ?? MUSIC.calm;
  let i = 0;
  const step = () => { m.play(m.notes[i % m.notes.length], i); i++; };
  step();
  musicTimer = window.setInterval(step, m.step);
}
export function stopMusic() { clearInterval(musicTimer); musicTimer = 0; }
export function setMusicEnabled(v: boolean) { musicOn = v; if (!v) stopMusic(); }
/** Petit aperçu (éditeur) */
export function previewMusic(style: string) {
  stopMusic();
  const was = musicOn; musicOn = true;
  startMusic(style);
  musicOn = was;
  setTimeout(stopMusic, 3500);
}
export function previewSounds(p: string) {
  const old = pack; pack = p as Pack;
  SOUNDS.correct(); setTimeout(() => SOUNDS.reveal(), 400); setTimeout(() => { pack = old; }, 1200);
}
