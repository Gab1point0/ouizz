// « Clint's Dating Sim » : des gens apparaissent quelques instants dans des encadrements de porte.
// Il faut toucher UNIQUEMENT les petits adultes (adultes de petite taille), pas les grands ni les personnes âgées.
// Bonne cible : +1 ; mauvaise cible : −1 (jamais sous 0). La porte sert de repère de taille.
import { useEffect, useRef, useState } from 'react';
import type { MinigameProps } from './index';

const COUNTDOWN = 3000;
const SAFETY = 700;
const HOLES = 9;
const ADULTS = ['🧍', '🧍‍♀️', '🧍‍♂️', '🕴️', '💃', '🕺'];
const ELDERS = ['👴', '👵', '🧓'];

type Kind = 'small' | 'tall' | 'elder';
interface Pop { id: number; hole: number; kind: Kind; emoji: string; until: number; hit?: 'ok' | 'bad' }

export function DatingSim({ endsAt, onFinish }: MinigameProps) {
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [pops, setPops] = useState<Pop[]>([]);
  const popsRef = useRef<Pop[]>([]);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const scoreRef = useRef(0);
  const next = useRef(0);
  const nid = useRef(1);
  const done = useRef(false);
  const startAt = t0 + COUNTDOWN;
  const stopAt = endsAt - SAFETY;

  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= stopAt) {
        if (!done.current) { done.current = true; popsRef.current = []; setPops([]); onFinish(scoreRef.current); }
        return;
      }
      if (n < startAt) return;
      const k = Math.min(1, (n - startAt) / Math.max(1, stopAt - startAt)); // 0 → 1 : ça accélère
      // calcul hors de setState (React peut rejouer une fonction de mise à jour : pas d'effet de bord dedans)
      let list = popsRef.current.filter((p) => p.until > n || (p.hit && p.until + 250 > n));
      if (n >= next.current) {
        next.current = n + 650 - 330 * k;
        const busy = new Set(list.map((p) => p.hole));
        const free = [...Array(HOLES).keys()].filter((h) => !busy.has(h));
        if (free.length) {
          const r = Math.random();
          const kind: Kind = r < 0.45 ? 'small' : r < 0.75 ? 'tall' : 'elder';
          const emoji = kind === 'elder' ? ELDERS[Math.floor(Math.random() * ELDERS.length)] : ADULTS[Math.floor(Math.random() * ADULTS.length)];
          list = [...list, { id: nid.current++, hole: free[Math.floor(Math.random() * free.length)], kind, emoji, until: n + 1500 - 600 * k }];
        }
      }
      if (list.length !== popsRef.current.length || list.some((p, i) => p !== popsRef.current[i])) { popsRef.current = list; setPops(list); }
    }, 50);
    return () => clearInterval(id);
  }, [startAt, stopAt, onFinish]);

  const tap = (p: Pop) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (p.hit || done.current || Date.now() < startAt) return;
    const ok = p.kind === 'small';
    scoreRef.current = Math.max(0, scoreRef.current + (ok ? 1 : -1));
    setScore(scoreRef.current);
    setFlash(ok ? 'ok' : 'bad');
    setTimeout(() => setFlash(null), 160);
    navigator.vibrate?.(ok ? 10 : 80);
    popsRef.current = popsRef.current.map((x) => (x.id === p.id ? { ...x, hit: ok ? 'ok' : 'bad' as const, until: Date.now() } : x));
    setPops(popsRef.current);
  };

  const progress = Math.min(1, Math.max(0, (now - startAt) / Math.max(1, stopAt - startAt)));
  const left = Math.max(0, Math.ceil((startAt - now) / 1000));
  return (
    <div className={`mg-dating ${flash ? `mg-flash-${flash}` : ''}`}>
      <div className="mg-67-top">
        <div className="mg-bar"><i style={{ width: `${(1 - progress) * 100}%` }} /></div>
        <div className="mg-67-score"><b key={score} className="anim-pop">{score}</b><span>💘</span></div>
      </div>
      <div className="small muted center">Touche seulement les <b>petits adultes</b> (moins de la moitié de la porte). Pas les grands, pas les papis-mamies !</div>
      <div className="mg-doors">
        {[...Array(HOLES).keys()].map((h) => {
          const p = pops.find((x) => x.hole === h);
          return (
            <div key={h} className="mg-door" onPointerDown={p ? tap(p) : undefined}>
              <i className="mg-half" />
              {p && (
                <span className={`mg-person mg-${p.kind} ${p.hit ? `mg-hit-${p.hit}` : ''}`}>
                  <span className="mg-person-emoji">{p.emoji}</span>
                  {p.kind === 'elder' && <span className="mg-cane">🦯</span>}
                </span>
              )}
            </div>
          );
        })}
        {now < startAt && <div className="mg-overlay"><div className="mg-count anim-pop" key={left}>{left || 'GO'}</div></div>}
        {now >= stopAt && <div className="mg-overlay"><div className="mg-count" style={{ fontSize: '2em' }}>Terminé !<br />{score} 💘</div></div>}
      </div>
    </div>
  );
}
