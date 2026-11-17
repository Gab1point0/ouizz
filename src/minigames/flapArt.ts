// Dessins de « Flap Emile » (canvas, style cartoon : contour sombre, dégradés, reflets) — même esprit que runnerArt.
// Jungle amazonienne en couches (parallaxe), avion « Emile Airlines », arbres vivants, singes et bananes dessinés à la main.

type C = CanvasRenderingContext2D;
export interface Sprite { cv: HTMLCanvasElement; w: number; h: number }

const OUT = '#1f2d1a';
const PLANE_OUT = '#1d2a44';
const rnd = (i: number) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

function sprite(w: number, h: number, dpr: number, draw: (c: C) => void): Sprite {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr); c.lineJoin = 'round'; c.lineCap = 'round';
  draw(c);
  return { cv, w, h };
}
function blob(c: C, x: number, y: number, r: number, fill: string | CanvasGradient, stroke = OUT, lw = 2.2) {
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = fill; c.fill(); if (lw) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
function leaf(c: C, x: number, y: number, len: number, ang: number, col: string) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0); c.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  c.fillStyle = col; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(len * 0.1, 0); c.lineTo(len * 0.85, 0); c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- sprites
/** Couronne de l'arbre (en bas) : touffes de feuilles en couches, plus claires devant. */
function canopy(c: C) {
  const cx = 50;
  const back = [[-30, 30, 20], [30, 30, 20], [-16, 18, 22], [16, 18, 22], [0, 12, 24]];
  for (const [dx, dy, r] of back) blob(c, cx + dx, dy + 14, r, '#1e7a3a');
  const g = c.createRadialGradient(cx - 10, 14, 4, cx, 30, 44); g.addColorStop(0, '#5fd36b'); g.addColorStop(1, '#2a9d4b');
  for (const [dx, dy, r] of [[-22, 36, 16], [22, 36, 16], [-8, 28, 18], [10, 26, 18], [0, 40, 15]]) blob(c, cx + dx, dy + 6, r, g);
  // reflets et petites feuilles
  c.fillStyle = 'rgba(255,255,255,.28)';
  for (const [dx, dy, r] of [[-12, 24, 6], [8, 20, 5], [20, 34, 4]]) { c.beginPath(); c.arc(cx + dx, dy + 6, r, 0, 7); c.fill(); }
  for (let i = 0; i < 7; i++) leaf(c, cx - 40 + i * 13, 54 + (i % 2) * 4, 12, 1.2 + rnd(i) * 0.8, '#3fb35a');
  // fruits
  for (const [dx, dy, col] of [[-18, 30, '#ff8a3d'], [14, 40, '#ff5a7a'], [24, 22, '#ffd23f']] as const) blob(c, cx + dx, dy + 6, 3.2, col, OUT, 1.2);
}
/** Dessous du feuillage qui tombe du haut. */
function hanging(c: C) {
  const cx = 48;
  for (const [dx, dy, r] of [[-30, 14, 18], [30, 14, 18], [-12, 22, 20], [14, 22, 20], [0, 8, 22]]) blob(c, cx + dx, dy, r, '#1e7a3a');
  for (const [dx, dy, r] of [[-20, 22, 13], [20, 22, 13], [0, 28, 14]]) blob(c, cx + dx, dy, r, '#2a9d4b');
  c.fillStyle = 'rgba(255,255,255,.22)';
  for (const [dx, dy] of [[-18, 18], [4, 24], [22, 18]]) { c.beginPath(); c.arc(cx + dx, dy, 4, 0, 7); c.fill(); }
  // fleurs tropicales
  for (const [dx, dy, col] of [[-26, 26, '#ff5a7a'], [8, 36, '#ffb703'], [28, 26, '#f15bb5']] as const) {
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; blob(c, cx + dx + Math.cos(a) * 3.2, dy + Math.sin(a) * 3.2, 2.6, col, OUT, 0.9); }
    blob(c, cx + dx, dy, 1.8, '#fff3b0', OUT, 0.8);
  }
}
/** Motif d'écorce pour les troncs. */
function barkTile(c: C) {
  c.fillStyle = '#7a4a26'; c.fillRect(0, 0, 24, 40);
  c.strokeStyle = 'rgba(60,30,12,.55)'; c.lineWidth = 2;
  for (const x of [5, 12, 19]) { c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x - 2, 12, x + 2, 26, x, 40); c.stroke(); }
  c.strokeStyle = 'rgba(255,220,170,.22)'; c.lineWidth = 1;
  for (const x of [8, 16]) { c.beginPath(); c.moveTo(x, 4); c.lineTo(x, 16); c.stroke(); }
}
function monkey(throwing: boolean) {
  return (c: C) => {
    const brown = '#7a4a26', face = '#f2c9a0';
    // queue
    c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(10, 32); c.bezierCurveTo(-2, 32, 0, 14, 8, 16); c.stroke();
    c.strokeStyle = brown; c.lineWidth = 3; c.beginPath(); c.moveTo(10, 32); c.bezierCurveTo(-2, 32, 0, 14, 8, 16); c.stroke();
    // corps
    c.beginPath(); c.ellipse(20, 30, 10, 11, 0, 0, 7); c.fillStyle = brown; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.ellipse(21, 32, 6, 7, 0, 0, 7); c.fillStyle = face; c.fill();
    // bras qui lance
    c.strokeStyle = OUT; c.lineWidth = 6;
    const ax = throwing ? 34 : 30, ay = throwing ? 6 : 34;
    c.beginPath(); c.moveTo(26, 24); c.lineTo(ax, ay); c.stroke();
    c.strokeStyle = brown; c.lineWidth = 3.5; c.beginPath(); c.moveTo(26, 24); c.lineTo(ax, ay); c.stroke();
    if (throwing) { c.save(); c.translate(ax + 2, ay - 2); c.rotate(-0.6); bananaShape(c, 0.7); c.restore(); }
    // tête
    blob(c, 9, 12, 4.5, brown, OUT, 1.8); blob(c, 31, 12, 4.5, brown, OUT, 1.8);
    blob(c, 9, 12, 2.2, face, face, 0); blob(c, 31, 12, 2.2, face, face, 0);
    blob(c, 20, 13, 10, brown, OUT, 2);
    c.beginPath(); c.moveTo(20, 9); c.bezierCurveTo(11, 3, 9, 16, 13, 19); c.quadraticCurveTo(20, 24, 27, 19); c.bezierCurveTo(31, 16, 29, 3, 20, 9); c.fillStyle = face; c.fill();
    c.fillStyle = '#1b1b1b'; for (const x of [16.5, 23.5]) { c.beginPath(); c.arc(x, 12, 1.7, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; for (const x of [17, 24]) { c.beginPath(); c.arc(x, 11.4, 0.6, 0, 7); c.fill(); }
    c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.arc(20, 16.5, 3.4, 0.15, Math.PI - 0.15); c.stroke();
  };
}
function bananaShape(c: C, k = 1) {
  c.save(); c.scale(k, k);
  c.beginPath(); c.moveTo(-10, -2); c.quadraticCurveTo(0, 12, 11, -3); c.quadraticCurveTo(0, 5, -10, -2); c.closePath();
  const g = c.createLinearGradient(0, -3, 0, 8); g.addColorStop(0, '#fff07a'); g.addColorStop(1, '#f2c21b');
  c.fillStyle = g; c.fill(); c.strokeStyle = '#5a4210'; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = '#5a4210'; c.beginPath(); c.arc(-10, -2, 1.4, 0, 7); c.fill(); c.beginPath(); c.arc(11, -3, 1.2, 0, 7); c.fill();
  c.restore();
}

export interface FlapSprites { canopy: Sprite; hanging: Sprite; monkey: Sprite; monkeyThrow: Sprite; banana: Sprite; bark: CanvasPattern | null }
export function makeFlapSprites(dpr: number, ctx: C): FlapSprites {
  const bark = sprite(24, 40, 1, barkTile);
  return {
    canopy: sprite(100, 74, dpr, canopy),
    hanging: sprite(96, 46, dpr, hanging),
    monkey: sprite(40, 44, dpr, monkey(false)),
    monkeyThrow: sprite(40, 44, dpr, monkey(true)),
    banana: sprite(26, 16, dpr, (c) => { c.translate(13, 6); bananaShape(c); }),
    bark: ctx.createPattern(bark.cv, 'repeat'),
  };
}

// ---------------------------------------------------------------- décor
export function drawJungle(c: C, scroll: number, W: number, H: number, ground: number, t: number) {
  const sky = c.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, '#5ec2d6'); sky.addColorStop(0.55, '#b9ecd2'); sky.addColorStop(1, '#f3f7c8');
  c.fillStyle = sky; c.fillRect(0, 0, W, ground);
  // soleil et rayons
  const sun = c.createRadialGradient(W - 60, 70, 4, W - 60, 70, 70); sun.addColorStop(0, 'rgba(255,248,200,1)'); sun.addColorStop(0.3, 'rgba(255,236,150,.8)'); sun.addColorStop(1, 'rgba(255,236,150,0)');
  c.fillStyle = sun; c.fillRect(W - 140, 0, 140, 150);
  c.save(); c.globalAlpha = 0.12; c.fillStyle = '#fffbe0';
  for (let i = 0; i < 4; i++) { const a = 0.35 + i * 0.16 + Math.sin(t / 3000 + i) * 0.02; c.beginPath(); c.moveTo(W - 60, 70); c.lineTo(W - 60 - Math.cos(a) * 600, 70 + Math.sin(a) * 600); c.lineTo(W - 60 - Math.cos(a + 0.05) * 600, 70 + Math.sin(a + 0.05) * 600); c.closePath(); c.fill(); }
  c.restore();
  // montagnes dans la brume
  const layer = (speed: number, base: number, amp: number, step: number, col: string, seed: number) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, ground);
    const off = (scroll * speed) % step;
    const i0 = Math.floor((scroll * speed) / step);
    for (let k = -1; k <= W / step + 2; k++) {
      const x = k * step - off;
      const h = base - amp * rnd(i0 + k + seed);
      c.quadraticCurveTo(x - step / 2, h - amp * 0.3, x, h);
    }
    c.lineTo(W, ground); c.closePath(); c.fill();
  };
  layer(0.05, ground - 150, 70, 90, '#a9d8c4', 1);
  layer(0.12, ground - 95, 50, 60, '#7cc49b', 7);
  // canopée lointaine (touffes)
  const bumps = (speed: number, y: number, r: number, col: string, seed: number) => {
    c.fillStyle = col;
    const step = r * 1.3, off = (scroll * speed) % step, i0 = Math.floor((scroll * speed) / step);
    for (let k = -1; k <= W / step + 2; k++) { const x = k * step - off; c.beginPath(); c.arc(x, y - rnd(i0 + k + seed) * r * 0.6, r, 0, 7); c.fill(); }
    c.fillRect(0, y, W, ground - y);
  };
  bumps(0.25, ground - 60, 22, '#4fae6b', 3);
  bumps(0.45, ground - 28, 18, '#2f8f4e', 11);
  // rivière
  const river = c.createLinearGradient(0, ground, 0, H); river.addColorStop(0, '#3fa7c9'); river.addColorStop(1, '#1f6f9a');
  c.fillStyle = river; c.fillRect(0, ground, W, H - ground);
  c.fillStyle = 'rgba(255,255,255,.45)';
  for (let i = 0; i < 10; i++) { const x = ((i * 47 - scroll * 0.9) % (W + 40) + W + 40) % (W + 40) - 20; const y = ground + 8 + (i % 3) * 9; c.beginPath(); c.ellipse(x, y, 10 + (i % 2) * 6, 1.4, 0, 0, 7); c.fill(); }
  c.fillStyle = '#2a7d3e'; c.fillRect(0, ground - 3, W, 5); // berge
}

/** Petites fougères au premier plan, sur la berge. */
export function drawForeground(c: C, scroll: number, W: number, ground: number) {
  const step = 70, off = (scroll * 1.2) % step, i0 = Math.floor((scroll * 1.2) / step);
  for (let k = -1; k <= W / step + 1; k++) {
    const x = k * step - off + 20 * rnd(i0 + k);
    for (let j = 0; j < 4; j++) leaf(c, x, ground + 2, 16 + 6 * rnd(j + k), -Math.PI / 2 - 0.9 + j * 0.6, j % 2 ? '#3fb35a' : '#2a9d4b');
  }
}

// ---------------------------------------------------------------- arbres
export interface TreeDraw { x: number; w: number; gapTop: number; gapBottom: number; monkey: boolean; throwing: boolean }
export function drawTree(c: C, sp: FlapSprites, tr: TreeDraw, ground: number) {
  const cx = tr.x + tr.w / 2;
  // --- en haut : feuillage qui tombe + lianes
  const bottom = tr.gapTop;
  const colTop = bottom - 30;
  if (colTop > 0) {
    const g = c.createLinearGradient(tr.x, 0, tr.x + tr.w, 0); g.addColorStop(0, '#14582a'); g.addColorStop(0.5, '#1e7a3a'); g.addColorStop(1, '#14582a');
    c.fillStyle = g; c.fillRect(tr.x + 4, -2, tr.w - 8, colTop + 4);
    c.strokeStyle = OUT; c.lineWidth = 2.2; c.beginPath(); c.moveTo(tr.x + 4, -2); c.lineTo(tr.x + 4, colTop); c.moveTo(tr.x + tr.w - 4, -2); c.lineTo(tr.x + tr.w - 4, colTop); c.stroke();
    for (let y = 8; y < colTop; y += 22) { leaf(c, tr.x + 6, y, 12, Math.PI - 0.5, '#2a9d4b'); leaf(c, tr.x + tr.w - 6, y + 10, 12, 0.5, '#2a9d4b'); }
  }
  c.drawImage(sp.hanging.cv, cx - sp.hanging.w / 2, bottom - sp.hanging.h + 4, sp.hanging.w, sp.hanging.h);
  c.strokeStyle = '#2f7d32'; c.lineWidth = 2.4;
  for (const [dx, len] of [[-16, 12], [6, 9], [20, 13]]) {
    c.beginPath(); c.moveTo(cx + dx, bottom - 4); c.quadraticCurveTo(cx + dx + 4, bottom + len / 2, cx + dx, bottom + len); c.stroke();
    leaf(c, cx + dx, bottom + len, 7, 1.3, '#3fb35a');
  }
  // --- en bas : tronc + couronne + singe
  const top = tr.gapBottom;
  const trunkTop = top + 46;
  if (trunkTop < ground) {
    c.save();
    c.beginPath(); c.moveTo(cx - 11, trunkTop); c.lineTo(cx + 11, trunkTop); c.lineTo(cx + 14, ground - 6); c.quadraticCurveTo(cx + 22, ground, cx + 26, ground + 2); c.lineTo(cx - 26, ground + 2); c.quadraticCurveTo(cx - 22, ground, cx - 14, ground - 6); c.closePath();
    c.fillStyle = sp.bark ?? '#7a4a26'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke();
    // liane enroulée
    c.strokeStyle = '#3c9a4a'; c.lineWidth = 3;
    c.beginPath(); for (let y = trunkTop; y < ground - 4; y += 4) { const xx = cx + Math.sin(y / 12) * 11; if (y === trunkTop) c.moveTo(xx, y); else c.lineTo(xx, y); } c.stroke();
    c.restore();
  }
  c.drawImage(sp.canopy.cv, cx - sp.canopy.w / 2, top - 6, sp.canopy.w, sp.canopy.h);
  if (tr.monkey) { const m = tr.throwing ? sp.monkeyThrow : sp.monkey; c.drawImage(m.cv, cx - 4, top - m.h + 14, m.w, m.h); }
}

export function drawBanana(c: C, sp: FlapSprites, x: number, y: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot); c.drawImage(sp.banana.cv, -sp.banana.w / 2, -sp.banana.h / 2, sp.banana.w, sp.banana.h); c.restore();
}

// ---------------------------------------------------------------- avion
export function drawPlane(c: C, x: number, y: number, angle: number, t: number) {
  c.save();
  c.translate(x, y); c.rotate(angle);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const stroke = (lw = 2) => { c.strokeStyle = PLANE_OUT; c.lineWidth = lw; c.stroke(); };
  // aile arrière (côté opposé, derrière le fuselage)
  c.beginPath(); c.moveTo(2, -2); c.lineTo(-10, -18); c.lineTo(-2, -18); c.lineTo(14, -2); c.closePath(); c.fillStyle = '#b8c6d8'; c.fill(); stroke(1.8);
  // dérive bleue avec le « E »
  c.beginPath(); c.moveTo(-28, -6); c.lineTo(-42, -26); c.quadraticCurveTo(-44, -29, -40, -29); c.lineTo(-32, -29); c.lineTo(-18, -8); c.closePath();
  const fin = c.createLinearGradient(-42, -29, -20, -6); fin.addColorStop(0, '#2f7bf0'); fin.addColorStop(1, '#1650b8');
  c.fillStyle = fin; c.fill(); stroke();
  c.fillStyle = '#fff'; c.font = '900 10px "Arial Black", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.save(); c.translate(-33, -19); c.rotate(-0.25); c.fillText('E', 0, 0); c.restore();
  // stabilisateur
  c.beginPath(); c.moveTo(-30, 0); c.lineTo(-44, -4); c.lineTo(-44, 2); c.lineTo(-30, 4); c.closePath(); c.fillStyle = '#d7e0ec'; c.fill(); stroke(1.6);
  // fuselage
  c.beginPath();
  c.moveTo(-40, -3); c.quadraticCurveTo(-36, -11, -20, -11); c.lineTo(24, -11); c.quadraticCurveTo(42, -10, 44, 0); c.quadraticCurveTo(42, 10, 24, 11); c.lineTo(-20, 11); c.quadraticCurveTo(-36, 9, -40, 3); c.closePath();
  const body = c.createLinearGradient(0, -11, 0, 11); body.addColorStop(0, '#ffffff'); body.addColorStop(0.6, '#eef2f8'); body.addColorStop(1, '#c9d3e2');
  c.fillStyle = body; c.fill();
  c.save(); c.clip();
  c.fillStyle = '#1d5fd1'; c.fillRect(-44, 4, 90, 4); // bande bleue
  c.fillStyle = '#ffb703'; c.fillRect(-44, 8, 90, 1.6);
  c.restore();
  stroke(2.2);
  // hublots
  c.fillStyle = '#8fd3ff'; c.strokeStyle = PLANE_OUT; c.lineWidth = 1;
  for (let i = 0; i < 6; i++) { c.beginPath(); c.roundRect(-22 + i * 7.5, -8, 4.2, 4.6, 2); c.fill(); c.stroke(); }
  // cockpit
  c.beginPath(); c.moveTo(27, -9); c.quadraticCurveTo(37, -9, 40, -3); c.lineTo(29, -3); c.closePath();
  c.fillStyle = '#244a7a'; c.fill(); stroke(1.4);
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(30, -8); c.lineTo(34, -8); c.lineTo(31, -4); c.closePath(); c.fill();
  // inscription
  c.fillStyle = '#163f8f'; c.font = '900 6.4px "Arial Black", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('EMILE AIRLINES', 2, 1);
  // aile avant
  c.beginPath(); c.moveTo(-2, 4); c.lineTo(-16, 22); c.quadraticCurveTo(-16, 25, -12, 25); c.lineTo(-4, 25); c.lineTo(16, 5); c.closePath();
  const wing = c.createLinearGradient(0, 4, 0, 25); wing.addColorStop(0, '#e9eef6'); wing.addColorStop(1, '#a9b8cc');
  c.fillStyle = wing; c.fill(); stroke(2);
  c.fillStyle = '#e63946'; c.beginPath(); c.arc(-12, 23, 1.6, 0, 7); c.fill(); // feu de position
  // hélice
  c.beginPath(); c.ellipse(46, 0, 3.5, 4.5, 0, 0, 7); c.fillStyle = '#e63946'; c.fill(); stroke(1.4);
  c.save(); c.globalAlpha = 0.25; c.fillStyle = '#9aa7b8'; c.beginPath(); c.ellipse(48, 0, 2.5, 15, 0, 0, 7); c.fill(); c.restore();
  const k = Math.cos(t / 22);
  c.fillStyle = '#3a4250'; c.beginPath(); c.ellipse(48.5, 0, 1.6, Math.abs(k) * 14 + 1.5, 0, 0, 7); c.fill();
  c.restore();
}

/** Texte cartoon avec contour blanc. */
export function popText(c: C, text: string, x: number, y: number, col: string, size = 18, alpha = 1) {
  c.save(); c.globalAlpha = alpha;
  c.font = `900 ${size}px "Arial Black", Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.strokeStyle = '#fff'; c.lineWidth = 5; c.strokeText(text, x, y);
  c.fillStyle = col; c.fillText(text, x, y);
  c.restore();
}
