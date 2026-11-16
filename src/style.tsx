// Moteur d'apparence : transforme thème + réglages du quiz + réglages de la question
// en variables CSS, classes, fond, décor animé, transition, sons…
import { createContext, useContext, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { DEFAULT_ANSWER_COLORS, themeById } from './themes';
import type { DecoId, QuestionLook, QuizStyle, TransitionId } from './types';
import { LETTERS } from './util';

// ---------------- Polices (Google Fonts, chargées à la demande) ----------------
export interface FontDef { id: string; label: string; family: string; g?: string }
export const FONTS: FontDef[] = [
  { id: 'system', label: 'Système (par défaut)', family: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", g: 'Inter:wght@400;600;800;900' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", g: 'Montserrat:wght@400;600;800;900' },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", g: 'Poppins:wght@400;600;800;900' },
  { id: 'nunito', label: 'Nunito (arrondie)', family: "'Nunito', sans-serif", g: 'Nunito:wght@400;700;900' },
  { id: 'quicksand', label: 'Quicksand (douce)', family: "'Quicksand', sans-serif", g: 'Quicksand:wght@400;600;700' },
  { id: 'fredoka', label: 'Fredoka (ludique)', family: "'Fredoka', sans-serif", g: 'Fredoka:wght@400;600;700' },
  { id: 'baloo', label: 'Baloo (BD)', family: "'Baloo 2', sans-serif", g: 'Baloo+2:wght@400;600;800' },
  { id: 'comic', label: 'Comic Neue', family: "'Comic Neue', cursive", g: 'Comic+Neue:wght@400;700' },
  { id: 'oswald', label: 'Oswald (étroite)', family: "'Oswald', sans-serif", g: 'Oswald:wght@400;600;700' },
  { id: 'bebas', label: 'Bebas Neue (affiche)', family: "'Bebas Neue', sans-serif", g: 'Bebas+Neue' },
  { id: 'righteous', label: 'Righteous (rétro)', family: "'Righteous', sans-serif", g: 'Righteous' },
  { id: 'bangers', label: 'Bangers (comics)', family: "'Bangers', cursive", g: 'Bangers' },
  { id: 'orbitron', label: 'Orbitron (futuriste)', family: "'Orbitron', sans-serif", g: 'Orbitron:wght@400;700;900' },
  { id: 'pixel', label: 'Press Start (pixel)', family: "'Press Start 2P', monospace", g: 'Press+Start+2P' },
  { id: 'courier', label: 'Courier (machine à écrire)', family: "'Courier Prime', monospace", g: 'Courier+Prime:wght@400;700' },
  { id: 'robotoslab', label: 'Roboto Slab', family: "'Roboto Slab', serif", g: 'Roboto+Slab:wght@400;700;900' },
  { id: 'playfair', label: 'Playfair (élégante)', family: "'Playfair Display', serif", g: 'Playfair+Display:wght@400;700;900' },
  { id: 'caveat', label: 'Caveat (manuscrite)', family: "'Caveat', cursive", g: 'Caveat:wght@400;700' },
  { id: 'dancing', label: 'Dancing Script', family: "'Dancing Script', cursive", g: 'Dancing+Script:wght@400;700' },
  { id: 'marker', label: 'Permanent Marker (feutre)', family: "'Permanent Marker', cursive", g: 'Permanent+Marker' },
  { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive", g: 'Pacifico' },
  { id: 'lobster', label: 'Lobster', family: "'Lobster', cursive", g: 'Lobster' },
  { id: 'creepster', label: 'Creepster (Halloween)', family: "'Creepster', cursive", g: 'Creepster' },
  { id: 'mountains', label: 'Mountains of Christmas', family: "'Mountains of Christmas', cursive", g: 'Mountains+of+Christmas:wght@400;700' },
];
const fontById = (id?: string) => FONTS.find((f) => f.id === id);
const loaded = new Set<string>();
export function ensureFont(id?: string) {
  const f = fontById(id);
  if (!f?.g || loaded.has(f.id) || typeof document === 'undefined') return;
  loaded.add(f.id);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${f.g}&display=swap`;
  document.head.appendChild(l);
}

// ---------------- Listes d'options (pour l'éditeur) ----------------
export const DECOS: { id: DecoId; label: string }[] = [
  { id: 'none', label: 'Aucun' }, { id: 'stars', label: 'Étoiles' }, { id: 'bubbles', label: 'Bulles' }, { id: 'confetti', label: 'Confettis' },
  { id: 'snow', label: 'Neige' }, { id: 'hearts', label: 'Cœurs' }, { id: 'leaves', label: 'Feuilles' }, { id: 'sparkles', label: 'Paillettes' },
  { id: 'bokeh', label: 'Halos lumineux' }, { id: 'waves', label: 'Rayures mouvantes' }, { id: 'grid', label: 'Grille néon' }, { id: 'emoji', label: 'Pluie d’emojis (au choix)' },
];
export const TRANSITIONS: { id: TransitionId; label: string }[] = [
  { id: 'fade', label: 'Fondu' }, { id: 'slide', label: 'Glissement' }, { id: 'zoom', label: 'Zoom' }, { id: 'flip', label: 'Retournement' },
  { id: 'bounce', label: 'Rebond' }, { id: 'swing', label: 'Balancier' }, { id: 'none', label: 'Aucune' },
];
export const TILE_STYLES = [
  { id: 'solid', label: 'Pleines' }, { id: 'flat', label: 'Plates (sans ombre)' }, { id: '3d', label: 'Boutons 3D' }, { id: 'gradient', label: 'Dégradé' },
  { id: 'glass', label: 'Verre dépoli' }, { id: 'outline', label: 'Contour' }, { id: 'pastel', label: 'Pastel' },
] as const;
export const LABEL_STYLES = [
  { id: 'letters', label: 'Lettres A B C' }, { id: 'numbers', label: 'Chiffres 1 2 3' }, { id: 'shapes', label: 'Formes ● ▲ ■' },
  { id: 'emoji', label: 'Emojis (au choix)' }, { id: 'none', label: 'Rien' },
] as const;
export const MUSICS = [
  { id: 'calm', label: 'Calme' }, { id: 'party', label: 'Festive' }, { id: 'retro', label: 'Rétro 8-bit' }, { id: 'suspense', label: 'Suspense' },
  { id: 'lounge', label: 'Lounge' }, { id: 'none', label: 'Aucune' },
] as const;
export const SOUND_PACKS = [
  { id: 'classic', label: 'Classiques' }, { id: 'retro', label: 'Rétro 8-bit' }, { id: 'soft', label: 'Doux' }, { id: 'none', label: 'Aucun son' },
] as const;
export const TIMER_STYLES = [
  { id: 'circle', label: 'Cercle' }, { id: 'bar', label: 'Barre' }, { id: 'number', label: 'Grand nombre' }, { id: 'hidden', label: 'Caché' },
] as const;

const SHAPES = ['●', '▲', '■', '◆', '★', '♥', '⬟', '✚'];

// ---------------- Résolution ----------------
export interface Backdrop { background: string; size?: string; repeat?: string; overlay: number; blur: number }

export interface Look {
  vars: CSSProperties;
  cls: string;
  backdrop?: Backdrop;
  deco: DecoId;
  decoEmoji: string;
  decoAmount: number;
  transition: TransitionId;
  timerStyle: NonNullable<QuizStyle['timerStyle']>;
  labels: NonNullable<QuizStyle['labels']>;
  labelEmojis: string[];
  layout: NonNullable<QuestionLook['layout']>;
  logo?: string;
  style: QuizStyle;
}

const defined = <T extends object>(o?: T): Partial<T> => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;
export const graphemes = (s = '') => {
  try { return [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(s)].map((x) => x.segment).filter((x) => x.trim()); } catch { return Array.from(s).filter((x) => x.trim()); }
};

/** img : convertit une source d'image (ex. « media:clé » côté téléphone) en adresse affichable */
export function resolveLook(themeId: string | undefined, style?: QuizStyle, qlook?: QuestionLook, img: (s: string) => string | undefined = (s) => s): Look {
  const t = themeById(themeId);
  const st: QuizStyle = { ...t.style, ...defined(style) };
  const v: Record<string, string> = { ...t.vars };
  if (st.fg) { v['--fg'] = st.fg; v['--muted'] = st.muted ?? `color-mix(in srgb, ${st.fg} 62%, transparent)`; }
  else if (st.muted) v['--muted'] = st.muted;
  if (st.accent) v['--accent'] = st.accent;
  const card = st.card ?? v['--card'];
  const op = st.cardOpacity ?? 1;
  v['--card'] = op < 0.999 ? `color-mix(in srgb, ${card} ${Math.round(op * 100)}%, transparent)` : card;
  v['--card-solid'] = card;
  (st.answerColors ?? []).forEach((c, i) => { if (c) v[`--a${i + 1}`] = c; });
  if ((st.bgMode === 'color' || st.bgMode === 'gradient') && st.bg) v['--bg'] = st.bg;
  ensureFont(st.font); ensureFont(st.titleFont);
  v['--font'] = fontById(st.font)?.family ?? fontById('system')!.family;
  v['--title-font'] = fontById(st.titleFont)?.family ?? 'var(--font)';
  v['--title-scale'] = String((st.titleScale ?? 1) * (qlook?.titleScale ?? 1));
  v['--r'] = String(st.radius ?? 1);
  if (qlook?.fg) { v['--fg'] = qlook.fg; v['--muted'] = `color-mix(in srgb, ${qlook.fg} 62%, transparent)`; }

  const backdropOf = (mode: string | undefined, bg?: string, bg2?: string, angle = 135, image?: string, overlay = 0, blur = 0, fit?: QuizStyle['bgFit'], gradType?: QuizStyle['gradType']): Backdrop | undefined => {
    if (mode === 'color' && bg) return { background: bg, overlay: 0, blur: 0 };
    if (mode === 'gradient' && bg) {
      const g = gradType === 'radial' ? `radial-gradient(circle at 50% 30%, ${bg}, ${bg2 ?? bg})` : `linear-gradient(${angle}deg, ${bg}, ${bg2 ?? bg})`;
      return { background: g, overlay: 0, blur: 0 };
    }
    if (mode === 'image' && image) {
      const src = img(image);
      if (!src) return undefined;
      return { background: `url("${src}") center / ${fit === 'contain' ? 'contain' : fit === 'tile' ? 'auto' : 'cover'} ${fit === 'tile' ? 'repeat' : 'no-repeat'}`, overlay, blur };
    }
    return undefined;
  };
  let backdrop = backdropOf(st.bgMode, st.bg, st.bg2, st.gradAngle, st.bgImage, st.overlay ?? 0.3, st.blur ?? 0, st.bgFit, st.gradType);
  if (qlook?.bgMode && qlook.bgMode !== 'quiz') {
    backdrop = backdropOf(qlook.bgMode, qlook.bg, qlook.bg2, qlook.gradAngle, qlook.bgImage, qlook.overlay ?? 0.3, 0) ?? backdrop;
    if ((qlook.bgMode === 'color' || qlook.bgMode === 'gradient') && qlook.bg) v['--bg'] = qlook.bg;
  }

  const cls = [
    `tiles-${st.tileStyle ?? 'solid'}`,
    st.titleUpper ? 'title-upper' : '',
    st.titleAlign === 'left' ? 'title-left' : '',
    st.textShadow ? 'text-glow' : '',
    backdrop?.background.startsWith('url') ? 'has-image' : '',
  ].filter(Boolean).join(' ');

  const deco = (qlook?.deco && qlook.deco !== 'quiz' ? qlook.deco : st.deco) ?? 'none';
  return {
    vars: v as unknown as CSSProperties,
    cls,
    backdrop,
    deco,
    decoEmoji: (qlook?.deco && qlook.deco !== 'quiz' ? qlook.decoEmoji : undefined) ?? st.decoEmoji ?? '🎉✨🎈',
    decoAmount: st.decoAmount ?? 1,
    transition: (qlook?.transition && qlook.transition !== 'quiz' ? qlook.transition : st.transition) ?? 'fade',
    timerStyle: st.timerStyle ?? 'circle',
    labels: st.labels ?? 'letters',
    labelEmojis: graphemes(st.labelEmojis || '🍎🍊🍋🍏🍇🍓'),
    layout: qlook?.layout ?? 'auto',
    logo: st.logo ? img(st.logo) : undefined,
    style: st,
  };
}

/** Apparence d'une question, en reprenant l'ancien champ « bg » (couleur unie). */
export function qlookOf(q: { look?: QuestionLook; bg?: string }): QuestionLook | undefined {
  if (q.look) return q.look;
  return q.bg ? { bgMode: 'color', bg: q.bg } : undefined;
}

export function labelFor(i: number, look: Look): string {
  switch (look.labels) {
    case 'numbers': return String(i + 1);
    case 'shapes': return SHAPES[i % SHAPES.length];
    case 'emoji': return look.labelEmojis[i % Math.max(1, look.labelEmojis.length)] ?? LETTERS[i];
    case 'none': return '';
    default: return LETTERS[i];
  }
}

export const answerColorsOf = (st: QuizStyle, themeId?: string) => DEFAULT_ANSWER_COLORS.map((d, i) => st.answerColors?.[i] || themeById(themeId).vars[`--a${i + 1}`] || d);

// ---------------- Contexte React ----------------
const LookCtx = createContext<Look>(resolveLook('craie'));
export const useLook = () => useContext(LookCtx);
export const LookProvider = ({ look, children }: { look: Look; children: ReactNode }) => <LookCtx.Provider value={look}>{children}</LookCtx.Provider>;

/** Étiquette d'une tuile de réponse (lettre, chiffre, forme, emoji…) */
export function TileLabel({ i }: { i: number }) {
  const look = useLook();
  const l = labelFor(i, look);
  if (!l) return null;
  return <span className={`letter ${look.labels === 'emoji' ? 'letter-emoji' : ''}`}>{l}</span>;
}

/** Couleur d'une tuile : la variable --tile est utilisée par les styles de tuiles (pleine, contour, verre…) */
export const tile = (i: number): CSSProperties => ({ ['--tile' as string]: `var(--a${(i % 6) + 1})` } as CSSProperties);

// ---------------- Calques : fond + décor ----------------
export function LookLayers({ look }: { look: Look }) {
  const b = look.backdrop;
  return (
    <>
      {b && (
        <div className="backdrop" aria-hidden>
          <div className="backdrop-img" style={{ background: b.background, filter: b.blur ? `blur(${b.blur}px)` : undefined, inset: b.blur ? -b.blur * 2 : 0 }} />
          {b.overlay !== 0 && <div className="backdrop-veil" style={{ background: b.overlay > 0 ? `rgba(0,0,0,${b.overlay})` : `rgba(255,255,255,${-b.overlay})` }} />}
        </div>
      )}
      <Deco deco={look.deco} emoji={look.decoEmoji} amount={look.decoAmount} />
    </>
  );
}

const rnd = (i: number, n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };

export function Deco({ deco, emoji = '🎉', amount = 1 }: { deco: DecoId; emoji?: string; amount?: number }) {
  const glyphs = useMemo(() => {
    if (deco === 'hearts') return ['❤', '♥', '💕'];
    if (deco === 'leaves') return ['🍃', '🍂', '🍁'];
    if (deco === 'sparkles') return ['✦', '✧', '⋆', '✶'];
    if (deco === 'emoji') return graphemes(emoji).length ? graphemes(emoji) : ['🎉'];
    return [];
  }, [deco, emoji]);
  const base = deco === 'stars' ? 60 : deco === 'snow' ? 70 : deco === 'bokeh' ? 14 : deco === 'sparkles' ? 30 : 20;
  const n = Math.round(base * Math.max(0.2, Math.min(3, amount)));
  if (deco === 'none') return null;
  if (deco === 'waves') return <div className="deco deco-waves" aria-hidden />;
  if (deco === 'grid') return <div className="deco deco-grid" aria-hidden><div /></div>;
  const items = Array.from({ length: n }, (_, i) => i);
  return (
    <div className={`deco deco-${deco === 'hearts' || deco === 'leaves' || deco === 'emoji' ? 'glyph' : deco}`} aria-hidden>
      {items.map((i) => {
        const r = (k: number) => rnd(i, k);
        let s: CSSProperties;
        switch (deco) {
          case 'bubbles': s = { left: `${r(1) * 100}%`, width: 20 + r(2) * 60, height: 20 + r(2) * 60, animationDuration: `${12 + r(3) * 18}s`, animationDelay: `${-r(4) * 30}s` }; break;
          case 'stars': s = { left: `${r(1) * 100}%`, top: `${r(2) * 100}%`, animationDuration: `${2 + r(3) * 4}s`, animationDelay: `${-r(4) * 5}s`, transform: `scale(${0.6 + r(5)})` }; break;
          case 'snow': s = { left: `${r(1) * 100}%`, width: 3 + r(2) * 7, height: 3 + r(2) * 7, animationDuration: `${8 + r(3) * 12}s`, animationDelay: `${-r(4) * 20}s`, opacity: 0.5 + r(5) * 0.5 }; break;
          case 'bokeh': s = { left: `${r(1) * 100}%`, top: `${r(2) * 100}%`, width: 80 + r(3) * 220, height: 80 + r(3) * 220, background: `var(--a${(i % 6) + 1})`, animationDuration: `${14 + r(4) * 16}s`, animationDelay: `${-r(5) * 20}s` }; break;
          case 'sparkles': s = { left: `${r(1) * 100}%`, top: `${r(2) * 100}%`, fontSize: 10 + r(3) * 22, animationDuration: `${1.5 + r(4) * 3}s`, animationDelay: `${-r(5) * 4}s`, color: `var(--a${(i % 6) + 1})` }; break;
          case 'confetti': s = { left: `${r(1) * 100}%`, background: `var(--a${(i % 6) + 1})`, animationDuration: `${10 + r(3) * 14}s`, animationDelay: `${-r(4) * 20}s` }; break;
          default: s = { left: `${r(1) * 100}%`, fontSize: 18 + r(2) * 26, animationDuration: `${10 + r(3) * 14}s`, animationDelay: `${-r(4) * 24}s`, color: deco === 'hearts' ? `var(--a${(i % 6) + 1})` : undefined };
        }
        return <i key={i} style={s}>{glyphs.length ? glyphs[i % glyphs.length] : null}</i>;
      })}
    </div>
  );
}

/** Racine d'un écran stylé : variables + classes + fond + décor, et contexte pour les composants. */
export function Styled({ look, className = '', children, attrs, preview }: { look: Look; className?: string; children: ReactNode; attrs?: Record<string, string | undefined>; preview?: boolean }) {
  useEffect(() => { ensureFont(look.style.font); ensureFont(look.style.titleFont); }, [look.style.font, look.style.titleFont]);
  return (
    <LookProvider look={look}>
      <div className={`app ${look.cls} ${preview ? 'is-preview' : ''} ${className}`} style={look.vars} {...attrs}>
        <LookLayers look={look} />
        {children}
      </div>
    </LookProvider>
  );
}
