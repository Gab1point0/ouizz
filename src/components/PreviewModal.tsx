// Aperçu en direct depuis l'éditeur : le vrai grand écran et un vrai téléphone, côte à côte,
// reliés en « mode test » (sans Internet) et ouverts directement sur la question choisie.
import { useEffect, useRef, useState } from 'react';
import { newPin } from '../game/host';
import { plain } from './Rich';

/** Taille d'affichage d'un cadre de taille fixe (w×h) pour tenir dans son conteneur. */
function useFit(w: number, h: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(Math.min(el.clientWidth / w, el.clientHeight / h)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);
  return { ref, k };
}

export function PreviewModal({ quizId, titles, start, onClose }: { quizId: string; titles: string[]; start: number; onClose: () => void }) {
  const [idx, setIdx] = useState(start);
  const [run, setRun] = useState(() => newPin()); // nouveau code = nouvelle partie d'aperçu
  const [device, setDevice] = useState<'both' | 'stage' | 'phone'>('both');
  const stage = useFit(1600, 900);
  const phone = useFit(390, 780);
  const restart = (i = idx) => { setIdx(i); setRun(newPin()); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const base = `${location.pathname}${location.search}`;
  const hostUrl = `${base}#/run/${quizId}?preview=${run}&q=${idx}`;
  const phoneUrl = `${base}#/j/${run}?l=1&apercu=1`;

  return (
    <div className="preview-back">
      <div className="preview-bar">
        <b>👁 Aperçu</b>
        <button className="btn btn-sm" disabled={idx <= 0} onClick={() => restart(idx - 1)}>◀</button>
        <select className="select" style={{ width: 'auto', maxWidth: 360 }} value={idx} onChange={(e) => restart(Number(e.target.value))}>
          {titles.map((t, i) => <option key={i} value={i}>{i + 1}. {plain(t).slice(0, 60) || 'Sans titre'}</option>)}
        </select>
        <button className="btn btn-sm" disabled={idx >= titles.length - 1} onClick={() => restart(idx + 1)}>▶</button>
        <button className="btn btn-sm" onClick={() => restart()} title="Recommencer cette question">↺ Recommencer</button>
        <span className="spacer" />
        <div className="row" style={{ gap: 4 }}>
          {([['both', '🖥 + 📱'], ['stage', '🖥 Grand écran'], ['phone', '📱 Téléphone']] as const).map(([id, l]) => (
            <button key={id} className={`btn btn-sm ${device === id ? 'btn-primary' : ''}`} onClick={() => setDevice(id)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-sm" onClick={onClose}>✕ Fermer</button>
      </div>
      <div className="small preview-help">Clique sur « Révéler » / « Suivant » du grand écran pour avancer, et réponds sur le téléphone comme un joueur. Le son est coupé (bouton 🔇 du grand écran pour l’activer).</div>
      <div className={`preview-frames dev-${device}`}>
        <div className="preview-slot stage-slot" ref={stage.ref} style={{ display: device === 'phone' ? 'none' : undefined }}>
          <div style={{ width: 1600 * stage.k, height: 900 * stage.k }} className="preview-shell">
            <iframe key={`h${run}`} title="Grand écran" src={hostUrl} style={{ width: 1600, height: 900, transform: `scale(${stage.k})` }} />
          </div>
          <div className="preview-label">🖥 Grand écran</div>
        </div>
        <div className="preview-slot phone-slot" ref={phone.ref} style={{ display: device === 'stage' ? 'none' : undefined }}>
          <div style={{ width: 390 * phone.k, height: 780 * phone.k }} className="preview-shell phone-shell">
            <iframe key={`p${run}`} title="Téléphone" src={phoneUrl} style={{ width: 390, height: 780, transform: `scale(${phone.k})` }} />
          </div>
          <div className="preview-label">📱 Téléphone d’un joueur</div>
        </div>
      </div>
    </div>
  );
}
