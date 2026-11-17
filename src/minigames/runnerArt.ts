// Dessins de « Maxime pendant l'ellipse » (canvas, style cartoon : contour sombre, dégradés, reflets).
// Tout est dessiné à la main (pas d'emoji) : rendu identique et opaque sur tous les téléphones.
// Les obstacles fixes sont pré-dessinés une fois (sprites) pour rester fluides.

type C = CanvasRenderingContext2D;
export interface Sprite { cv: HTMLCanvasElement; w: number; h: number }

const OUT = '#3b2416';
const SKIN = '#f6c9a3';
const SKIN_D = '#e2a982';

function sprite(w: number, h: number, dpr: number, draw: (c: C) => void): Sprite {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr);
  c.lineJoin = 'round'; c.lineCap = 'round';
  draw(c);
  return { cv, w, h };
}
function rr(c: C, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function fillStroke(c: C, fill: string | CanvasGradient, lw = 2.2) { c.fillStyle = fill; c.fill(); c.strokeStyle = OUT; c.lineWidth = lw; c.stroke(); }
function shine(c: C, x: number, y: number, rx: number, ry: number, a = 0.35) { c.save(); c.globalAlpha = a; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, rx, ry, -0.3, 0, Math.PI * 2); c.fill(); c.restore(); }
const rnd = (i: number) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- nourriture (au sol : sauter)
function burger(c: C) {
  // pain du bas
  rr(c, 4, 33, 40, 10, 5); fillStroke(c, '#e09a45');
  // steak
  rr(c, 2, 25, 44, 10, 5); fillStroke(c, '#6b3b1f');
  c.fillStyle = '#8a5530'; for (const x of [10, 20, 31, 39]) { c.beginPath(); c.arc(x, 29, 1.3, 0, 7); c.fill(); }
  // fromage qui coule
  c.beginPath(); c.moveTo(3, 23); c.lineTo(45, 23); c.lineTo(42, 27); c.lineTo(37, 27); c.lineTo(34, 33); c.lineTo(31, 27); c.lineTo(18, 27); c.lineTo(14, 32); c.lineTo(11, 27); c.lineTo(5, 27); c.closePath();
  fillStroke(c, '#ffcc2e', 1.8);
  // salade
  c.beginPath(); c.moveTo(2, 22);
  for (let x = 2; x <= 46; x += 4) c.quadraticCurveTo(x + 2, x % 8 ? 26 : 18, x + 4, 22);
  c.lineTo(46, 19); c.lineTo(2, 19); c.closePath(); fillStroke(c, '#5cbf4a', 1.8);
  // tomate
  rr(c, 7, 17, 34, 4, 2); fillStroke(c, '#e5423b', 1.6);
  // pain du dessus
  const g = c.createLinearGradient(0, 0, 0, 19); g.addColorStop(0, '#f7c26b'); g.addColorStop(1, '#d9863a');
  c.beginPath(); c.moveTo(3, 18); c.bezierCurveTo(3, -2, 45, -2, 45, 18); c.closePath(); fillStroke(c, g);
  c.fillStyle = '#fff7e0';
  for (const [x, y, a] of [[14, 8, 0.4], [22, 5, -0.3], [30, 7, 0.2], [37, 11, 0.6], [18, 13, -0.5], [27, 12, 0.1]]) { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 2, 1, 0, 0, 7); c.fill(); c.restore(); }
  shine(c, 14, 6, 6, 2.5);
}
function fries(c: C) {
  // frites
  const xs = [9, 13, 17, 21, 25, 29, 12, 20, 27];
  xs.forEach((x, i) => {
    const top = 2 + (i * 7) % 9;
    rr(c, x, top, 5, 24, 2); fillStroke(c, i % 2 ? '#ffd23f' : '#ffc61a', 1.5);
    c.fillStyle = '#e8a317'; c.fillRect(x + 1, top + 1, 3, 2);
  });
  // cornet
  c.beginPath(); c.moveTo(4, 18); c.lineTo(38, 18); c.lineTo(33, 46); c.lineTo(9, 46); c.closePath();
  const g = c.createLinearGradient(4, 0, 38, 0); g.addColorStop(0, '#e63930'); g.addColorStop(1, '#b81f1a');
  fillStroke(c, g);
  c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(13, 30); c.quadraticCurveTo(21, 38, 29, 30); c.lineTo(27, 30); c.quadraticCurveTo(21, 35, 15, 30); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(6, 20, 30, 3);
  shine(c, 11, 26, 2, 6, 0.3);
}
function pizza(c: C) {
  rr(c, 2, 29, 44, 8, 4); fillStroke(c, '#d9893a');
  c.beginPath(); c.moveTo(5, 30); c.lineTo(43, 30); c.lineTo(24, 2); c.closePath(); fillStroke(c, '#ffd65a');
  c.fillStyle = '#ffd65a'; c.beginPath(); c.moveTo(14, 30); c.quadraticCurveTo(15, 35, 17, 30); c.fill();
  for (const [x, y, r] of [[18, 21, 4], [29, 23, 4], [24, 12, 3.4]]) { c.beginPath(); c.arc(x, y, r, 0, 7); fillStroke(c, '#c0392b', 1.4); c.fillStyle = '#8e2a20'; c.beginPath(); c.arc(x - 1, y - 1, 0.9, 0, 7); c.fill(); }
  c.fillStyle = '#4a7a2a'; for (const [x, y] of [[23, 25], [33, 27], [21, 17]]) { c.beginPath(); c.ellipse(x, y, 2, 1.2, 0.5, 0, 7); c.fill(); }
  shine(c, 20, 9, 2, 5, 0.35);
}
function donut(c: C) {
  c.beginPath(); c.ellipse(21, 19, 19, 12, 0, 0, 7); fillStroke(c, '#d9893a');
  c.beginPath(); c.moveTo(3, 17);
  c.bezierCurveTo(3, 2, 39, 2, 39, 17);
  for (let x = 39; x >= 3; x -= 6) c.quadraticCurveTo(x - 3, x % 12 ? 24 : 19, x - 6, 19);
  c.closePath(); fillStroke(c, '#ff7eb6');
  c.beginPath(); c.ellipse(21, 13, 6, 3.4, 0, 0, 7); fillStroke(c, '#8a4f22', 1.6);
  const cols = ['#fff', '#4cc9f0', '#ffd23f', '#7bd389', '#b388ff'];
  for (let i = 0; i < 14; i++) { c.save(); c.translate(7 + rnd(i) * 28, 7 + rnd(i + 30) * 9); c.rotate(rnd(i + 60) * 3); c.fillStyle = cols[i % cols.length]; c.fillRect(-2, -0.7, 4, 1.4); c.restore(); }
  shine(c, 13, 8, 5, 2, 0.4);
}
function drumstick(c: C) {
  // os
  c.beginPath(); c.arc(6, 20, 4, 0, 7); c.arc(6, 28, 4, 0, 7); fillStroke(c, '#fff8ea', 1.8);
  rr(c, 6, 21, 14, 6, 3); fillStroke(c, '#fff8ea', 1.8);
  // viande panée
  c.beginPath(); c.ellipse(30, 23, 16, 12, -0.15, 0, 7);
  const g = c.createRadialGradient(26, 18, 2, 30, 23, 16); g.addColorStop(0, '#e9a04a'); g.addColorStop(1, '#a8571f');
  fillStroke(c, g);
  c.fillStyle = 'rgba(120,60,20,.55)'; for (let i = 0; i < 10; i++) { c.beginPath(); c.arc(20 + rnd(i) * 22, 15 + rnd(i + 9) * 16, 1.2, 0, 7); c.fill(); }
  shine(c, 25, 16, 5, 2.5, 0.35);
}
function tacosStack(c: C) {
  // drapeau sur cure-dent
  c.strokeStyle = '#a0742f'; c.lineWidth = 2; c.beginPath(); c.moveTo(27, 2); c.lineTo(27, 22); c.stroke();
  c.beginPath(); c.moveTo(27, 3); c.lineTo(45, 7); c.lineTo(27, 11); c.closePath(); fillStroke(c, '#2a9d4b', 1.4);
  for (let i = 2; i >= 0; i--) {
    const cy = 82 - i * 27; // centre de chaque taco
    const cx = 27 + (i % 2 ? 3 : -2);
    // garniture qui dépasse
    c.beginPath(); c.ellipse(cx, cy - 6, 20, 8, 0, Math.PI, 0); fillStroke(c, '#5cbf4a', 1.6);
    c.fillStyle = '#7a3e1d'; c.beginPath(); c.ellipse(cx, cy - 4, 17, 5, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#e5423b'; for (const dx of [-10, -2, 7, 13]) { c.beginPath(); c.arc(cx + dx, cy - 9 + (dx % 3), 2.3, 0, 7); c.fill(); }
    c.fillStyle = '#ffd23f'; for (const dx of [-6, 3, 10]) c.fillRect(cx + dx, cy - 12, 1.6, 6);
    // coque de maïs
    c.beginPath(); c.moveTo(cx - 23, cy - 6); c.bezierCurveTo(cx - 22, cy + 16, cx + 22, cy + 16, cx + 23, cy - 6); c.closePath();
    const g = c.createLinearGradient(0, cy - 6, 0, cy + 12); g.addColorStop(0, '#ffd56b'); g.addColorStop(1, '#e8a43a');
    fillStroke(c, g);
    c.fillStyle = 'rgba(190,120,40,.45)'; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(cx - 15 + rnd(k + i * 7) * 30, cy + rnd(k + 40 + i) * 8, 1.4, 0, 7); c.fill(); }
    shine(c, cx - 11, cy + 1, 5, 2, 0.35);
  }
}

// ---------------------------------------------------------------- enseignes (en hauteur : se baisser)
const SIGN_W = 100, SIGN_H = 52;
function board(c: C, fill: string | CanvasGradient, bulbs = true) {
  rr(c, 1.5, 1.5, SIGN_W - 3, SIGN_H - 3, 10); fillStroke(c, fill, 3);
  // reflet
  c.save(); rr(c, 4, 4, SIGN_W - 8, SIGN_H / 2 - 4, 8); c.clip(); c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(0, 0, SIGN_W, SIGN_H); c.restore();
  if (bulbs) {
    for (let x = 9; x < SIGN_W - 4; x += 10) for (const y of [6, SIGN_H - 6]) { c.fillStyle = '#fff6b0'; c.beginPath(); c.arc(x, y, 1.7, 0, 7); c.fill(); }
  }
}
function signMcdo(c: C) {
  const g = c.createLinearGradient(0, 0, 0, SIGN_H); g.addColorStop(0, '#e8352a'); g.addColorStop(1, '#b51d14');
  board(c, g);
  const arches = (col: string, lw: number) => {
    c.strokeStyle = col; c.lineWidth = lw;
    c.beginPath(); c.moveTo(31, 42); c.bezierCurveTo(31, 9, 49, 9, 50, 32); c.bezierCurveTo(51, 9, 69, 9, 69, 42); c.stroke();
  };
  arches('#7a1a10', 9); arches('#ffc72c', 6.5);
}
function signBk(c: C) {
  const g = c.createLinearGradient(0, 0, 0, SIGN_H); g.addColorStop(0, '#2a62c2'); g.addColorStop(1, '#173f85');
  board(c, g);
  c.beginPath(); c.ellipse(50, 24, 38, 14, 0, Math.PI, 0); c.closePath(); fillStroke(c, '#f5a742', 2);
  c.beginPath(); c.ellipse(50, 34, 38, 9, 0, 0, Math.PI); c.closePath(); fillStroke(c, '#f5a742', 2);
  c.fillStyle = '#d62300'; c.font = '900 13px "Arial Black", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('BURGER KING', 50, 29.5);
}
function signKfc(c: C) {
  board(c, '#ffffff', false);
  c.save(); rr(c, 3, 3, SIGN_W - 6, 16, 8); c.clip();
  for (let x = 0; x < SIGN_W; x += 10) { c.fillStyle = x % 20 ? '#ffffff' : '#c8102e'; c.fillRect(x, 0, 10, 20); }
  c.restore();
  c.strokeStyle = OUT; c.lineWidth = 3; rr(c, 1.5, 1.5, SIGN_W - 3, SIGN_H - 3, 10); c.stroke();
  c.fillStyle = '#c8102e'; c.font = '900 25px "Arial Black", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('KFC', 50, 36);
}
function signSubway(c: C) {
  const g = c.createLinearGradient(0, 0, 0, SIGN_H); g.addColorStop(0, '#0aa64f'); g.addColorStop(1, '#00713a');
  board(c, g);
  c.fillStyle = '#ffc20e'; c.font = 'italic 900 17px "Arial Black", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('SUBWAY', 50, 27);
  c.beginPath(); c.moveTo(10, 27); c.lineTo(18, 21); c.lineTo(18, 33); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(90, 27); c.lineTo(82, 21); c.lineTo(82, 33); c.closePath(); c.fill();
}

export interface RunnerSprites { foods: Sprite[]; tacos: Sprite; signs: Sprite[] }
export function makeRunnerSprites(dpr: number): RunnerSprites {
  return {
    foods: [sprite(48, 44, dpr, burger), sprite(42, 48, dpr, fries), sprite(48, 38, dpr, pizza), sprite(42, 32, dpr, donut), sprite(48, 36, dpr, drumstick)],
    tacos: sprite(52, 96, dpr, tacosStack),
    signs: [sprite(SIGN_W, SIGN_H, dpr, signMcdo), sprite(SIGN_W, SIGN_H, dpr, signBk), sprite(SIGN_W, SIGN_H, dpr, signKfc), sprite(SIGN_W, SIGN_H, dpr, signSubway)],
  };
}
export const SIGN_SIZE = { w: SIGN_W, h: SIGN_H };

/** Enseigne suspendue par deux chaînes depuis le haut de l'écran. */
export function drawSign(c: C, s: Sprite, x: number, top: number) {
  c.strokeStyle = '#6b6f78'; c.lineWidth = 2;
  for (const cx of [x + 18, x + s.w - 18]) {
    for (let y = 0; y < top; y += 7) { c.beginPath(); c.ellipse(cx, y + 3, 2, 3.4, 0, 0, 7); c.stroke(); }
  }
  c.drawImage(s.cv, x, top, s.w, s.h);
}

// ---------------------------------------------------------------- décor
export function drawScene(c: C, scroll: number, W: number, H: number, ground: number) {
  const sky = c.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, '#7cc6f2'); sky.addColorStop(1, '#ffe6c2');
  c.fillStyle = sky; c.fillRect(0, 0, W, ground);
  // soleil
  const sun = c.createRadialGradient(300, 58, 4, 300, 58, 46); sun.addColorStop(0, 'rgba(255,240,170,1)'); sun.addColorStop(0.45, 'rgba(255,224,120,.9)'); sun.addColorStop(1, 'rgba(255,224,120,0)');
  c.fillStyle = sun; c.fillRect(250, 10, 100, 100);
  // nuages
  c.fillStyle = 'rgba(255,255,255,.92)';
  for (let i = 0; i < 4; i++) {
    const span = W + 160;
    const x = (((i * 140 - scroll * 0.06) % span) + span) % span - 80, y = 34 + rnd(i) * 50;
    for (const [dx, dy, r] of [[0, 0, 14], [14, -6, 17], [30, 0, 13], [16, 5, 13]]) { c.beginPath(); c.arc(x + dx, y + dy, r, 0, 7); c.fill(); }
  }
  // ville au loin
  const far = 0.18, fw = 44;
  for (let i = Math.floor(scroll * far / fw) - 1, n = i + Math.ceil(W / fw) + 2; i < n; i++) {
    const x = i * fw - scroll * far, h = 60 + rnd(i) * 70;
    c.fillStyle = '#a9b8dc'; c.fillRect(x, ground - 30 - h, fw - 4, h + 30);
    c.fillStyle = '#c9d5ef';
    for (let wy = ground - 22 - h; wy < ground - 40; wy += 12) for (let wx = x + 6; wx < x + fw - 10; wx += 10) if (rnd(wx * 0.37 + wy) > 0.35) c.fillRect(wx, wy, 5, 6);
  }
  // boutiques au premier plan
  const near = 0.5, nw = 92;
  const fac = ['#f4a261', '#e76f51', '#2a9d8f', '#e9c46a', '#8ecae6', '#b5838d'];
  for (let i = Math.floor(scroll * near / nw) - 1, n = i + Math.ceil(W / nw) + 2; i < n; i++) {
    const x = i * nw - scroll * near, h = 78 + rnd(i + 3) * 46, col = fac[Math.abs(i) % fac.length];
    c.fillStyle = col; c.fillRect(x, ground - h, nw - 6, h);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; c.strokeRect(x, ground - h, nw - 6, h);
    // fenêtres
    c.fillStyle = '#fdf6e3';
    for (let wy = ground - h + 10; wy < ground - 52; wy += 20) for (let wx = x + 10; wx < x + nw - 22; wx += 22) { c.fillRect(wx, wy, 12, 12); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(wx, wy + 6, 12, 1.5); c.fillStyle = '#fdf6e3'; }
    // store rayé + vitrine
    for (let k = 0; k < 7; k++) { c.fillStyle = k % 2 ? '#ffffff' : (rnd(i) > 0.5 ? '#d62828' : '#1d7a46'); c.fillRect(x + 4 + k * 12, ground - 46, 12, 9); }
    c.fillStyle = 'rgba(40,60,80,.55)'; c.fillRect(x + 8, ground - 34, nw - 22, 28);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 12, ground - 32, 6, 24);
  }
  // trottoir
  c.fillStyle = '#d5d8de'; c.fillRect(0, ground, W, 16);
  c.fillStyle = '#b7bcc6';
  for (let i = -1; i < W / 34 + 1; i++) { const x = i * 34 - (scroll % 34); c.fillRect(x, ground, 2, 16); }
  c.fillStyle = '#8d939e'; c.fillRect(0, ground + 16, W, 4);
  // route
  c.fillStyle = '#4a4f57'; c.fillRect(0, ground + 20, W, H - ground - 20);
  c.fillStyle = '#f2d14b';
  for (let i = -1; i < W / 60 + 1; i++) { const x = i * 60 - ((scroll * 1.15) % 60); c.fillRect(x, ground + 30, 30, 4); }
}

// ---------------------------------------------------------------- Maxime
export interface MaximePose { fat: number; t: number; air: boolean; duck: boolean; vy: number }
/** Hauteur du personnage (px) debout / baissé, et demi-largeur selon la corpulence. */
export const maximeBox = (fat: number, duck: boolean) => ({ h: duck ? 44 : 74, hw: 8 + 13 * fat });

const limb = (c: C, x1: number, y1: number, x2: number, y2: number, w: number, col: string) => {
  c.strokeStyle = OUT; c.lineWidth = w + 3.4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
};

export function drawMaxime(c: C, x: number, base: number, p: MaximePose) {
  const f = Math.max(0, Math.min(1, p.fat));
  const ph = p.t * 0.0125;
  const duck = p.duck && !p.air;
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';

  const thighL = 11, shinL = 11;
  const hipY = base - (duck ? 13 : 24) - (p.air || duck ? 0 : Math.abs(Math.sin(ph)) * 2);
  // jambes : angle de la cuisse (0 = verticale, + = vers l'avant) et pliure du genou
  const legs: [number, number][] = p.air
    ? [[1.05, 1.7], [-0.25, 0.9]]
    : duck
      ? [[1.25, 2.4], [0.7, 2.2]]
      : [[Math.sin(ph) * 0.8, Math.max(0, -Math.cos(ph)) * 1.25 + 0.15], [-Math.sin(ph) * 0.8, Math.max(0, Math.cos(ph)) * 1.25 + 0.15]];
  const legW = 5.5 + 3.5 * f;
  const drawLeg = ([a, bend]: [number, number], back: boolean) => {
    const kx = x + Math.sin(a) * thighL, ky = hipY + Math.cos(a) * thighL;
    const a2 = a - bend;
    const fx = kx + Math.sin(a2) * shinL, fy = ky + Math.cos(a2) * shinL;
    limb(c, x, hipY, kx, ky, legW + 1, back ? SKIN_D : SKIN);
    limb(c, kx, ky, fx, fy, legW, back ? SKIN_D : SKIN);
    // basket
    c.save(); c.translate(fx, fy); c.rotate(Math.max(-0.6, Math.min(0.6, a2 * 0.5)));
    rr(c, -5, -4, 15, 7, 3.5); fillStroke(c, back ? '#d8d8d8' : '#ffffff', 2);
    c.fillStyle = '#e63946'; c.fillRect(-1, -1.5, 7, 2);
    c.fillStyle = '#3b2416'; c.fillRect(-4, 2, 13, 1.6);
    c.restore();
  };
  drawLeg(legs[1], true);

  // ombre au sol
  c.save(); c.globalAlpha = 0.2 * (1 - Math.min(0.7, (base - hipY - 24) / 160)); c.restore();

  // haut du corps, penché vers l'avant quand il se baisse
  const lean = duck ? 1.0 : p.air ? 0.05 : 0.1;
  c.save();
  c.translate(x, hipY);
  c.rotate(lean);
  const rx = 8.5 + 14.5 * f, ry = 16 + 2 * f;
  const cx = 2 * f, cy = -ry + 3;
  // torse : rond quand il est gros, droit avec des épaules quand il a maigri
  const torso = (inset = 0) => {
    const w = (rx - inset) * 2, h = (ry - inset) * 2;
    c.beginPath();
    if (f > 0.55) c.ellipse(cx, cy, rx - inset, ry - inset, 0, 0, 7);
    else c.roundRect(cx - w / 2, cy - h / 2, w, h, [w * (0.42 + 0.3 * f), w * (0.42 + 0.3 * f), w * (0.3 + 0.5 * f), w * (0.3 + 0.5 * f)]);
  };
  const shoulderX = cx + rx * 0.1, shoulderY = cy - ry * 0.5;
  const armSwing = p.air ? -2.5 : duck ? -1.3 : -Math.sin(ph) * 0.95;
  const drawArm = (ang: number, back: boolean) => {
    const ex = shoulderX + Math.sin(ang) * 10, ey = shoulderY + Math.cos(ang) * 10;
    const a2 = ang + (p.air ? 0.3 : 1.1);
    const hx = ex + Math.sin(a2) * 9, hy = ey + Math.cos(a2) * 9;
    const w = 5 + 2 * f;
    limb(c, shoulderX, shoulderY, ex, ey, w, back ? SKIN_D : SKIN);
    limb(c, ex, ey, hx, hy, w - 0.5, back ? SKIN_D : SKIN);
    c.beginPath(); c.arc(hx, hy, 3.6 + 0.6 * f, 0, 7); fillStroke(c, back ? SKIN_D : SKIN, 1.8);
  };
  drawArm(p.air ? -2.1 : -armSwing, true);

  // short
  rr(c, -rx * 0.82, -7, rx * 1.64, 12, 5); fillStroke(c, '#2f4b8a');
  // t-shirt (ventre)
  const shirt = c.createLinearGradient(cx - rx, 0, cx + rx, 0); shirt.addColorStop(0, '#d93a30'); shirt.addColorStop(1, '#ff6b5e');
  torso(); fillStroke(c, shirt, 2.4);
  // bande blanche sportive + numéro
  c.save(); torso(1.2); c.clip();
  c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(cx - rx, cy - ry * 0.55, rx * 2, 3.2);
  c.fillStyle = '#fff'; c.font = `900 ${9 + 3 * f}px "Arial Black", Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('67', cx + rx * 0.25, cy + 3);
  // ventre qui dépasse en bas quand il est gros
  if (f > 0.45) { c.fillStyle = SKIN; c.beginPath(); c.ellipse(cx + rx * 0.3, cy + ry * 0.95, rx * 0.55 * f, 4 * f, 0, Math.PI, 0); c.fill(); }
  c.restore();
  shine(c, cx + rx * 0.35, cy - ry * 0.35, rx * 0.25, ry * 0.18, 0.28);

  // tête
  const r = 11 + 1.6 * f;
  const hx = cx + rx * 0.3 + 3, hy = cy - ry - r + 7;
  limb(c, cx + rx * 0.2, cy - ry + 2, hx - 1, hy + r * 0.6, 7 + 2 * f, SKIN); // cou
  if (f > 0.2) { c.beginPath(); c.ellipse(hx + 1, hy + r * 0.78, r * (0.45 + 0.4 * f), r * 0.3 * f + 2, 0, 0, 7); fillStroke(c, SKIN, 2); } // double menton
  c.beginPath(); c.arc(hx, hy, r, 0, 7); fillStroke(c, SKIN, 2.4);
  c.fillStyle = 'rgba(255,120,120,.35)'; c.beginPath(); c.ellipse(hx + r * 0.35, hy + r * 0.35, 3.4 + f, 2.2, 0, 0, 7); c.fill(); // joue
  // oreille
  c.beginPath(); c.arc(hx - r * 0.35, hy + 1, 3.6, 0, 7); fillStroke(c, SKIN, 1.8);
  // cheveux
  c.beginPath(); c.arc(hx, hy, r + 0.5, Math.PI * 0.98, Math.PI * 1.98); c.lineTo(hx + r * 0.6, hy - r * 0.55); c.quadraticCurveTo(hx, hy - r * 0.3, hx - r * 0.55, hy - r * 0.15); c.closePath();
  fillStroke(c, '#4a2c17', 2);
  for (const k of [-0.5, -0.1, 0.3]) { c.beginPath(); c.moveTo(hx + k * r, hy - r * 0.9); c.lineTo(hx + k * r - 3, hy - r - 5); c.lineTo(hx + k * r + 4, hy - r * 0.95); c.fillStyle = '#4a2c17'; c.fill(); }
  // bandeau
  c.save(); c.beginPath(); c.arc(hx, hy, r - 0.5, 0, 7); c.clip();
  c.fillStyle = '#e63946'; c.fillRect(hx - r, hy - r * 0.52, r * 2, 4.2);
  c.restore();
  c.strokeStyle = '#e63946'; c.lineWidth = 2.6;
  const flap = Math.sin(ph * 1.6) * 2;
  c.beginPath(); c.moveTo(hx - r * 0.9, hy - r * 0.4); c.lineTo(hx - r - 8, hy - r * 0.4 + 3 + flap); c.stroke();
  c.beginPath(); c.moveTo(hx - r * 0.9, hy - r * 0.35); c.lineTo(hx - r - 6, hy - r * 0.2 + 6 - flap); c.stroke();
  // œil
  c.beginPath(); c.ellipse(hx + r * 0.42, hy - 1, 3.2, 3.8, 0, 0, 7); fillStroke(c, '#fff', 1.6);
  c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(hx + r * 0.52, hy - 0.4, 1.8, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(hx + r * 0.58, hy - 1.2, 0.6, 0, 7); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath(); c.moveTo(hx + r * 0.2, hy - 6); c.lineTo(hx + r * 0.68, hy - 5.2); c.stroke(); // sourcil
  // nez
  c.beginPath(); c.ellipse(hx + r * 0.95, hy + 2.6, 2.8, 2.3, 0, 0, 7); fillStroke(c, SKIN_D, 1.6);
  // bouche (il souffle)
  const open = p.air ? 2.6 : 1.4 + Math.abs(Math.sin(ph)) * 1.4;
  c.beginPath(); c.ellipse(hx + r * 0.58, hy + r * 0.52, 2.6, open, 0, 0, 7); fillStroke(c, '#7a1f1f', 1.4);
  // gouttes de sueur (surtout quand il est gros)
  if (f > 0.15 && !duck) {
    c.fillStyle = '#7fd3ff'; c.strokeStyle = '#2b7bb5'; c.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      const q = ((p.t / 600 + k * 0.5) % 1);
      const dx = hx - r - 4 - q * 14, dy = hy - r * 0.6 + q * 10 - Math.sin(q * 3) * 6;
      c.globalAlpha = (1 - q) * f;
      c.beginPath(); c.moveTo(dx, dy - 3.5); c.quadraticCurveTo(dx + 2.6, dy, dx, dy + 2); c.quadraticCurveTo(dx - 2.6, dy, dx, dy - 3.5); c.fill(); c.stroke();
    }
    c.globalAlpha = 1;
  }
  drawArm(armSwing, false);
  c.restore();

  drawLeg(legs[0], false);
  c.restore();
}

/** Ombre portée au sol sous Maxime (plus petite quand il saute). */
export function drawShadow(c: C, x: number, ground: number, height: number, fat: number) {
  const k = 1 - Math.min(0.75, height / 140);
  c.save(); c.fillStyle = 'rgba(0,0,0,.22)';
  c.beginPath(); c.ellipse(x + 2, ground + 3, (14 + 10 * fat) * k, 4 * k, 0, 0, 7); c.fill(); c.restore();
}
