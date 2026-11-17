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
            <span className="mg-hand-emoji" style={side === 'L' ? { transform: 'scaleX(-1)' } : undefined}>🫴</span>
            <span className="mg-hand-num">{side === 'L' ? '6' : '7'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
