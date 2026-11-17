// « Maxime pendant l'ellipse » : course sans fin (inspirée du petit jeu de repos de Road2Fit).
// - burgers, frites, pizzas… au sol : SAUTER
// - tacos français (plus haut qu'un saut) : DOUBLE SAUT — rare, annoncé, avec de la place avant et après
// - enseignes de fast-food suspendues : SE BAISSER
// Plus on court (score), plus Maxime maigrit. 3 vies ; la partie s'arrête à 0 vie ou à la fin du temps.
import { useEffect, useRef, useState } from 'react';
import type { MinigameProps } from './index';
import { drawMaxime, drawScene, drawShadow, drawSign, makeRunnerSprites, maximeBox } from './runnerArt';

const W = 360;
const H = 360;
const GROUND = 318;
const PX = 64; // position horizontale du joueur
const GRAVITY = 0.0028;
const JUMP_V = -0.64; // un saut ≈ 73 px
const TACO_H = 80; // un peu plus haut qu'un saut simple (≈ 73 px) → double saut
const SIGN_BOTTOM = GROUND - 54; // bas de l'enseigne : debout (74 px) on la prend, baissé (44 px) on passe
const COUNTDOWN = 3000;
const SAFETY = 700;
const SWIPE = 18;
const THIN_AT = 700; // score où Maxime a fini de maigrir
const N_FOODS = 5;
const N_SIGNS = 4;

type Obs = { kind: 'food' | 'tacos' | 'sign'; x: number; w: number; v: number };
interface Dust { x: number; y: number; t: number }
interface St { lastTacos: number; nextKind: 'food' | 'sign' | 'tacos'; dust: Dust[]; t: number; dist: number; speed: number; y: number; vy: number; duck: boolean; doubled: boolean; obs: Obs[]; nextIn: number; lives: number; inv: number; over: boolean; pops: { text: string; t: number }[]; lastStage: number }
const fresh = (): St => ({ lastTacos: -99999, nextKind: 'food', dust: [], t: 0, dist: 0, speed: 0.24, y: 0, vy: 0, duck: false, doubled: false, obs: [], nextIn: 1200, lives: 3, inv: 0, over: false, pops: [], lastStage: 0 });

export function MaximeRunner({ endsAt, onFinish }: MinigameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const st = useRef<St>(fresh());
  const [t0] = useState(() => Date.now());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [phase, setPhase] = useState<'count' | 'run' | 'over'>('count');
  const done = useRef(false);
  const swipe = useRef<{ y: number; done: false | 'up' | 'up2' | 'down'; id: number; armed?: boolean } | null>(null);
  const finish = () => { if (done.current) return; done.current = true; st.current.over = true; setPhase('over'); onFinish(Math.floor(st.current.dist / 10)); };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  const jump = () => {
    const s = st.current;
    if (s.over || Date.now() < t0 + COUNTDOWN) return;
    if (s.y === 0) { s.vy = JUMP_V; s.duck = false; s.doubled = false; }
    else if (!s.doubled) { s.vy = JUMP_V; s.doubled = true; }
  };
  const setDuck = (v: boolean) => { const s = st.current; if (s.over) return; s.duck = v; if (v && s.y < 0) s.vy = Math.max(s.vy, 0.6); };

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } if (e.code === 'ArrowDown') { e.preventDefault(); setDuck(true); } };
    const up = (e: KeyboardEvent) => { if (e.code === 'ArrowDown') setDuck(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0;
    let last = 0;
    let lastScore = -1;

    const sp = makeRunnerSprites(dpr);
    const fat = (s: St) => Math.max(0, 1 - s.dist / 10 / THIN_AT); // 1 = gros, 0 = mince
    const foodW = (v: number) => sp.foods[v % N_FOODS].w;

    const drawObs = (o: Obs) => {
      if (o.kind === 'food') { const f = sp.foods[o.v % N_FOODS]; ctx.drawImage(f.cv, o.x, GROUND + 3 - f.h, f.w, f.h); }
      else if (o.kind === 'tacos') ctx.drawImage(sp.tacos.cv, o.x, GROUND + 4 - sp.tacos.h, sp.tacos.w, sp.tacos.h);
      else drawSign(ctx, sp.signs[o.v % N_SIGNS], o.x, SIGN_BOTTOM - sp.signs[0].h);
    };

    const hits = (s: St, o: Obs) => {
      const ducking = s.duck && s.y === 0;
      const box = maximeBox(fat(s), ducking);
      const top = GROUND + s.y - box.h;
      const bottom = GROUND + s.y;
      const left = PX - box.hw, right = PX + box.hw + 6;
      if (right < o.x + 6 || left > o.x + o.w - 6) return false;
      if (o.kind === 'food') return bottom > GROUND - (sp.foods[o.v % N_FOODS].h - 10);
      if (o.kind === 'tacos') return bottom > GROUND - TACO_H + 2; // un saut simple (73 px) ne suffit pas
      return top < SIGN_BOTTOM - 3;
    };

    const frame = (now: number) => {
      const s = st.current;
      const dt = last ? Math.min(40, now - last) : 16;
      last = now;
      const wall = Date.now();
      if (wall >= endsAt - SAFETY && !s.over) finishRef.current();
      const running = wall >= t0 + COUNTDOWN && !s.over;
      if (running && phase !== 'run') setPhase('run');
      if (running) {
        s.t += dt;
        // vitesse : douce au début, accélère avec le temps
        s.speed = Math.min(0.78, 0.2 + s.t / 120000); // continue d'accélérer (partie sans limite de temps)
        s.dist += s.speed * dt;
        if (s.y < 0 || s.vy < 0) {
          s.vy += GRAVITY * dt; s.y = Math.min(0, s.y + s.vy * dt);
          if (s.y === 0) { s.vy = 0; s.doubled = false; s.dust.push({ x: PX - 6, y: GROUND, t: wall }, { x: PX + 10, y: GROUND, t: wall }); }
        }
        s.nextIn -= dt;
        if (s.nextIn <= 0) {
          const kind = s.nextKind;
          const v = Math.floor(Math.random() * 20);
          s.obs.push(kind === 'tacos' ? { kind: 'tacos', x: W + 10, w: sp.tacos.w, v: 0 } : kind === 'sign' ? { kind: 'sign', x: W + 10, w: sp.signs[0].w, v } : { kind: 'food', x: W + 10, w: foodW(v), v });
          if (kind === 'tacos') s.lastTacos = s.t;
          // prochain obstacle : choisi d'avance pour laisser de la place AVANT un tacos
          const d = Math.min(1, s.t / 60000); // 0 → 1 : la difficulté monte sur une minute
          const r = Math.random();
          const tacosChance = 0.06 + 0.1 * d;
          const canTacos = s.t > 12000 && s.t - s.lastTacos > 9000 - 3000 * d && kind !== 'tacos';
          s.nextKind = canTacos && r < tacosChance ? 'tacos' : s.t > 5000 && r < 0.45 + 0.1 * d ? 'sign' : 'food';
          // écart entre obstacles (en ms) : large au début, plus serré ensuite ; beaucoup d'air autour des tacos
          let gap = (1300 - 550 * d + Math.random() * (900 - 400 * d)) * Math.max(0.65, 1 - Math.max(0, s.t - 60000) / 240000);
          if (kind === 'tacos') gap += 1300 - 300 * d;        // après un tacos : on a le temps d'atterrir
          if (s.nextKind === 'tacos') gap += 1100 - 300 * d;  // avant un tacos : piste dégagée
          s.nextIn = gap;
        }
        s.obs.forEach((o) => { o.x -= s.speed * dt; });
        s.obs = s.obs.filter((o) => o.x + o.w > -10);
        if (s.inv < wall) {
          const hit = s.obs.find((o) => hits(s, o));
          if (hit) {
            s.lives -= 1;
            s.inv = wall + 1500;
            s.obs = s.obs.filter((o) => o !== hit);
            setLives(s.lives);
            navigator.vibrate?.(150);
            if (s.lives <= 0) finishRef.current();
          }
        }
        const sc = Math.floor(s.dist / 10);
        const stage = Math.floor(sc / 100);
        if (stage > s.lastStage) { s.lastStage = stage; s.pops.push({ text: fat(s) > 0 ? '−5 kg !' : 'Affûté 💪', t: wall }); }
        if (sc !== lastScore) { lastScore = sc; setScore(sc); }
      }
      // dessin
      ctx.globalAlpha = 1;
      drawScene(ctx, s.dist, W, H, GROUND);
      s.obs.forEach(drawObs);
      // poussière à l'atterrissage
      s.dust = s.dust.filter((d) => wall - d.t < 400);
      for (const d of s.dust) { const k = (wall - d.t) / 400; ctx.fillStyle = `rgba(160,150,140,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(d.x - k * 10, d.y - k * 6, 3 + k * 6, 0, 7); ctx.fill(); }
      const f = fat(s);
      drawShadow(ctx, PX, GROUND, -s.y, f);
      const blink = s.inv > wall && Math.floor(wall / 90) % 2 === 1;
      if (!blink) drawMaxime(ctx, PX, GROUND + s.y, { fat: f, t: s.t, air: s.y < 0, duck: s.duck, vy: s.vy });
      if (s.inv > wall && !blink) { ctx.fillStyle = 'rgba(255,60,60,.12)'; ctx.fillRect(0, 0, W, H); }
      // annonce : un tacos arrive → double saut
      const tc = s.obs.find((o) => o.kind === 'tacos' && o.x > PX && o.x - PX < 260);
      if (tc && !s.over) {
        const a = Math.min(1, (260 - (tc.x - PX)) / 60);
        ctx.save(); ctx.globalAlpha = a;
        ctx.font = '900 20px "Arial Black", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.strokeText('⬆⬆ DOUBLE SAUT !', W / 2, 40);
        ctx.fillStyle = '#d62828'; ctx.fillText('⬆⬆ DOUBLE SAUT !', W / 2, 40);
        ctx.restore();
      }
      // messages « −5 kg ! »
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      s.pops = s.pops.filter((p) => wall - p.t < 1300);
      for (const p of s.pops) {
        const k = (wall - p.t) / 1300;
        ctx.globalAlpha = 1 - k * k;
        ctx.font = '900 24px "Arial Black", Arial, sans-serif';
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeText(p.text, PX + 40, GROUND - 110 - k * 40);
        ctx.fillStyle = '#1aa36f'; ctx.fillText(p.text, PX + 40, GROUND - 110 - k * 40);
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, t0]);

  // fin du temps : envoyé même si l'animation est suspendue (écran verrouillé, autre appli…)
  useEffect(() => {
    const id = setInterval(() => { if (Date.now() >= endsAt - SAFETY) finishRef.current(); }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const count = Math.max(0, Math.ceil((t0 + COUNTDOWN - Date.now()) / 1000));
  const [, force] = useState(0);
  useEffect(() => { if (phase !== 'count') return; const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, [phase]);

  return (
    <div className="mg-runner">
      <div className="mg-runner-top">
        <span className="mg-lives">{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 3 - lives))}</span>
        <b>{score} m</b>
      </div>
      <div className="mg-runner-area"
        onPointerDown={(e) => { swipe.current = { y: e.clientY, done: false, id: e.pointerId }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* rien */ } }}
        onPointerMove={(e) => {
          const sw = swipe.current;
          if (!sw || sw.id !== e.pointerId) return;
          const dy = e.clientY - sw.y;
          if (!sw.done && dy < -SWIPE) { sw.done = 'up'; sw.y = e.clientY; sw.armed = false; jump(); }
          else if (sw.done === 'up') {
            // double saut dans le même geste : le doigt redescend un peu, puis remonte
            if (e.clientY < sw.y && !sw.armed) sw.y = e.clientY; // on suit le point le plus haut
            else if (e.clientY - sw.y > 10) { sw.armed = true; sw.y = e.clientY; }
            else if (sw.armed && e.clientY < sw.y) sw.y = Math.max(sw.y, e.clientY);
            if (sw.armed && sw.y - e.clientY > SWIPE) { sw.done = 'up2'; jump(); }
            if (sw.armed && e.clientY > sw.y) sw.y = e.clientY; // point le plus bas avant de remonter
          }
          else if (!sw.done && dy > SWIPE) { sw.done = 'down'; setDuck(true); }
        }}
        onPointerUp={() => { const sw = swipe.current; swipe.current = null; if (!sw) return; if (sw.done === 'down') setDuck(false); else if (!sw.done) jump(); }}
        onPointerCancel={() => { const sw = swipe.current; swipe.current = null; if (sw?.done === 'down') setDuck(false); }}>
        <canvas ref={canvas} style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block', borderRadius: 16 }} />
        {phase === 'count' && <div className="mg-overlay"><div className="mg-count anim-pop" key={count}>{count || 'GO'}</div></div>}
        {phase === 'over' && <div className="mg-overlay"><div className="mg-count" style={{ fontSize: '2em' }}>{lives <= 0 ? 'Plus de vies !' : 'Temps écoulé !'}<br />{score} m</div></div>}
      </div>
      <div className="mg-runner-btns">
        <button type="button" className="btn mg-btn" onPointerDown={(e) => { e.preventDefault(); setDuck(true); }} onPointerUp={() => setDuck(false)} onPointerLeave={() => setDuck(false)} onPointerCancel={() => setDuck(false)}>⬇ Se baisser</button>
        <button type="button" className="btn mg-btn" onPointerDown={(e) => { e.preventDefault(); jump(); }}>⬆ Sauter</button>
      </div>
      <div className="small muted center">Glisse vers le haut : sauter · re-glisse vers le haut en l’air : double saut (tacos) · glisse vers le bas et garde le doigt : se baisser</div>
    </div>
  );
}
