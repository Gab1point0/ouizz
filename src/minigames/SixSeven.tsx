// 67 Challenge : deux mains en bas de l'écran ; il faut taper gauche, droite, gauche, droite… le plus vite possible.
// Une paire gauche + droite = un « 67 ». Une main tapée deux fois de suite ne compte pas.
import { useEffect, useRef, useState } from 'react';
import type { MinigameProps } from './index';

const COUNTDOWN = 3000;
const SAFETY = 700; // on envoie le score un peu avant la fin de la question

export function SixSeven({ endsAt, onFinish }: MinigameProps) {
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [taps, setTaps] = useState(0);
  const [last, setLast] = useState<'L' | 'R' | null>(null);
  const [wrong, setWrong] = useState(false);
  const [bump, setBump] = useState(0);
  const done = useRef(false);
  const tapsRef = useRef(0);
  const lastRef = useRef<'L' | 'R' | null>(null);

  const startAt = t0 + COUNTDOWN;
  const stopAt = endsAt - SAFETY;
  const playing = now >= startAt && now < stopAt && !done.current;
  const left = Math.max(0, Math.ceil((startAt - now) / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= stopAt && !done.current) { done.current = true; onFinish(Math.floor(tapsRef.current / 2)); }
    }, 50);
    return () => clearInterval(id);
  }, [stopAt, onFinish]);

  const tap = (side: 'L' | 'R') => (e: React.PointerEvent) => {
    e.preventDefault();
    if (!playing) return;
    const expected = lastRef.current === 'L' ? 'R' : 'L';
    if (side !== expected) {
      setWrong(true);
      navigator.vibrate?.(60);
      setTimeout(() => setWrong(false), 180);
      return;
    }
    lastRef.current = side;
    tapsRef.current += 1;
    setLast(side);
    setTaps(tapsRef.current);
    setBump((b) => b + 1);
    if (side === 'R') navigator.vibrate?.(8);
  };

  const pairs = Math.floor(taps / 2);
  const total = Math.max(1, stopAt - startAt);
  const progress = Math.min(1, Math.max(0, (now - startAt) / total));
  const expected = last === 'L' ? 'R' : 'L';

  return (
    <div className={`mg-67 ${wrong ? 'mg-wrong' : ''}`}>
      <div className="mg-67-top">
        <div className="mg-bar"><i style={{ width: `${(1 - progress) * 100}%` }} /></div>
        <div className="mg-67-score"><b key={pairs} className="anim-pop">{pairs}</b><span>× 67</span></div>
      </div>
      <div className="mg-67-mid">
        {now < startAt
          ? <div className="mg-count anim-pop" key={left}>{left || 'GO'}</div>
          : done.current || now >= stopAt
            ? <div className="mg-count">Terminé !</div>
            : <div className="mg-67-big" key={bump}>{last === 'L' ? '6' : last === 'R' ? '7' : '6 → 7'}</div>}
      </div>
      <div className="mg-67-hands">
        {(['L', 'R'] as const).map((side) => (
          <button key={side} type="button" className={`mg-hand ${playing && expected === side ? 'next' : ''} ${last === side ? 'up' : ''}`} onPointerDown={tap(side)}>
            <PalmUp side={side} />
            <span className="mg-hand-num">{side === 'L' ? '6' : '7'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Main ouverte, paume vers le haut, vue du dessus (doigts vers l'avant, pouce vers l'extérieur). Dessin maison : identique sur tous les téléphones. */
function PalmUp({ side }: { side: 'L' | 'R' }) {
  return (
    <svg className="mg-palm" viewBox="0 0 120 130" aria-hidden style={side === 'L' ? { transform: 'scaleX(-1)' } : undefined}>
      <defs>
        <radialGradient id="mg-palm-g" cx="50%" cy="62%" r="55%">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="100%" stopColor="#f2b56b" />
        </radialGradient>
      </defs>
      <g stroke="#c98a3e" strokeWidth="3" strokeLinejoin="round">
        {/* doigts (de l'auriculaire à l'index), dessinés derrière la paume */}
        <rect x="20" y="30" width="16" height="50" rx="8" fill="#f6c27a" />
        <rect x="38" y="14" width="17" height="64" rx="8.5" fill="#f6c27a" />
        <rect x="57" y="10" width="17" height="68" rx="8.5" fill="#f6c27a" />
        <rect x="76" y="18" width="16" height="60" rx="8" fill="#f6c27a" />
        {/* pouce, vers l'extérieur */}
        <rect x="86" y="62" width="17" height="44" rx="8.5" fill="#f6c27a" transform="rotate(-42 94 84)" />
        {/* paume */}
        <path d="M18 70 Q18 58 30 58 L86 58 Q98 58 98 72 L96 98 Q92 122 58 122 Q24 122 20 98 Z" fill="url(#mg-palm-g)" />
      </g>
      {/* plis de la paume : on voit bien que c'est l'intérieur de la main */}
      <g fill="none" stroke="#d99a52" strokeWidth="2.5" strokeLinecap="round" opacity=".8">
        <path d="M30 76 Q55 70 86 78" />
        <path d="M34 90 Q56 84 80 94" />
        <path d="M74 66 Q62 92 70 114" />
      </g>
      {/* phalanges */}
      <g stroke="#e0a45c" strokeWidth="2" strokeLinecap="round" opacity=".7">
        <path d="M24 50 h8" /><path d="M42 36 h9" /><path d="M61 32 h9" /><path d="M80 40 h8" />
      </g>
    </svg>
  );
}
