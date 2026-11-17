// « Maxime pendant l'ellipse » : course sans fin (inspirée du petit jeu de repos de Road2Fit).
// - burgers, frites, pizzas… au sol : SAUTER
// - pile de tacos (plus haute qu'un saut) : DOUBLE SAUT
// - enseignes de fast-food suspendues : SE BAISSER
// Plus on court (score), plus Maxime maigrit. 3 vies ; la partie s'arrête à 0 vie ou à la fin du temps.
import { useEffect, useRef, useState } from 'react';
import type { MinigameProps } from './index';

const W = 360;
const H = 360;
const GROUND = 318;
const PX = 64; // position horizontale du joueur
const GRAVITY = 0.0028;
const JUMP_V = -0.64; // un saut ≈ 73 px
const TACO_H = 86; // plus haut qu'un saut simple → double saut
const SIGN_BOTTOM = GROUND - 40; // bas de l'enseigne : debout on la prend, baissé on passe
const COUNTDOWN = 3000;
const SAFETY = 700;
const SWIPE = 18;
const THIN_AT = 700; // score où Maxime a fini de maigrir
const FOODS = ['🍔', '🍟', '🍕', '🌭', '🍗', '🍩'];
const SIGNS = [
  { text: 'M', bg: '#da291c', fg: '#ffc72c', font: 'bold 30px Arial Black, sans-serif' },
  { text: 'BK', bg: '#f5ebdc', fg: '#d62300', font: 'bold 22px Arial Black, sans-serif', round: true },
  { text: 'KFC', bg: '#a3080c', fg: '#ffffff', font: 'bold 20px Arial Black, sans-serif' },
  { text: 'SUBWAY', bg: '#008938', fg: '#ffc600', font: 'bold 13px Arial Black, sans-serif' },
];

type Obs = { kind: 'food' | 'tacos' | 'sign'; x: number; w: number; v: number };
interface St { t: number; dist: number; speed: number; y: number; vy: number; duck: boolean; doubled: boolean; obs: Obs[]; nextIn: number; lives: number; inv: number; over: boolean; pops: { text: string; t: number }[]; lastStage: number }
const fresh = (): St => ({ t: 0, dist: 0, speed: 0.24, y: 0, vy: 0, duck: false, doubled: false, obs: [], nextIn: 1200, lives: 3, inv: 0, over: false, pops: [], lastStage: 0 });

export function MaximeRunner({ endsAt, onFinish }: MinigameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const st = useRef<St>(fresh());
  const [t0] = useState(() => Date.now());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [phase, setPhase] = useState<'count' | 'run' | 'over'>('count');
  const done = useRef(false);
  const swipe = useRef<{ y: number; done: false | 'up' | 'down'; id: number } | null>(null);
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

    const fat = (s: St) => Math.max(0, 1 - s.dist / 10 / THIN_AT); // 1 = gros, 0 = mince
    const bodyW = (s: St) => 12 + 22 * fat(s); // demi-largeur du ventre
    const standH = 50;
    const duckH = 30;

    const drawPlayer = (s: St, now: number) => {
      if (s.inv > now && Math.floor(now / 100) % 2) return; // clignote après un choc
      const f = fat(s);
      const bw = bodyW(s);
      const base = GROUND + s.y;
      const ducking = s.duck && s.y === 0;
      const h = ducking ? duckH : standH;
      const step = Math.floor(s.t / 110) % 2;
      ctx.save();
      ctx.lineCap = 'round';
      // jambes
      ctx.strokeStyle = '#2d3a8c'; ctx.lineWidth = 6 + 3 * f;
      const hip = base - 12;
      if (s.y < 0) { line(PX - 5, hip, PX - 10, base - 3); line(PX + 5, hip, PX + 12, base - 6); }
      else if (step) { line(PX - 5, hip, PX - 12, base); line(PX + 5, hip, PX + 6, base); }
      else { line(PX - 5, hip, PX - 3, base); line(PX + 5, hip, PX + 13, base - 2); }
      // ventre / t-shirt
      const cy = base - (ducking ? 18 : 26);
      ctx.fillStyle = '#ff6a3d';
      ctx.beginPath(); ctx.ellipse(PX, cy, bw, (h - 18) / 2 + 4 * f, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.ellipse(PX + bw * 0.25, cy - 3, bw * 0.45, (h - 18) / 4, 0, 0, Math.PI * 2); ctx.fill();
      // bras
      ctx.strokeStyle = '#f2c09b'; ctx.lineWidth = 5 + 2 * f;
      const armY = cy - 4;
      line(PX + bw - 3, armY, PX + bw + 9, armY + (step ? -8 : 6));
      // tête
      const hx = PX + (ducking ? bw * 0.7 : 2), hy = cy - (ducking ? 4 : (h - 18) / 2 + 4 * f + 9);
      const hr = 10 + 3 * f;
      ctx.fillStyle = '#f2c09b';
      ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
      if (f > 0.15) { ctx.beginPath(); ctx.ellipse(hx + 1, hy + hr * 0.75, hr * 0.8 * f + 2, hr * 0.35 * f + 1, 0, 0, Math.PI * 2); ctx.fill(); } // double menton
      ctx.fillStyle = '#4a2f1b';
      ctx.beginPath(); ctx.arc(hx, hy - 3, hr, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); // cheveux
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(hx + 5, hy - 1, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hx + 4, hy + 4, 3, 0.1, Math.PI * 0.8); ctx.stroke(); // sourire
      ctx.restore();
    };
    function line(x1: number, y1: number, x2: number, y2: number) { ctx!.beginPath(); ctx!.moveTo(x1, y1); ctx!.lineTo(x2, y2); ctx!.stroke(); }

    const drawObs = (o: Obs) => {
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      if (o.kind === 'food') {
        ctx.font = '34px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        ctx.fillText(FOODS[o.v % FOODS.length], o.x + o.w / 2, GROUND + 4);
      } else if (o.kind === 'tacos') {
        ctx.font = '32px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        for (let i = 0; i < 3; i++) ctx.fillText('🌮', o.x + o.w / 2 + (i % 2 ? 3 : -3), GROUND + 4 - i * 28);
      } else {
        const sg = SIGNS[o.v % SIGNS.length];
        const top = SIGN_BOTTOM - 44;
        ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
        line(o.x + 10, 0, o.x + 10, top); line(o.x + o.w - 10, 0, o.x + o.w - 10, top);
        ctx.fillStyle = sg.bg;
        if (sg.round) { ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, top + 22, o.w / 2, 22, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.roundRect(o.x, top, o.w, 44, 8); ctx.fill(); }
        ctx.fillStyle = sg.fg; ctx.font = sg.font; ctx.textBaseline = 'middle';
        ctx.fillText(sg.text, o.x + o.w / 2, top + 23);
      }
      ctx.restore();
    };

    const hits = (s: St, o: Obs) => {
      const bw = bodyW(s) * 0.8;
      const ducking = s.duck && s.y === 0;
      const top = GROUND + s.y - (ducking ? duckH : standH + 8);
      const bottom = GROUND + s.y;
      const left = PX - bw, right = PX + bw;
      if (right < o.x + 4 || left > o.x + o.w - 4) return false;
      if (o.kind === 'food') return bottom > GROUND - 26;
      if (o.kind === 'tacos') return bottom > GROUND - TACO_H + 6;
      return top < SIGN_BOTTOM - 2;
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
        s.speed = Math.min(0.6, 0.24 + s.t / 80000);
        s.dist += s.speed * dt;
        if (s.y < 0 || s.vy < 0) { s.vy += GRAVITY * dt; s.y = Math.min(0, s.y + s.vy * dt); if (s.y === 0) { s.vy = 0; s.doubled = false; } }
        s.nextIn -= dt;
        if (s.nextIn <= 0) {
          const r = Math.random();
          const tacos = s.t > 6000 && r < 0.2;
          const sign = !tacos && s.t > 3000 && r < 0.5;
          s.obs.push(tacos ? { kind: 'tacos', x: W + 10, w: 40, v: 0 } : sign ? { kind: 'sign', x: W + 10, w: 70, v: Math.floor(Math.random() * SIGNS.length) } : { kind: 'food', x: W + 10, w: 34, v: Math.floor(Math.random() * FOODS.length) });
          s.nextIn = 700 + (tacos ? 450 : 0) + Math.random() * 900 * (0.3 / s.speed);
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
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#ffe7c2'); sky.addColorStop(1, '#ffd08a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#c8874a'; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      for (let i = 0; i < 9; i++) { const x = ((i * 47 - s.dist * 0.9) % W + W) % W; ctx.fillRect(x, GROUND + 12, 14, 3); }
      s.obs.forEach(drawObs);
      drawPlayer(s, wall);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      s.pops = s.pops.filter((p) => wall - p.t < 1200);
      for (const p of s.pops) {
        const k = (wall - p.t) / 1200;
        ctx.globalAlpha = 1 - k; ctx.fillStyle = '#20b486'; ctx.font = 'bold 22px sans-serif';
        ctx.fillText(p.text, PX + 20, GROUND - 90 - k * 40);
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
          if (!sw.done && dy < -SWIPE) { sw.done = 'up'; jump(); }
          else if (sw.done !== 'down' && dy > SWIPE) { sw.done = 'down'; setDuck(true); }
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
      <div className="small muted center">Touche ou glisse vers le haut : sauter (2 fois pour les tacos) · glisse vers le bas : se baisser</div>
    </div>
  );
}
