// « Flap Emile » : un petit avion « Emile Airlines » dans la jungle amazonienne, façon jeu à battements d'ailes.
// Toucher l'écran = remonter. Il faut passer entre les arbres (en bas) et les lianes (en haut).
// Des singes dans les arbres lancent des bananes (inoffensives : elles rebondissent sur l'avion). 3 vies ; score = arbres passés.
import { useEffect, useRef, useState } from 'react';
import type { MinigameProps } from './index';

const W = 360;
const H = 480;
const GROUND = 444;
const PX = 90;
const GRAVITY = 0.0013;
const FLAP = -0.4;
const GAP0 = 165; // ouverture au départ, se resserre
const TREE_W = 62;
const COUNTDOWN = 3000;
const SAFETY = 700;

interface Tree { x: number; gapY: number; gap: number; passed: boolean; monkey: boolean; threwAt: number }
interface Banana { x: number; y: number; vx: number; vy: number; rot: number; bounced: boolean }
interface St { t: number; y: number; vy: number; trees: Tree[]; bananas: Banana[]; nextIn: number; score: number; lives: number; inv: number; over: boolean; scroll: number; pops: { text: string; x: number; y: number; t: number }[] }
const fresh = (): St => ({ t: 0, y: H / 2 - 40, vy: 0, trees: [], bananas: [], nextIn: 600, score: 0, lives: 3, inv: 0, over: false, scroll: 0, pops: [] });
const EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export function FlapEmile({ endsAt, onFinish }: MinigameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const st = useRef<St>(fresh());
  const [t0] = useState(() => Date.now());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [phase, setPhase] = useState<'count' | 'run' | 'over'>('count');
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; st.current.over = true; setPhase('over'); onFinish(st.current.score); };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  const flap = () => { const s = st.current; if (s.over || Date.now() < t0 + COUNTDOWN) return; s.vy = FLAP; };

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); } };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  });

  // fin du temps : envoyé même si l'animation est suspendue
  useEffect(() => {
    const id = setInterval(() => { if (Date.now() >= endsAt - SAFETY) finishRef.current(); }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0, last = 0, lastScore = -1;

    const drawPlane = (s: St, wall: number) => {
      if (s.inv > wall && Math.floor(wall / 100) % 2) return;
      ctx.save();
      ctx.translate(PX, s.y);
      ctx.rotate(Math.max(-0.45, Math.min(0.6, s.vy * 1.1)));
      // aile arrière (derrière)
      ctx.fillStyle = '#9fb3c8';
      ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(-20, 16); ctx.lineTo(-8, 16); ctx.lineTo(6, 2); ctx.fill();
      // fuselage
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(0, 0, 40, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d5fd1';
      ctx.fillRect(-38, 2, 76, 3);
      // dérive
      ctx.fillStyle = '#1d5fd1';
      ctx.beginPath(); ctx.moveTo(-30, -4); ctx.lineTo(-40, -22); ctx.lineTo(-30, -22); ctx.lineTo(-18, -6); ctx.fill();
      // cockpit + hublots
      ctx.fillStyle = '#2b3a4a';
      ctx.beginPath(); ctx.ellipse(30, -3, 8, 5, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9fd3ff';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-20 + i * 9, -4, 1.8, 0, Math.PI * 2); ctx.fill(); }
      // aile avant
      ctx.fillStyle = '#c9d6e3';
      ctx.beginPath(); ctx.moveTo(-4, 3); ctx.lineTo(-16, 22); ctx.lineTo(-2, 22); ctx.lineTo(12, 3); ctx.fill();
      // inscription
      ctx.fillStyle = '#1d5fd1';
      ctx.font = 'bold 6.5px Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('EMILE AIRLINES', -4, -1);
      // hélice
      ctx.fillStyle = '#555';
      ctx.fillRect(39, -9 + (Math.floor(wall / 40) % 2) * 6, 3, 12);
      ctx.restore();
    };

    const drawTree = (tr: Tree) => {
      const top = tr.gapY + tr.gap / 2; // haut de l'arbre (sous l'ouverture)
      const cx = tr.x + TREE_W / 2;
      // tronc
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(cx - 9, top + 22, 18, GROUND - top - 22);
      // feuillage vivant (plusieurs boules)
      ctx.fillStyle = '#1f8a3a';
      for (const [dx, dy, r] of [[0, 18, 26], [-20, 30, 20], [20, 30, 20]] as const) { ctx.beginPath(); ctx.arc(cx + dx, top + dy, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#27a647';
      ctx.beginPath(); ctx.arc(cx - 6, top + 12, 14, 0, Math.PI * 2); ctx.fill();
      if (tr.monkey) { ctx.font = `26px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('🐒', cx + 8, top + 8); }
      // lianes et branches qui descendent du haut (au-dessus de l'ouverture)
      const bottom = tr.gapY - tr.gap / 2;
      ctx.fillStyle = '#145c2a';
      ctx.fillRect(tr.x, 0, TREE_W, Math.max(0, bottom - 18));
      ctx.fillStyle = '#1f8a3a';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(tr.x + 8 + i * 15, bottom - 18, 12, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#2f7d32'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const lx = tr.x + 12 + i * 19;
        ctx.beginPath(); ctx.moveTo(lx, bottom - 12); ctx.quadraticCurveTo(lx + 6, bottom - 2, lx, bottom + 4 - i * 3); ctx.stroke();
      }
    };

    const hitTree = (s: St, tr: Tree) => {
      const r = 10;
      if (PX + 36 < tr.x || PX - 36 > tr.x + TREE_W) return false;
      return s.y - r < tr.gapY - tr.gap / 2 || s.y + r > tr.gapY + tr.gap / 2 + 4;
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
        const speed = Math.min(0.24, 0.15 + s.t / 200000);
        s.scroll += speed * dt;
        s.vy += GRAVITY * dt;
        s.y += s.vy * dt;
        s.nextIn -= speed * dt;
        if (s.nextIn <= 0) {
          const gap = Math.max(118, GAP0 - s.score * 3);
          const gapY = 120 + Math.random() * (GROUND - 240);
          s.trees.push({ x: W + 10, gapY, gap, passed: false, monkey: Math.random() < 0.6, threwAt: 0 });
          s.nextIn = 210;
        }
        for (const tr of s.trees) {
          tr.x -= speed * dt;
          if (!tr.passed && tr.x + TREE_W < PX - 30) { tr.passed = true; s.score += 1; }
          // le singe lance une banane quand l'avion approche
          if (tr.monkey && !tr.threwAt && tr.x - PX < 170 && tr.x > PX) {
            tr.threwAt = wall;
            const top = tr.gapY + tr.gap / 2;
            s.bananas.push({ x: tr.x + TREE_W / 2 + 8, y: top - 6, vx: -0.22 - speed, vy: -0.32, rot: 0, bounced: false });
          }
        }
        s.trees = s.trees.filter((tr) => tr.x + TREE_W > -20);
        for (const b of s.bananas) {
          b.vy += 0.0009 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += dt * 0.012;
          // inoffensive : elle rebondit sur l'avion
          if (!b.bounced && Math.abs(b.x - PX) < 34 && Math.abs(b.y - s.y) < 18) {
            b.bounced = true; b.vx = 0.25; b.vy = -0.35;
            s.pops.push({ text: 'Bonk !', x: PX, y: s.y - 24, t: wall });
          }
        }
        s.bananas = s.bananas.filter((b) => b.y < H + 20 && b.x > -30 && b.x < W + 40);
        // collisions : arbres, lianes, sol, plafond
        if (s.inv < wall && (s.y > GROUND - 10 || s.trees.some((tr) => hitTree(s, tr)))) {
          s.lives -= 1;
          s.inv = wall + 1600;
          s.y = Math.min(Math.max(s.y, 120), GROUND - 140);
          s.vy = FLAP * 0.6;
          // on dégage l'arbre touché pour repartir
          s.trees = s.trees.filter((tr) => !(tr.x < PX + 40 && tr.x + TREE_W > PX - 40));
          setLives(s.lives);
          navigator.vibrate?.(150);
          if (s.lives <= 0) finishRef.current();
        }
        if (s.y < 14) { s.y = 14; s.vy = Math.max(0, s.vy); } // plafond : on bute sans perdre de vie
        s.y = Math.min(GROUND - 8, s.y);
        if (s.score !== lastScore) { lastScore = s.score; setScore(s.score); }
      } else if (!s.over) {
        s.y = H / 2 - 40 + Math.sin(wall / 300) * 6; // flotte pendant le compte à rebours
      }
      // décor : ciel, collines de jungle en parallaxe, rivière
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#a7e3c4'); sky.addColorStop(1, '#e6f7c9');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#7cc98f';
      for (let i = -1; i < 6; i++) { const x = i * 90 - (s.scroll * 0.2) % 90; ctx.beginPath(); ctx.arc(x, GROUND - 30, 60, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = '#4fae6b';
      for (let i = -1; i < 7; i++) { const x = i * 70 - (s.scroll * 0.45) % 70; ctx.beginPath(); ctx.arc(x, GROUND, 42, Math.PI, 0); ctx.fill(); }
      s.trees.forEach(drawTree);
      ctx.fillStyle = '#3b7dd8'; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = 0; i < 8; i++) { const x = ((i * 53 - s.scroll) % W + W) % W; ctx.fillRect(x, GROUND + 14, 18, 2); }
      ctx.font = `22px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const b of s.bananas) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillText('🍌', 0, 0); ctx.restore(); }
      drawPlane(s, wall);
      s.pops = s.pops.filter((p) => wall - p.t < 900);
      for (const p of s.pops) { const k = (wall - p.t) / 900; ctx.globalAlpha = 1 - k; ctx.fillStyle = '#c47f00'; ctx.font = 'bold 18px sans-serif'; ctx.fillText(p.text, p.x, p.y - k * 30); ctx.globalAlpha = 1; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [endsAt, t0]);

  const [, force] = useState(0);
  useEffect(() => { if (phase !== 'count') return; const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, [phase]);
  const count = Math.max(0, Math.ceil((t0 + COUNTDOWN - Date.now()) / 1000));

  return (
    <div className="mg-runner">
      <div className="mg-runner-top">
        <span className="mg-lives">{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 3 - lives))}</span>
        <b>🌴 {score}</b>
      </div>
      <div className="mg-runner-area" onPointerDown={(e) => { e.preventDefault(); flap(); }}>
        <canvas ref={canvas} style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block', borderRadius: 16 }} />
        {phase === 'count' && <div className="mg-overlay"><div className="mg-count anim-pop" key={count}>{count || 'GO'}</div></div>}
        {phase === 'over' && <div className="mg-overlay"><div className="mg-count" style={{ fontSize: '2em' }}>{lives <= 0 ? 'Crash !' : 'Atterrissage !'}<br />🌴 {score}</div></div>}
      </div>
      <div className="small muted center">Touche l’écran pour remonter. Passe entre les arbres et les lianes. Les bananes des singes ne font pas mal !</div>
    </div>
  );
}
