import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { themeById } from '../themes';
import { youtubeEmbed } from '../util';

// ---------- Routage par « # » (compatible GitHub Pages) ----------
export function useHashRoute(): { path: string[]; query: URLSearchParams } {
  const read = () => {
    const h = location.hash.replace(/^#\/?/, '');
    const [p, q] = h.split('?');
    return { path: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q ?? '') };
  };
  const [r, setR] = useState(read);
  useEffect(() => {
    const on = () => setR(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
export const go = (path: string) => { location.hash = path.startsWith('#') ? path : `#${path}`; };

/** Adresse publique de l'application (sans le #) */
export const appUrl = () => location.href.split('#')[0].replace(/index\.html$/, '');

// ---------- Décor animé du thème ----------
export function Deco({ theme }: { theme?: string }) {
  const t = themeById(theme);
  const items = useMemo(() => Array.from({ length: t.deco === 'stars' ? 60 : 18 }, (_, i) => i), [t.deco]);
  if (!t.deco || t.deco === 'none') return null;
  if (t.deco === 'waves') return <div className="deco deco-waves" />;
  const colors = ['var(--a1)', 'var(--a2)', 'var(--a3)', 'var(--a4)', 'var(--a5)', 'var(--a6)'];
  return (
    <div className={`deco deco-${t.deco}`}>
      {items.map((i) => {
        const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
        const style: CSSProperties =
          t.deco === 'bubbles'
            ? { left: `${r(1) * 100}%`, width: 20 + r(2) * 60, height: 20 + r(2) * 60, animationDuration: `${12 + r(3) * 18}s`, animationDelay: `${-r(4) * 20}s` }
            : t.deco === 'stars'
              ? { left: `${r(1) * 100}%`, top: `${r(2) * 100}%`, animationDuration: `${2 + r(3) * 4}s`, animationDelay: `${-r(4) * 5}s` }
              : { left: `${r(1) * 100}%`, background: colors[i % 6], animationDuration: `${10 + r(3) * 14}s`, animationDelay: `${-r(4) * 20}s` };
        return <i key={i} style={style} />;
      })}
    </div>
  );
}

// ---------- Chrono circulaire ----------
export function Timer({ endsAt, total, paused, size = 96 }: { endsAt: number; total: number; paused?: number; size?: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const left = paused ?? Math.max(0, endsAt - now);
  const frac = total > 0 ? Math.min(1, left / total) : 0;
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const sec = Math.ceil(left / 1000);
  const color = sec <= 5 ? 'var(--a1)' : 'var(--accent)';
  return (
    <div className={`timer ${sec <= 5 && !paused ? 'anim-pulse' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="var(--card)" stroke="var(--line)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset .1s linear' }} />
      </svg>
      <span style={{ fontSize: size / 3 }}>{paused !== undefined ? '⏸' : sec}</span>
    </div>
  );
}

/** Secondes restantes (pour les téléphones) */
export function useCountdown(endsAt: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
}

// ---------- QR code ----------
export function QR({ text, size = 200 }: { text: string; size?: number }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then(setSvg).catch(() => setSvg(''));
  }, [text]);
  return <div className="qr" style={{ width: size + 20, height: size + 20 }} dangerouslySetInnerHTML={{ __html: svg.replace('<svg', `<svg width="${size}" height="${size}"`) }} />;
}

// ---------- Média (image ou vidéo YouTube / fichier) ----------
export function MediaView({ media, className = 'stage-media' }: { media?: { kind: 'image' | 'video'; src: string }; className?: string }) {
  if (!media?.src) return null;
  if (media.kind === 'image') return <img className={className} src={media.src} alt="" />;
  const yt = youtubeEmbed(media.src);
  if (yt) return <iframe className="stage-video" src={yt} allow="autoplay; encrypted-media; fullscreen" allowFullScreen title="vidéo" />;
  return <video className="stage-video" src={media.src} controls autoPlay />;
}

// ---------- Confettis ----------
export function Confetti({ count = 120 }: { count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 1.5, dur: 2.5 + Math.random() * 2.5, color: `var(--a${(i % 6) + 1})`, rot: Math.random() * 360,
  })), [count]);
  return (
    <>
      {pieces.map((p, i) => (
        <span key={i} className="confetti" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </>
  );
}

// ---------- Réactions flottantes ----------
export interface FloatingReaction { id: number; e: string; left: number }
export function ReactionsLayer({ items }: { items: FloatingReaction[] }) {
  return (
    <div className="reactions-layer">
      {items.map((r) => <span key={r.id} className="reaction" style={{ left: `${r.left}%` }}>{r.e}</span>)}
    </div>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal anim-pop">{children}</div>
    </div>
  );
}

/** Garde la dernière valeur d'un callback sans relancer les effets */
export function useLatest<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

export const answerColor = (i: number) => `var(--a${(i % 6) + 1})`;
