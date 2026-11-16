import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { useLook } from '../style';
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

// ---------- Chrono (cercle, barre, grand nombre ou caché, selon l'apparence) ----------
export function Timer({ endsAt, total, paused, size = 96, variant }: { endsAt: number; total: number; paused?: number; size?: number; variant?: 'circle' | 'bar' | 'number' | 'hidden' }) {
  const look = useLook();
  const kind = variant ?? look.timerStyle;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const left = paused ?? Math.max(0, endsAt - now);
  const frac = total > 0 ? Math.min(1, left / total) : 0;
  const sec = Math.ceil(left / 1000);
  const color = sec <= 5 ? 'var(--a1)' : 'var(--accent)';
  if (kind === 'hidden') return null;
  if (kind === 'bar') return <div className="timer-bar"><div style={{ width: `${frac * 100}%`, background: color }} /></div>;
  if (kind === 'number') return <div className={`timer-number ${sec <= 5 && !paused ? 'anim-pulse' : ''}`} style={{ color }}>{paused !== undefined ? '⏸' : sec}</div>;
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
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
