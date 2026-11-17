// « Calcul mental extrêmement sérieux… » : 10 calculs de plus en plus farfelus à résoudre le plus vite possible… ils valent tous 67.
// Pavé numérique à l'écran (pas de clavier du téléphone). 2 chiffres tapés : bon → calcul suivant, faux → on recommence.
// Score : 100 par calcul réussi + bonus de temps restant si les 10 sont faits (plus on finit vite, plus on gagne).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MinigameProps } from './index';
import { drawCalculs } from './calculs';

const COUNTDOWN = 3000;
const SAFETY = 700;
const ANSWER = '67';

export function CalculMental({ endsAt, onFinish }: MinigameProps) {
  const calculs = useMemo(() => drawCalculs(), []);
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);
  const [good, setGood] = useState(0);
  const [doneAt, setDoneAt] = useState(0);
  const done = useRef(false);
  const wrongRef = useRef(false);
  const idxRef = useRef(0);
  const typedRef = useRef(''); // saisie à jour même si deux touches arrivent dans la même image
  const type = (v: string) => { typedRef.current = v; setTyped(v); };
  const startAt = t0 + COUNTDOWN;
  const stopAt = endsAt - SAFETY;

  const score = (solved: number, at: number) => solved * 100 + (solved === calculs.length ? Math.max(0, Math.round((stopAt - at) / 100)) : 0);
  const finish = (solved: number, at: number) => { if (done.current) return; done.current = true; onFinish(score(solved, at)); };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= stopAt) finishRef.current(idxRef.current, n);
    }, 100);
    return () => clearInterval(id);
  }, [stopAt]);

  const press = (k: string) => {
    if (done.current || Date.now() < startAt || wrongRef.current) return;
    navigator.vibrate?.(5);
    if (k === '⌫') { type(typedRef.current.slice(0, -1)); return; }
    const next = (typedRef.current + k).slice(0, 4);
    if (next.length < ANSWER.length) { type(next); return; }
    if (next === ANSWER) {
      const i = idxRef.current + 1;
      idxRef.current = i;
      setIdx(i);
      type('');
      setGood((g) => g + 1);
      if (i >= calculs.length) { const at = Date.now(); setDoneAt(at); finishRef.current(i, at); }
    } else {
      type(next);
      wrongRef.current = true;
      setWrong(true);
      navigator.vibrate?.(90);
      setTimeout(() => { wrongRef.current = false; setWrong(false); type(''); }, 350);
    }
  };

  const playing = now >= startAt && !done.current;
  const left = Math.max(0, Math.ceil((startAt - now) / 1000));
  const progress = Math.min(1, Math.max(0, (now - startAt) / Math.max(1, stopAt - startAt)));
  const finished = idx >= calculs.length;
  const elapsed = ((doneAt || now) - startAt) / 1000;

  return (
    <div className={`mg-calc ${wrong ? 'mg-wrong' : ''}`}>
      <div className="mg-67-top">
        <div className="mg-bar"><i style={{ width: `${(1 - progress) * 100}%` }} /></div>
        <div className="mg-67-score"><b>{Math.min(idx + 1, calculs.length)}</b><span>/ {calculs.length}</span></div>
      </div>
      <div className="mc-steps">{calculs.map((_, i) => <i key={i} className={i < idx ? 'ok' : i === idx ? 'cur' : ''} />)}</div>
      <div className="mc-card">
        {now < startAt
          ? <div className="mg-count anim-pop" key={left}>{left || 'GO'}</div>
          : finished
            ? <div className="mc-done anim-pop">🧠 10/10 en {elapsed.toFixed(1)} s !</div>
            : done.current
              ? <div className="mc-done">Temps écoulé ! {idx}/10</div>
              : <>
                  <div className="mc-level">Calcul {idx + 1}</div>
                  <div className="mc-expr anim-pop" key={idx}>{calculs[idx].text}</div>
                  <div className={`mc-answer ${wrong ? 'bad' : ''}`}>= {typed || <span className="muted">?</span>}</div>
                </>}
        {good > 0 && !finished && <div className="mc-good" key={good}>67 ✔</div>}
      </div>
      <div className={`mc-pad ${playing && !finished ? '' : 'off'}`}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
          k ? <button key={i} type="button" className="mc-key" onPointerDown={(e) => { e.preventDefault(); press(k); }}>{k}</button> : <span key={i} />
        ))}
      </div>
    </div>
  );
}
