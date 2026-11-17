// Dessins de « Belos vs Spiders » (vue du dessus) : grotte, Belos le spartiate doré, araignées variées, toiles, potions.
type C = CanvasRenderingContext2D;
const OUT = '#1a120c';
const rnd = (i: number) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- grotte (pré-dessinée)
export function makeCave(W: number, H: number, dpr: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr);
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr);
  const g = c.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H * 0.7);
  g.addColorStop(0, '#5b4b3d'); g.addColorStop(1, '#2e241c');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // dalles et cailloux
  for (let i = 0; i < 140; i++) {
    const x = rnd(i) * W, y = rnd(i + 300) * H, r = 3 + rnd(i + 600) * 14;
    c.fillStyle = rnd(i + 900) > 0.5 ? 'rgba(255,240,220,.05)' : 'rgba(0,0,0,.12)';
    c.beginPath(); c.ellipse(x, y, r, r * (0.6 + rnd(i + 1) * 0.4), rnd(i + 2) * 3, 0, 7); c.fill();
  }
  // fissures
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    let x = rnd(i + 50) * W, y = rnd(i + 80) * H;
    c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (rnd(i * 9 + k) - 0.5) * 40; y += (rnd(i * 7 + k + 3) - 0.5) * 40; c.lineTo(x, y); }
    c.stroke();
  }
  // flaques d'eau
  for (let i = 0; i < 3; i++) {
    const x = 50 + rnd(i + 20) * (W - 100), y = 60 + rnd(i + 40) * (H - 120);
    c.fillStyle = 'rgba(70,110,140,.35)'; c.beginPath(); c.ellipse(x, y, 22, 10, rnd(i) * 3, 0, 7); c.fill();
    c.fillStyle = 'rgba(200,230,255,.18)'; c.beginPath(); c.ellipse(x - 6, y - 3, 8, 2.5, 0, 0, 7); c.fill();
  }
  // rochers sur les bords
  const rock = (x: number, y: number, r: number, i: number) => {
    c.beginPath();
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, rr = r * (0.75 + rnd(i * 11 + k) * 0.35); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
    const rg = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
    rg.addColorStop(0, '#7d6a58'); rg.addColorStop(1, '#3a2e24');
    c.fillStyle = rg; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
  };
  for (let i = 0; i < 26; i++) {
    const side = i % 4, t = rnd(i + 200);
    const x = side === 0 ? t * W : side === 1 ? W + 4 : side === 2 ? t * W : -4;
    const y = side === 0 ? -4 : side === 1 ? t * H : side === 2 ? H + 4 : t * H;
    rock(x, y, 14 + rnd(i + 70) * 18, i);
  }
  // cristaux lumineux
  for (let i = 0; i < 5; i++) {
    const x = rnd(i + 400) > 0.5 ? 14 + rnd(i) * 20 : W - 14 - rnd(i) * 20, y = 40 + rnd(i + 410) * (H - 80);
    const col = i % 2 ? '#7fd3ff' : '#c58aff';
    const glow = c.createRadialGradient(x, y, 1, x, y, 30); glow.addColorStop(0, col + '88'); glow.addColorStop(1, col + '00');
    c.fillStyle = glow; c.fillRect(x - 30, y - 30, 60, 60);
    for (let k = 0; k < 3; k++) {
      c.save(); c.translate(x + (k - 1) * 5, y); c.rotate((k - 1) * 0.4);
      c.beginPath(); c.moveTo(0, -12); c.lineTo(4, 0); c.lineTo(0, 6); c.lineTo(-4, 0); c.closePath();
      c.fillStyle = col; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke(); c.restore();
    }
  }
  // vignette
  const v = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  return cv;
}

/** Lueur des torches qui vacille. */
export function drawTorches(c: C, W: number, H: number, t: number) {
  for (const [x, y, k] of [[22, 22, 0], [W - 22, H * 0.55, 1]] as const) {
    const f = 1 + Math.sin(t / 90 + k * 3) * 0.06 + Math.sin(t / 37 + k) * 0.04;
    const g = c.createRadialGradient(x, y, 2, x, y, 120 * f);
    g.addColorStop(0, 'rgba(255,190,90,.45)'); g.addColorStop(1, 'rgba(255,160,60,0)');
    c.fillStyle = g; c.fillRect(x - 130, y - 130, 260, 260);
    c.fillStyle = '#5a3b22'; c.fillRect(x - 3, y, 6, 12);
    c.fillStyle = '#ffb703'; c.beginPath(); c.ellipse(x, y - 3, 5 * f, 8 * f, 0, 0, 7); c.fill();
    c.fillStyle = '#fff3b0'; c.beginPath(); c.ellipse(x, y - 1, 2.5, 4, 0, 0, 7); c.fill();
  }
}

// ---------------------------------------------------------------- Belos (vu du dessus, regarde vers +x)
export function drawBelos(c: C, x: number, y: number, angle: number, t: number, moving: boolean, red: number) {
  c.save();
  c.translate(x, y);
  // ombre
  c.scale(1.25, 1.25);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(2, 4, 17, 14, 0, 0, 7); c.fill();
  c.rotate(angle);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const step = moving ? Math.sin(t / 70) : 0;
  // pieds (sandales) qui avancent tour à tour
  c.fillStyle = '#8a5a2b'; c.strokeStyle = OUT; c.lineWidth = 1.5;
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(step * 5 * s, s * 6, 5, 3, 0, 0, 7); c.fill(); c.stroke(); }
  // cape rouge qui flotte derrière
  const flap = Math.sin(t / 120) * 2 + (moving ? 3 : 0);
  c.beginPath(); c.moveTo(-2, -10); c.quadraticCurveTo(-18 - flap, -14, -22 - flap, -2); c.quadraticCurveTo(-24 - flap, 6, -20 - flap, 12); c.quadraticCurveTo(-14, 14, -2, 10); c.closePath();
  const cape = c.createLinearGradient(-22, 0, 0, 0); cape.addColorStop(0, '#8e1b1b'); cape.addColorStop(1, '#d62828');
  c.fillStyle = cape; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
  // lance (côté droit)
  c.strokeStyle = OUT; c.lineWidth = 4.5; c.beginPath(); c.moveTo(-14, 11); c.lineTo(24, 11); c.stroke();
  c.strokeStyle = '#a0742f'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-14, 11); c.lineTo(24, 11); c.stroke();
  c.beginPath(); c.moveTo(23, 8); c.lineTo(32, 11); c.lineTo(23, 14); c.closePath(); c.fillStyle = '#d9dde3'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke();
  // cuirasse dorée
  const gold = c.createRadialGradient(-3, -4, 2, 0, 0, 14);
  gold.addColorStop(0, '#fff1a8'); gold.addColorStop(0.5, '#f2c240'); gold.addColorStop(1, '#b07f12');
  c.beginPath(); c.ellipse(0, 0, 11, 13, 0, 0, 7); c.fillStyle = gold; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.2; c.stroke();
  // épaulières
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(1, s * 11, 5, 4, 0, 0, 7); c.fillStyle = gold; c.fill(); c.stroke(); }
  // bouclier rond (côté gauche) avec un lambda
  c.beginPath(); c.arc(5, -15, 9.5, 0, 7);
  const sh = c.createRadialGradient(3, -17, 1, 5, -15, 10); sh.addColorStop(0, '#ffe58a'); sh.addColorStop(1, '#c8961e');
  c.fillStyle = sh; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
  c.strokeStyle = '#8a5a12'; c.lineWidth = 1.5; c.beginPath(); c.arc(5, -15, 7, 0, 7); c.stroke();
  c.strokeStyle = '#c1121f'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(1, -11); c.lineTo(5, -20); c.lineTo(9, -11); c.stroke();
  // casque corinthien doré + crête rouge (d'avant en arrière)
  c.beginPath(); c.arc(3, 0, 7.5, 0, 7); c.fillStyle = gold; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
  c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(3, -4.5, 13, 0); c.quadraticCurveTo(3, 4.5, -8, 0); c.closePath();
  c.fillStyle = '#d62828'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-5, -0.5); c.lineTo(9, -0.5); c.stroke();
  // visière (fente du casque vers l'avant)
  c.fillStyle = OUT; c.fillRect(9.5, -3, 1.6, 6);
  // reflet
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-3, -5, 3, 2, -0.5, 0, 7); c.fill();
  c.restore();
  // éclair rouge quand il marche dans le verre
  if (red > 0.01) {
    c.save();
    const g = c.createRadialGradient(x, y, 4, x, y, 30);
    g.addColorStop(0, `rgba(255,30,30,${0.65 * red})`); g.addColorStop(1, 'rgba(255,30,30,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 30, 0, 7); c.fill();
    c.restore();
  }
}

// ---------------------------------------------------------------- araignées
export interface Skin { body: string; abdomen: string; legs: string; mark?: 'hourglass' | 'stripes' | 'dots' | 'bands'; markCol?: string; eyes: string; hairy?: boolean }
export const SKINS: Skin[] = [
  { body: '#1b1b1b', abdomen: '#111', legs: '#222', mark: 'hourglass', markCol: '#e01e37', eyes: '#e01e37' },   // veuve noire
  { body: '#5a3b22', abdomen: '#6b4426', legs: '#4a2f1b', mark: 'bands', markCol: '#ff8a3d', eyes: '#111', hairy: true }, // mygale
  { body: '#2e7d32', abdomen: '#1b5e20', legs: '#2e7d32', mark: 'stripes', markCol: '#e8f5e9', eyes: '#111' },  // saltique verte
  { body: '#5a189a', abdomen: '#7b2cbf', legs: '#3c096c', mark: 'dots', markCol: '#4cc9f0', eyes: '#4cc9f0' },   // néon
  { body: '#e8e4dc', abdomen: '#f1ede6', legs: '#d6d0c4', mark: 'dots', markCol: '#c9b8b0', eyes: '#ff4d6d' },   // albinos
  { body: '#2b2b2b', abdomen: '#ffd23f', legs: '#3a3a3a', mark: 'stripes', markCol: '#1b1b1b', eyes: '#111' },   // argiope (guêpe)
];

export function drawSpider(c: C, x: number, y: number, r: number, angle: number, t: number, skin: Skin) {
  c.save(); c.translate(x, y); c.rotate(angle);
  c.lineCap = 'round'; c.lineJoin = 'round';
  // ombre
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(-r * 0.3 + 2, 3, r * 1.4, r * 1.1, 0, 0, 7); c.fill();
  // 8 pattes (2 segments), qui bougent en alternance
  const lw = Math.max(1.6, r * 0.16);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const base = (-0.75 + k * 0.5) * (s > 0 ? 1 : -1);
      const wig = Math.sin(t / 55 + k * 1.7 + (s > 0 ? 0 : Math.PI)) * 0.28;
      const a1 = Math.PI / 2 * s + base * 0.9 + wig;
      const kx = Math.cos(a1) * r * 1.05 + r * 0.15, ky = Math.sin(a1) * r * 1.05;
      const a2 = a1 + (k < 2 ? -0.7 : 0.7) * s;
      const fx = kx + Math.cos(a2) * r * 1.0, fy = ky + Math.sin(a2) * r * 1.0;
      c.strokeStyle = OUT; c.lineWidth = lw + 2;
      c.beginPath(); c.moveTo(r * 0.15, 0); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
      c.strokeStyle = skin.legs; c.lineWidth = lw;
      c.beginPath(); c.moveTo(r * 0.15, 0); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
      if (skin.mark === 'bands') { c.fillStyle = skin.markCol!; c.beginPath(); c.arc(kx, ky, lw * 0.7, 0, 7); c.fill(); }
    }
  }
  // abdomen
  c.beginPath(); c.ellipse(-r * 0.75, 0, r * 0.95, r * 0.8, 0, 0, 7);
  const ag = c.createRadialGradient(-r, -r * 0.3, 1, -r * 0.75, 0, r);
  ag.addColorStop(0, '#ffffff33'); ag.addColorStop(0.15, skin.abdomen); ag.addColorStop(1, skin.abdomen);
  c.fillStyle = ag; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
  if (skin.hairy) { c.strokeStyle = 'rgba(255,200,150,.35)'; c.lineWidth = 1; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; c.beginPath(); c.moveTo(-r * 0.75 + Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.75); c.lineTo(-r * 0.75 + Math.cos(a) * r * 1.08, Math.sin(a) * r * 0.9); c.stroke(); } }
  c.save(); c.beginPath(); c.ellipse(-r * 0.75, 0, r * 0.9, r * 0.75, 0, 0, 7); c.clip();
  c.fillStyle = skin.markCol ?? '#fff';
  if (skin.mark === 'hourglass') { const cx = -r * 0.75; c.beginPath(); c.moveTo(cx - r * 0.35, -r * 0.3); c.lineTo(cx + r * 0.35, -r * 0.3); c.lineTo(cx - r * 0.35, r * 0.3); c.lineTo(cx + r * 0.35, r * 0.3); c.closePath(); c.fill(); }
  if (skin.mark === 'stripes') for (let i = -2; i <= 2; i++) c.fillRect(-r * 0.75 + i * r * 0.32 - r * 0.07, -r, r * 0.14, r * 2);
  if (skin.mark === 'dots') for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-r * 0.75 + (i - 2) * r * 0.3, (i % 2 ? -1 : 1) * r * 0.25, r * 0.13, 0, 7); c.fill(); }
  if (skin.mark === 'bands') { c.fillRect(-r * 1.2, -r * 0.08, r * 0.9, r * 0.16); }
  c.restore();
  // céphalothorax + yeux
  c.beginPath(); c.ellipse(r * 0.35, 0, r * 0.55, r * 0.5, 0, 0, 7); c.fillStyle = skin.body; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
  c.fillStyle = skin.eyes;
  for (const [ex, ey, er] of [[0.7, -0.17, 0.12], [0.7, 0.17, 0.12], [0.55, -0.3, 0.08], [0.55, 0.3, 0.08]]) { c.beginPath(); c.arc(r * ex, r * ey, Math.max(1, r * er), 0, 7); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(r * 0.72, -r * 0.2, Math.max(0.6, r * 0.04), 0, 7); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- toiles, potions, verre
export function drawWeb(c: C, x: number, y: number, r: number, alpha: number, seed: number) {
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(seed);
  c.strokeStyle = 'rgba(235,240,255,.85)'; c.lineWidth = 1.1;
  const n = 8;
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); c.stroke(); }
  for (let ring = 1; ring <= 4; ring++) {
    const rr = (r * ring) / 4.3;
    c.beginPath();
    for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI * 2; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (k === 0) c.moveTo(px, py); else c.quadraticCurveTo(Math.cos(a - Math.PI / n) * rr * 0.85, Math.sin(a - Math.PI / n) * rr * 0.85, px, py); }
    c.stroke();
  }
  c.restore();
}

export function drawPotion(c: C, x: number, y: number, rot: number, scale = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(scale, scale);
  c.lineJoin = 'round';
  c.beginPath(); c.arc(0, 4, 8, 0, 7);
  const g = c.createRadialGradient(-3, 1, 1, 0, 4, 9); g.addColorStop(0, '#ff8a8a'); g.addColorStop(1, '#b5001b');
  c.fillStyle = g; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#cfe9ff'; c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.rect(-3, -9, 6, 7); c.fill(); c.stroke();
  c.fillStyle = '#8a5a2b'; c.fillRect(-3.5, -12, 7, 3.5);
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-3, 1, 2, 3, -0.4, 0, 7); c.fill();
  c.restore();
}

export function drawGlass(c: C, x: number, y: number, r: number, alpha: number, seed: number, t: number) {
  c.save(); c.globalAlpha = alpha; c.translate(x, y);
  // flaque rouge irrégulière
  c.beginPath();
  for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI * 2, rr = r * (0.8 + rnd(seed * 31 + k) * 0.25); const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.85; if (k === 0) c.moveTo(px, py); else c.lineTo(px, py); }
  c.closePath();
  const g = c.createRadialGradient(0, 0, 2, 0, 0, r); g.addColorStop(0, 'rgba(220,20,40,.75)'); g.addColorStop(1, 'rgba(140,0,20,.55)');
  c.fillStyle = g; c.fill();
  // éclats de verre qui brillent
  for (let k = 0; k < 11; k++) {
    const a = rnd(seed + k) * Math.PI * 2, d = rnd(seed + k + 50) * r * 0.85, s = 3 + rnd(seed + k + 90) * 4;
    c.save(); c.translate(Math.cos(a) * d, Math.sin(a) * d * 0.85); c.rotate(rnd(seed + k + 7) * 6);
    c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.7, s * 0.4); c.lineTo(-s * 0.5, s * 0.6); c.closePath();
    c.fillStyle = 'rgba(220,240,255,.85)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 0.8; c.stroke();
    if (Math.sin(t / 200 + k) > 0.85) { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -s * 0.4, 1.4, 0, 7); c.fill(); }
    c.restore();
  }
  c.restore();
}

/** Cible au sol pendant qu'une potion vole (pour pouvoir l'éviter). */
export function drawTarget(c: C, x: number, y: number, r: number, k: number) {
  c.save(); c.strokeStyle = `rgba(255,60,60,${0.4 + 0.5 * k})`; c.lineWidth = 2; c.setLineDash([6, 5]);
  c.beginPath(); c.arc(x, y, r * (1.2 - 0.2 * k), 0, 7); c.stroke(); c.restore();
}

/** Joystick (dessiné dans le jeu, en bas à droite). */
export function drawJoystick(c: C, bx: number, by: number, R: number, dx: number, dy: number, active: boolean) {
  c.save();
  c.fillStyle = active ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.1)';
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.5;
  c.beginPath(); c.arc(bx, by, R, 0, 7); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)';
  for (const [ax, ay] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { c.beginPath(); c.moveTo(bx + ax * (R - 6), by + ay * (R - 6)); c.lineTo(bx + ax * (R - 14) + ay * 5, by + ay * (R - 14) + ax * 5); c.lineTo(bx + ax * (R - 14) - ay * 5, by + ay * (R - 14) - ax * 5); c.closePath(); c.fill(); }
  const g = c.createRadialGradient(bx + dx * R - 5, by + dy * R - 5, 2, bx + dx * R, by + dy * R, 22);
  g.addColorStop(0, '#fff1a8'); g.addColorStop(1, '#c8961e');
  c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 2;
  c.beginPath(); c.arc(bx + dx * R, by + dy * R, 20, 0, 7); c.fill(); c.stroke();
  c.restore();
}
