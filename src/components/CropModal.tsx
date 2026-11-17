// Recadrer une image : on déplace / redimensionne un cadre (souris ou doigt), puis on garde seulement cette partie.
import { useRef, useState } from 'react';
import { cropImage } from '../image';
import { Modal } from './common';

export interface CropRect { x: number; y: number; w: number; h: number }

const RATIOS: { id: string; label: string; r?: number }[] = [
  { id: 'free', label: 'Libre' }, { id: '16:9', label: '16:9', r: 16 / 9 }, { id: '4:3', label: '4:3', r: 4 / 3 },
  { id: '1:1', label: 'Carré', r: 1 }, { id: '3:4', label: 'Portrait', r: 3 / 4 },
];
type Grab = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const MIN = 0.04;

export function CropModal({ src, onClose, onDone }: { src: string; onClose: () => void; onDone: (dataUrl: string, rect: CropRect) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [r, setR] = useState<CropRect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [ratio, setRatio] = useState('free');
  const [ar, setAr] = useState(1); // largeur / hauteur de l'image
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const isGif = /^data:image\/gif|\.gif(\?|$)/i.test(src);

  /** Ajuste le cadre au ratio choisi (en pixels réels de l'image), centré. */
  const applyRatio = (id: string, base = r) => {
    setRatio(id);
    const want = RATIOS.find((x) => x.id === id)?.r;
    if (!want) return;
    // en fractions : w/h (fractions) = want / ar
    const k = want / ar;
    let w = base.w, h = w / k;
    if (h > 1) { h = 1; w = h * k; }
    if (w > 1) { w = 1; h = w / k; }
    const cx = base.x + base.w / 2, cy = base.y + base.h / 2;
    setR({ w, h, x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h) });
  };

  const start = (g: Grab) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const b = box.current!.getBoundingClientRect();
    const r0 = r, x0 = e.clientX, y0 = e.clientY;
    const k = RATIOS.find((x) => x.id === ratio)?.r ? (RATIOS.find((x) => x.id === ratio)!.r! / ar) : 0;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / b.width, dy = (ev.clientY - y0) / b.height;
      if (g === 'move') { setR({ ...r0, x: clamp(r0.x + dx, 0, 1 - r0.w), y: clamp(r0.y + dy, 0, 1 - r0.h) }); return; }
      let { x, y, w, h } = r0;
      if (g.includes('w')) { const nx = clamp(r0.x + dx, 0, r0.x + r0.w - MIN); w = r0.w + (r0.x - nx); x = nx; }
      if (g.includes('e')) w = clamp(r0.w + dx, MIN, 1 - r0.x);
      if (g.includes('n')) { const ny = clamp(r0.y + dy, 0, r0.y + r0.h - MIN); h = r0.h + (r0.y - ny); y = ny; }
      if (g.includes('s')) h = clamp(r0.h + dy, MIN, 1 - r0.y);
      if (k) {
        // ratio imposé : la largeur commande, sauf poignées haut/bas
        if (g === 'n' || g === 's') w = h * k; else h = w / k;
        if (g.includes('n')) y = r0.y + r0.h - h;
        if (g.includes('w')) x = r0.x + r0.w - w;
        if (x < 0 || y < 0 || x + w > 1 || y + h > 1) return;
      }
      setR({ x, y, w, h });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const done = async () => {
    setBusy(true); setErr('');
    try { onDone(await cropImage(src, r), r); }
    catch { setErr('Impossible de recadrer cette image : le site d’où elle vient l’interdit. Enregistre-la sur ton ordinateur, ajoute-la depuis le fichier, puis recadre-la.'); }
    setBusy(false);
  };

  const pct = (v: number) => `${v * 100}%`;
  return (
    <Modal onClose={onClose}>
      <div className="col" style={{ gap: 12, width: '100%' }}>
        <div className="row"><h3 className="grow" style={{ margin: 0 }}>✂ Recadrer l’image</h3><button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button></div>
        <div className="small muted">Déplace le cadre et tire sur ses coins ou ses bords : seule la partie claire sera gardée.{isGif ? ' ⚠ Un GIF recadré devient une image fixe.' : ''}</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {RATIOS.map((x) => <button key={x.id} className={`btn btn-sm ${ratio === x.id ? 'btn-primary' : ''}`} onClick={() => applyRatio(x.id)}>{x.label}</button>)}
          <button className="btn btn-sm btn-ghost" onClick={() => { setRatio('free'); setR({ x: 0, y: 0, w: 1, h: 1 }); }}>Toute l’image</button>
        </div>
        <div className="crop-stage">
          <div className="crop-box" ref={box}>
            <img src={src} alt="" draggable={false}
              onLoad={(e) => { const im = e.currentTarget; if (im.naturalHeight) setAr(im.naturalWidth / im.naturalHeight); }} />
            <div className="crop-rect" style={{ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) }} onPointerDown={start('move')}>
              {(['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as Grab[]).map((g) => <span key={g} className={`crop-h crop-${g}`} onPointerDown={start(g)} />)}
            </div>
          </div>
        </div>
        {err && <div className="problems">⚠ {err}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={done} disabled={busy}>{busy ? 'Recadrage…' : '✓ Recadrer'}</button>
        </div>
      </div>
    </Modal>
  );
}

/** Convertit une zone (coordonnées de l'image d'origine) dans l'image recadrée. Renvoie null si elle sort entièrement. */
export function cropPoint(p: [number, number], c: CropRect): [number, number] {
  return [(p[0] - c.x) / c.w, (p[1] - c.y) / c.h];
}
