// « Belos vs Spiders » : survie en vue du dessus dans une grotte.
// Belos (spartiate doré) se déplace au joystick (en bas à droite) et esquive les araignées qui traversent l'écran
// (petites = rapides, grosses = lentes). Certaines laissent des toiles qui ralentissent. Des potions rouges laissent
// du verre au sol : en y entrant puis à chaque seconde passée dedans, Belos perd 5 % de vitesse pour le reste de la partie. 3 vies ; 10 points par seconde.
import { useEffect, useRef, useState } from 'react';
import type { MinigameProps } from './index';
import { drawBelos, drawGlass, drawJoystick, drawPotion, drawSpider, drawTarget, drawTorches, drawWeb, makeCave, SKINS } from './belosArt';

const W = 360;
const H = 480;
const COUNTDOWN = 3000;
const SAFETY = 700;
const PR = 14; // rayon de Belos
const SPEED = 0.15; // px/ms à fond
const JOY = { x: W - 62, y: H - 62, R: 44 };
const GLASS_SLOW = 0.95; // vitesse gardée à chaque entrée dans le verre (−5 %)

interface Spider { x: number; y: number; vx: number; vy: number; r: number; skin: number; webber: boolean; lastWeb: number }
interface Web { x: number; y: number; r: number; born: number; seed: number }
interface Potion { x0: number; y0: number; x1: number; y1: number; born: number; dur: number }
interface Glass { id: number; x: number; y: number; r: number; born: number; seed: number }
interface St {
  t: number; x: number; y: number; angle: number; moving: boolean; spiders: Spider[]; webs: Web[]; potions: Potion[]; glass: Glass[];
  nextSpider: number; nextPotion: number; lives: number; inv: number; slow: number; inside: number[]; inT: number; cut: number; pops: { text: string; t: number }[]; over: boolean; seed: number;
}
const fresh = (): St => ({ t: 0, x: W / 2, y: H / 2, angle: -Math.PI / 2, moving: false, spiders: [], webs: [], potions: [], glass: [], nextSpider: 800, nextPotion: 7000, lives: 3, inv: 0, slow: 1, inside: [], inT: 0, cut: 0, pops: [], over: false, seed: 1 });

export function BelosSpiders({ endsAt, onFinish }: MinigameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const st = useRef<St>(fresh());
  const [t0] = useState(() => Date.now());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [speedPct, setSpeedPct] = useState(100);
  const [phase, setPhase] = useState<'count' | 'run' | 'over'>('count');
  const done = useRef(false);
  const stick = useRef({ dx: 0, dy: 0, id: -1 });
  const keys = useRef(new Set<string>());
  const pts = () => Math.floor(st.current.t / 100); // 10 points par seconde
  const finish = () => { if (done.current) return; done.current = true; st.current.over = true; setPhase('over'); onFinish(pts()); };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // clavier (ordinateur) : flèches ou ZQSD/WASD
  useEffect(() => {
    const down = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'z', 'q', 's', 'd', 'w', 'a'].includes(k)) { e.preventDefault(); keys.current.add(k); } };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // fin du temps : envoyé même si l'animation est suspendue
  useEffect(() => {
    const id = setInterval(() => { if (Date.now() >= endsAt - SAFETY) finishRef.current(); }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  // joystick : coordonnées du canvas
  const toCanvas = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const moveStick = (e: React.PointerEvent) => {
    const p = toCanvas(e);
    let dx = (p.x - JOY.x) / JOY.R, dy = (p.y - JOY.y) / JOY.R;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    stick.current.dx = dx; stick.current.dy = dy;
  };
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const p = toCanvas(e);
    // le joystick s'attrape dans le quart en bas à droite (zone large pour le pouce)
    if (p.x < W * 0.45 || p.y < H * 0.55) return;
    stick.current.id = e.pointerId;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* rien */ }
    moveStick(e);
  };
  const onMove = (e: React.PointerEvent) => { if (stick.current.id === e.pointerId) moveStick(e); };
  const onUp = (e: React.PointerEvent) => { if (stick.current.id === e.pointerId) stick.current = { dx: 0, dy: 0, id: -1 }; };

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cave = makeCave(W, H, dpr);
    let raf = 0, last = 0, lastPts = -1;

    const spawnSpider = (s: St, d: number) => {
      const r = 7 + Math.random() * 18; // taille
      const sp = (0.06 + 1.25 / r) * (1 + 0.45 * d); // petit = rapide
      const side = Math.floor(Math.random() * 4);
      const x = side === 0 ? -30 : side === 1 ? W + 30 : Math.random() * W;
      const y = side === 2 ? -30 : side === 3 ? H + 30 : Math.random() * H;
      // vise à peu près Belos (avec du jeu), puis continue tout droit
      const tx = s.x + (Math.random() - 0.5) * 160, ty = s.y + (Math.random() - 0.5) * 160;
      const m = Math.hypot(tx - x, ty - y) || 1;
      s.spiders.push({ x, y, vx: ((tx - x) / m) * sp, vy: ((ty - y) / m) * sp, r, skin: Math.floor(Math.random() * SKINS.length), webber: r > 11 && Math.random() < 0.4 + 0.2 * d, lastWeb: 0 });
    };
    const spawnPotion = (s: St, wall: number) => {
      const side = Math.random() < 0.5 ? -20 : W + 20;
      const x1 = 40 + Math.random() * (W - 80), y1 = 50 + Math.random() * (H - 100);
      s.potions.push({ x0: side, y0: 40 + Math.random() * (H - 80), x1, y1, born: wall, dur: 1100 });
    };
    const hit = (s: St, wall: number) => {
      s.lives -= 1; s.inv = wall + 1500;
      setLives(s.lives);
      navigator.vibrate?.(160);
      if (s.lives <= 0) finishRef.current();
    };

    const frame = (now: number) => {
      const s = st.current;
      const dt = last ? Math.min(40, now - last) : 16;
      last = now;
      const wall = Date.now();
      if (wall >= endsAt - SAFETY && !s.over) finishRef.current();
      const running = wall >= t0 + COUNTDOWN && !s.over;
      if (running) {
        setPhase((p) => (p === 'count' ? 'run' : p));
        s.t += dt;
        const d = Math.min(1, s.t / 50000); // difficulté 0 → 1 en 50 s
        // déplacement : joystick ou clavier
        let dx = stick.current.dx, dy = stick.current.dy;
        const k = keys.current;
        if (k.size) {
          dx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('q') || k.has('a') ? 1 : 0);
          dy = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('z') || k.has('w') ? 1 : 0);
          const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
        }
        const inWeb = s.webs.some((w) => Math.hypot(w.x - s.x, w.y - s.y) < w.r);
        const v = SPEED * s.slow * (inWeb ? 0.4 : 1);
        s.moving = Math.hypot(dx, dy) > 0.12;
        if (s.moving) { s.x += dx * v * dt; s.y += dy * v * dt; s.angle = Math.atan2(dy, dx); }
        s.x = Math.max(PR + 6, Math.min(W - PR - 6, s.x));
        s.y = Math.max(PR + 6, Math.min(H - PR - 6, s.y));
        // araignées
        s.nextSpider -= dt;
        if (s.nextSpider <= 0) { spawnSpider(s, d); s.nextSpider = 1150 - 750 * d + Math.random() * 400; }
        for (const sp of s.spiders) {
          sp.x += sp.vx * dt; sp.y += sp.vy * dt;
          if (sp.webber && s.t - sp.lastWeb > 650 && sp.x > 10 && sp.x < W - 10 && sp.y > 10 && sp.y < H - 10) {
            sp.lastWeb = s.t;
            s.webs.push({ x: sp.x, y: sp.y, r: 18 + sp.r * 0.6, born: wall, seed: s.seed++ });
          }
        }
        s.spiders = s.spiders.filter((sp) => sp.x > -60 && sp.x < W + 60 && sp.y > -60 && sp.y < H + 60);
        s.webs = s.webs.filter((w) => wall - w.born < 11000);
        if (s.inv < wall && s.spiders.some((sp) => Math.hypot(sp.x - s.x, sp.y - s.y) < PR + sp.r * 0.85)) hit(s, wall);
        // potions → verre au sol
        s.nextPotion -= dt;
        if (s.nextPotion <= 0) { spawnPotion(s, wall); s.nextPotion = 8000 - 3500 * d + Math.random() * 3000; }
        for (const p of s.potions) if (wall - p.born >= p.dur) s.glass.push({ id: s.seed, x: p.x1, y: p.y1, r: 34, born: wall, seed: s.seed++ });
        s.potions = s.potions.filter((p) => wall - p.born < p.dur);
        s.glass = s.glass.filter((g) => wall - g.born < 9000);
        // verre : chaque nouvelle entrée dans une flaque = −5 % de vitesse, jusqu'à la fin
        const now_in = s.glass.filter((g) => Math.hypot(g.x - s.x, (g.y - s.y) / 0.85) < g.r - 4).map((g) => g.id);
        // … et encore −5 % pour chaque seconde passée dedans
        const cut = () => {
          s.slow *= GLASS_SLOW; s.cut = wall;
          s.pops.push({ text: `−5 % vitesse (${Math.round(s.slow * 100)} %)`, t: wall });
          navigator.vibrate?.(60);
          setSpeedPct(Math.round(s.slow * 100));
        };
        for (const id of now_in) if (!s.inside.includes(id)) { cut(); s.inT = 0; }
        if (now_in.length) { s.inT += dt; if (s.inT >= 1000) { s.inT -= 1000; cut(); } }
        else s.inT = 0;
        s.inside = now_in;
        const p = pts();
        if (p !== lastPts) { lastPts = p; setScore(p); }
      }
      // ---- dessin
      ctx.globalAlpha = 1;
      ctx.drawImage(cave, 0, 0, W, H);
      drawTorches(ctx, W, H, wall);
      for (const g of s.glass) { const age = wall - g.born; const a = Math.min(1, age / 150) * Math.min(1, (9000 - age) / 800); drawGlass(ctx, g.x, g.y, g.r, a, g.seed, wall); }
      for (const w of s.webs) { const age = wall - w.born; drawWeb(ctx, w.x, w.y, w.r, Math.min(1, age / 200) * Math.min(1, (11000 - age) / 1500) * 0.9, w.seed); }
      for (const p of s.potions) { const k = (wall - p.born) / p.dur; drawTarget(ctx, p.x1, p.y1, 34, k); }
      const blink = s.inv > wall && Math.floor(wall / 100) % 2 === 1;
      if (!blink) drawBelos(ctx, s.x, s.y, s.angle, wall, s.moving, Math.max(0, 1 - (wall - s.cut) / 500) * 0.8);
      for (const sp of s.spiders) drawSpider(ctx, sp.x, sp.y, sp.r, Math.atan2(sp.vy, sp.vx), wall, SKINS[sp.skin]);
      // potions en vol (arc + rotation)
      for (const p of s.potions) {
        const k = (wall - p.born) / p.dur;
        const x = p.x0 + (p.x1 - p.x0) * k, y = p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * 90;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x0 + (p.x1 - p.x0) * k, p.y0 + (p.y1 - p.y0) * k + 6, 7, 3, 0, 0, 7); ctx.fill();
        drawPotion(ctx, x, y, k * 9, 1.3);
      }
      if (s.inv > wall && !blink) { ctx.fillStyle = 'rgba(255,40,40,.12)'; ctx.fillRect(0, 0, W, H); }
      s.pops = s.pops.filter((p) => wall - p.t < 1300);
      for (const p of s.pops) {
        const k = (wall - p.t) / 1300;
        ctx.save(); ctx.globalAlpha = 1 - k * k; ctx.font = '900 16px "Arial Black", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(p.text, s.x, s.y - 34 - k * 24);
        ctx.fillStyle = '#d62828'; ctx.fillText(p.text, s.x, s.y - 34 - k * 24); ctx.restore();
      }
      drawJoystick(ctx, JOY.x, JOY.y, JOY.R, stick.current.dx, stick.current.dy, stick.current.id >= 0);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, t0]);

  const [, force] = useState(0);
  useEffect(() => { if (phase !== 'count') return; const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, [phase]);
  const count = Math.max(0, Math.ceil((t0 + COUNTDOWN - Date.now()) / 1000));

  return (
    <div className="mg-runner">
      <div className="mg-runner-top">
        <span className="mg-lives">{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 3 - lives))}</span>
        {speedPct < 100 && <span className="small" style={{ color: '#d62828', fontWeight: 800 }}>🏃 {speedPct} %</span>}
        <b>⏱ {(score / 10).toFixed(1)} s · {score} pts</b>
      </div>
      <div className="mg-runner-area" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <canvas ref={canvas} style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block', borderRadius: 16 }} />
        {phase === 'count' && <div className="mg-overlay"><div className="mg-count anim-pop" key={count}>{count || 'GO'}</div></div>}
        {phase === 'over' && <div className="mg-overlay"><div className="mg-count" style={{ fontSize: '2em' }}>{lives <= 0 ? 'Belos est tombé…' : 'Survivant !'}<br />{score} pts</div></div>}
      </div>
      <div className="small muted center">Joystick en bas à droite. Esquive les araignées. Les toiles ralentissent ; le verre rouge fait perdre 5 % de vitesse (en entrant, puis chaque seconde dedans) pour toute la partie.</div>
    </div>
  );
}
