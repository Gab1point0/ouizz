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

// ---------- vrais morceaux (créés avec Gemini, dans public/music) ----------
// Chaque ambiance a son fichier ; si un fichier ne se charge pas, on retombe sur la boucle synthétisée ci-dessus.
export const TRACKS: Record<string, string> = {
  calm: 'attente-calme', party: 'attente-festive', retro: 'attente-retro', suspense: 'attente-suspense', lounge: 'attente-lounge',
  thinking: 'reflexion', podium: 'podium',
};
const trackUrl = (name: string) => `./music/${TRACKS[name] ?? name}.mp3`;
let track: HTMLAudioElement | null = null;
let trackName = '';

function fade(a: HTMLAudioElement, to: number, ms: number, then?: () => void) {
  const from = a.volume;
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) setTimeout(step, 40); else then?.();
  };
  step();
}

function playTrack(name: string, opts: { loop: boolean; vol: number; fallback?: () => void; start?: number }) {
  stopTrack(0);
  const a = new Audio(trackUrl(name));
  a.loop = opts.loop;
  a.volume = 0;
  a.preload = 'auto';
  // démarrer plus loin dans le morceau (aperçu : on saute l'intro, plus calme)
  if (opts.start) a.addEventListener('loadedmetadata', () => { if (a.duration > opts.start! + 5) a.currentTime = opts.start!; }, { once: true });
  track = a;
  trackName = name;
  let failed = false;
  const fail = () => { if (failed || track !== a) return; failed = true; track = null; trackName = ''; opts.fallback?.(); };
  a.addEventListener('error', fail);
  a.play().then(() => fade(a, opts.vol, 800)).catch(fail);
  return a;
}

function stopTrack(ms = 600) {
  const a = track;
  track = null;
  trackName = '';
  if (!a) return;
  if (!ms) { a.pause(); return; }
  fade(a, 0, ms, () => a.pause());
}

function startSynth(style: string) {
  if (musicTimer) return;
  const m = MUSIC[style] ?? MUSIC.calm;
  let i = 0;
  const step = () => { m.play(m.notes[i % m.notes.length], i); i++; };
  step();
  musicTimer = window.setInterval(step, m.step);
}

/** Musique de la salle d'attente (en boucle). */
export function startMusic(style: string = 'calm') {
  if (!musicOn || !enabled || style === 'none') return;
  if (trackName === style || musicTimer) return;
  stopMusic();
  playTrack(style, { loop: true, vol: 0.45, fallback: () => startSynth(style) });
}

/** Musique de réflexion pendant les questions (discrète). */
export function startQuestionMusic() {
  if (!musicOn || !enabled) return;
  if (trackName === 'thinking') return;
  stopMusic();
  playTrack('thinking', { loop: true, vol: 0.28 });
}

/** Petit air de victoire au podium. */
export function playPodiumJingle() {
  if (!enabled || pack === 'none') return;
  stopMusic();
  playTrack('podium', { loop: false, vol: 0.6, fallback: () => SOUNDS.podium() });
}

export function stopMusic(ms = 600) { clearInterval(musicTimer); musicTimer = 0; stopTrack(ms); }
export function setMusicEnabled(v: boolean) { musicOn = v; if (!v) stopMusic(); }

/** Aperçu dans l'éditeur : 12 secondes, à partir du cœur du morceau (l'intro est plus calme).
 *  onPreview(id, état) informe l'interface : 'loading' (téléchargement), 'playing', puis null à la fin. */
type PreviewState = 'loading' | 'playing';
let previewTimer = 0;
let previewId: string | null = null;
let previewListener: ((id: string | null, state: PreviewState | null) => void) | null = null;
export function onPreview(cb: ((id: string | null, state: PreviewState | null) => void) | null) { previewListener = cb; }
const notify = (id: string | null, state: PreviewState | null) => { previewId = id; previewListener?.(id, state); };
export function stopPreview() { clearTimeout(previewTimer); stopMusic(300); notify(null, null); }
export function previewMusic(style: string) {
  clearTimeout(previewTimer);
  stopMusic(0);
  if (previewId === style) { notify(null, null); return; } // 2e clic sur le même : on arrête
  const name = style;
  const vol = style === 'thinking' ? 0.5 : style === 'podium' ? 0.7 : 0.6;
  notify(style, 'loading');
  const a = playTrack(name, {
    loop: false, vol, start: style === 'podium' ? 0 : 25,
    fallback: () => { // fichier introuvable : boucle synthétisée
      if (style === 'podium') SOUNDS.podium(); else { const was = musicOn, wasOn = enabled; musicOn = true; enabled = true; startSynth(style); musicOn = was; enabled = wasOn; }
      notify(style, 'playing');
    },
  });
  a.addEventListener('playing', () => { if (previewId === style) notify(style, 'playing'); }, { once: true });
  previewTimer = window.setTimeout(() => { stopMusic(600); notify(null, null); }, 12000 + 0);
  // le compte des 12 s commence quand le son démarre vraiment
  a.addEventListener('playing', () => { clearTimeout(previewTimer); previewTimer = window.setTimeout(() => { stopMusic(600); notify(null, null); }, 12000); }, { once: true });
}
export function previewSounds(p: string) {
  const old = pack; pack = p as Pack;
  SOUNDS.correct(); setTimeout(() => SOUNDS.reveal(), 400); setTimeout(() => { pack = old; }, 1200);
}
