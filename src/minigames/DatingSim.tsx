// « Clint's Dating Sim » : des gens apparaissent n'importe où à l'écran pendant un court instant.
// Il faut toucher UNIQUEMENT les petits adultes (proportions d'adulte, juste plus petits) :
// les hommes portent une casquette, les femmes une robe ou une jupe, et tous tiennent un verre à cocktail.
// Pièges : les grands (sans casquette, femmes en pantalon) et les personnes âgées. Bonne cible +1, piège −1 (jamais sous 0).
import { useEffect, useRef, useState } from 'react';
import type { MinigameProps } from './index';

const COUNTDOWN = 3000;
const SAFETY = 700;
const FIELD_W = 100; // unités : % de la largeur
const FIELD_H = 130; // hauteur de la zone en % de la largeur (zone 100 × 130)

type Kind = 'small' | 'tall' | 'elder';
export interface Pop { id: number; kind: Kind; girl: boolean; x: number; y: number; h: number; look: number; until: number; born: number; hit?: 'ok' | 'bad' }

const SKINS = ['#f6c9a3', '#e8b48a', '#c98e62', '#8d5a3b', '#f1d0b5'];
const HAIRS = ['#3b2416', '#6b4423', '#1b1b1b', '#c9a15a', '#8a3b1d'];
const TOPS = ['#e63946', '#2a9d8f', '#457b9d', '#f4a261', '#8e5bd6', '#ef476f'];
const PANTS = ['#2f4b8a', '#3d3d3d', '#6b705c', '#264653'];
const CAPS = ['#e63946', '#1d7a46', '#1f4e9c', '#f4a261', '#111111'];

/** Personnage en vue de face, proportions adultes (tête ≈ 1/7 de la taille). */
export function Person({ p }: { p: Pop }) {
  const skin = SKINS[p.look % SKINS.length];
  const hair = p.kind === 'elder' ? '#e8e8e8' : HAIRS[(p.look >> 2) % HAIRS.length];
  const top = TOPS[(p.look >> 1) % TOPS.length];
  const pants = PANTS[(p.look >> 3) % PANTS.length];
  const cap = CAPS[(p.look >> 4) % CAPS.length];
  const small = p.kind === 'small';
  const dress = small && p.girl && p.look % 2 === 0; // robe ; sinon jupe pour les petites femmes
  const O = '#2b1d14';
  return (
    <svg viewBox="0 0 60 160" className="ds-svg" aria-hidden>
      <g stroke={O} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        {/* jambes */}
        {small && p.girl
          ? <><rect x="22" y="104" width="6" height="44" rx="3" fill={skin} /><rect x="32" y="104" width="6" height="44" rx="3" fill={skin} /></>
          : <><rect x="20" y="92" width="9" height="56" rx="3" fill={pants} /><rect x="31" y="92" width="9" height="56" rx="3" fill={pants} /></>}
        {/* chaussures */}
        <path d="M17 146 h12 v6 h-14 q0-6 2-6 Z" fill="#1b1b1b" /><path d="M31 146 h12 q2 0 2 6 h-14 Z" fill="#1b1b1b" />
        {/* bras */}
        <rect x="9" y="50" width="7" height="44" rx="3.5" fill={top} />
        <rect x="44" y="50" width="7" height={small ? 30 : 44} rx="3.5" fill={top} transform={small ? 'rotate(-35 47 52)' : undefined} />
        <circle cx="12.5" cy="96" r="4" fill={skin} />
        {/* buste */}
        {dress
          ? <path d="M16 48 h28 l8 62 h-44 Z" fill={top} />
          : <rect x="15" y="47" width="30" height="48" rx="7" fill={top} />}
        {small && p.girl && !dress && <path d="M15 90 h30 l7 22 h-44 Z" fill={pants === '#3d3d3d' ? '#d6336c' : '#3d3d3d'} />}
        {/* cou + tête (petite par rapport au corps : adulte) */}
        <rect x="26" y="37" width="8" height="11" fill={skin} />
        {p.girl && p.kind !== 'elder' && <path d="M17 26 q13 -24 26 0 v22 h-6 v-14 h-14 v14 h-6 Z" fill={hair} />}
        <circle cx="30" cy="25" r="12.5" fill={skin} />
        {/* cheveux */}
        {p.kind === 'elder'
          ? <path d="M17.5 24 q2 -9 6 -10 M42.5 24 q-2 -9 -6 -10" fill="none" stroke={hair} strokeWidth="5" />
          : !p.girl && <path d="M17.5 23 q1 -14 12.5 -14 q11.5 0 12.5 14 q-6 -6 -12.5 -6 q-6.5 0 -12.5 6 Z" fill={hair} />}
        {p.girl && p.kind !== 'elder' && <path d="M17.5 22 q2 -13 12.5 -13 q10.5 0 12.5 13 q-8 -7 -18 -4 Z" fill={hair} />}
        {/* casquette des petits hommes */}
        {small && !p.girl && <><path d="M17 20 q0 -12 13 -12 q13 0 13 12 Z" fill={cap} /><path d="M30 19 h18 q2 0 1 3 h-19 Z" fill={cap} /></>}
      </g>
      {/* visage */}
      <circle cx="25.5" cy="25" r="1.6" fill={O} /><circle cx="34.5" cy="25" r="1.6" fill={O} />
      <path d="M26 31 q4 3 8 0" fill="none" stroke={O} strokeWidth="1.6" strokeLinecap="round" />
      {!p.girl && p.kind !== 'elder' && (p.look % 3 === 0) && <path d="M21 29 q9 12 18 0 q-2 8 -9 8 q-7 0 -9 -8 Z" fill={hair} opacity=".85" />}
      {p.kind === 'elder' && <g fill="none" stroke={O} strokeWidth="1.4"><circle cx="25.5" cy="25" r="4" /><circle cx="34.5" cy="25" r="4" /><path d="M29.5 25 h1" /></g>}
      {p.kind === 'elder' && <path d="M52 92 v58 M52 92 q0 -6 -6 -6" fill="none" stroke="#7a4b23" strokeWidth="3.5" strokeLinecap="round" />}
      {/* verre à cocktail des petits adultes */}
      {small && (
        <g stroke={O} strokeWidth="1.6" strokeLinejoin="round" transform="translate(52 30)">
          <path d="M-7 0 h14 l-7 9 Z" fill="#9be7ff" />
          <path d="M0 9 v8 M-4 17 h8" fill="none" />
          <circle cx="4" cy="-1" r="2.4" fill="#e63946" />
        </g>
      )}
    </svg>
  );
}

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
      if (n >= next.current && list.length < 7) {
        next.current = n + 600 - 300 * k;
        const r = Math.random();
        const kind: Kind = r < 0.42 ? 'small' : r < 0.74 ? 'tall' : 'elder';
        const h = kind === 'small' ? 30 : kind === 'tall' ? 56 : 50; // hauteur en % de la largeur
        const w = h * 0.375;
        // une place libre au hasard (sans trop chevaucher les autres)
        let x = 0, y = 0;
        for (let tries = 0; tries < 12; tries++) {
          x = Math.random() * (FIELD_W - w);
          y = h + Math.random() * (FIELD_H - h); // y = position des pieds
          if (!list.some((o) => Math.abs(o.x + o.h * 0.19 - (x + w / 2)) < (o.h * 0.375 + w) / 2 && Math.abs((o.y - o.h / 2) - (y - h / 2)) < (o.h + h) / 2.2)) break;
        }
        list = [...list, { id: nid.current++, kind, girl: Math.random() < 0.5, x, y, h, look: Math.floor(Math.random() * 1000), born: n, until: n + 1500 - 550 * k }];
      }
      if (list.length !== popsRef.current.length || list.some((p, i) => p !== popsRef.current[i])) { popsRef.current = list; setPops(list); }
    }, 50);
    return () => clearInterval(id);
  }, [startAt, stopAt, onFinish]);

  const tap = (p: Pop) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (p.hit || done.current || Date.now() < startAt) return;
    const ok = p.kind === 'small';
    scoreRef.current = Math.max(0, scoreRef.current + (ok ? 1 : -1));
    setScore(scoreRef.current);
    setFlash(ok ? 'ok' : 'bad');
    setTimeout(() => setFlash(null), 160);
    navigator.vibrate?.(ok ? 10 : 80);
    popsRef.current = popsRef.current.map((x) => (x.id === p.id ? { ...x, hit: ok ? 'ok' as const : 'bad' as const, until: Date.now() } : x));
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
      <div className="small muted center">Touche seulement les <b>petits</b> : casquette 🧢 ou robe/jupe 👗, et un cocktail 🍸 à la main. Pas les grands, pas les papis-mamies !</div>
      <div className="ds-field">
        {pops.map((p) => (
          <div key={p.id} className={`ds-person ds-${p.kind} ${p.hit ? `ds-hit-${p.hit}` : ''}`} onPointerDown={tap(p)}
            style={{ left: `${p.x}%`, top: `${((p.y - p.h) / FIELD_H) * 100}%`, width: `${p.h * 0.375}%`, height: `${(p.h / FIELD_H) * 100}%` }}>
            <Person p={p} />
            {p.hit === 'ok' && <span className="ds-fx">+1 💘</span>}
            {p.hit === 'bad' && <span className="ds-fx bad">−1</span>}
          </div>
        ))}
        {now < startAt && <div className="mg-overlay"><div className="mg-count anim-pop" key={left}>{left || 'GO'}</div></div>}
        {now >= stopAt && <div className="mg-overlay"><div className="mg-count" style={{ fontSize: '2em' }}>Terminé !<br />{score} 💘</div></div>}
      </div>
    </div>
  );
}
