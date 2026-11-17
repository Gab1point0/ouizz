// Test : une partie avec les 3 mini-jeux, 2 joueurs (mode test local). Captures dans .tmp/shots/mg-*.png
// Usage : node tests/minigame-e2e.mjs [url]
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = (process.argv[2] || 'http://localhost:5200/').replace(/#.*$/, '');
const OUT = '.tmp/shots';
fs.mkdirSync(OUT, { recursive: true });
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wf = (p, fn, t = 20000, ...a) => p.waitForFunction(fn, { polling: 150, timeout: t }, ...a);
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const click = (p, t) => p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t) && !x.disabled); b?.click(); return !!b; }, t);
const errors = [];
let ok = true;
const check = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) ok = false; };

try {
  const ctx = await browser.createBrowserContext();
  const host = await ctx.newPage();
  host.on('pageerror', (e) => errors.push('host: ' + e.message));
  await host.setViewport({ width: 1366, height: 768 });
  await host.goto(`${BASE}#/host`, { waitUntil: 'networkidle0' });
  await host.evaluate(async () => {
    const { saveQuiz } = await import('/src/storage.ts');
    const now = Date.now();
    const q = (id, minigame, time, title) => ({ id, type: 'minigame', minigame, time, title, points: 1 });
    await saveQuiz({ id: 'mgtest', title: 'Test mini-jeux', theme: 'craie', createdAt: now, updatedAt: now,
      questions: [q('m1', '67', 12, '67 Challenge'), q('m2', 'maxime', 14, 'Maxime pendant l’ellipse'), q('m3', 'dating', 14, 'Clint’s Dating Sim'), q('m4', 'flap', 14, 'Flap Emile'), q('m5', 'calcul', 30, 'Calcul mental'), q('m6', 'belos', 14, 'Belos vs Spiders')] });
  });
  await host.goto(`${BASE}#/run/mgtest`, { waitUntil: 'networkidle0' });
  await wf(host, () => document.body.innerText.includes('Options de la partie'));
  await host.evaluate(() => [...document.querySelectorAll('label')].find((l) => l.textContent.includes('Mode test'))?.querySelector('input')?.click());
  await click(host, 'Ouvrir la salle');
  await host.waitForSelector('.pin');
  const pin = (await host.$eval('.pin', (e) => e.textContent)).replace(/\D/g, '');

  const players = [];
  for (const name of ['Rapide', 'Lent']) {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await p.goto(`${BASE}#/j/${pin}?l=1`, { waitUntil: 'networkidle0' });
    await p.waitForSelector('input[maxlength="20"]');
    await p.$eval('input[maxlength="20"]', (el) => el.select());
    await p.type('input[maxlength="20"]', name);
    await click(p, 'C’est parti');
    players.push(p);
  }
  await wf(host, () => document.querySelectorAll('.player-chip').length >= 2);
  await host.bringToFront();
  await click(host, 'Commencer');

  for (const [i, id] of ['67', 'maxime', 'dating', 'flap', 'calcul', 'belos'].entries()) {
    await host.bringToFront();
    await wf(host, () => ['ready', 'question'].includes(document.querySelector('.app')?.dataset.phase));
    if (await host.evaluate(() => document.querySelector('.app')?.dataset.phase === 'ready')) await host.evaluate(() => document.querySelector('.stage-bottom .btn-primary')?.click());
    await wf(host, () => document.querySelector('.app')?.dataset.phase === 'question');
    const [fast, slow] = players;
    await fast.bringToFront();
    await wf(fast, (id) => !!document.querySelector(id === '67' ? '.mg-hand' : (id === 'maxime' || id === 'flap' || id === 'belos') ? '.mg-runner canvas' : id === 'calcul' ? '.mc-pad' : '.ds-field'), 10000, id);
    await sleep(3200); // compte à rebours
    if (id === '67') {
      // le joueur rapide tape 40 fois en alternant, le lent 10 fois
      for (const [p, n] of [[fast, 40], [slow, 10]]) {
        await p.bringToFront();
        await p.evaluate(async (n) => {
          const hands = document.querySelectorAll('.mg-hand');
          for (let k = 0; k < n; k++) { hands[k % 2].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise((r) => setTimeout(r, 25)); }
        }, n);
      }
      await fast.bringToFront();
      await fast.screenshot({ path: `${OUT}/mg-67-telephone.png` });
    } else if (id === 'belos') {
      // le rapide tourne en rond au joystick (vrai glisser au doigt dans le coin en bas à droite)
      const box = await (await fast.$('.mg-runner canvas')).boundingBox();
      const cx = box.x + box.width * (298 / 360), cy = box.y + box.height * (418 / 480), R = box.width * (40 / 360);
      await fast.mouse.move(cx, cy); await fast.mouse.down();
      for (let k = 0; k < 60; k++) { await fast.mouse.move(cx + Math.cos(k / 4) * R, cy + Math.sin(k / 4) * R); await new Promise((r) => setTimeout(r, 70)); }
      await fast.screenshot({ path: `${OUT}/mg-belos-telephone.png` });
      await fast.mouse.up();
    } else if (id === 'calcul') {
      // le rapide tape 67 dix fois (avec une erreur au début), le lent ne fait que 3 calculs
      for (const [p, n] of [[fast, 10], [slow, 3]]) {
        await p.bringToFront();
        await p.evaluate(async (n) => {
          const key = (k) => [...document.querySelectorAll('.mc-key')].find((b) => b.textContent === k).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          key('1'); key('2'); await new Promise((r) => setTimeout(r, 450)); // mauvaise réponse
          for (let k = 0; k < n; k++) { key('6'); key('7'); await new Promise((r) => setTimeout(r, 80)); }
        }, n);
      }
      await fast.bringToFront();
      await fast.screenshot({ path: `${OUT}/mg-calcul-telephone.png` });
    } else if (id === 'flap') {
      // le rapide tape régulièrement pour voler
      await fast.evaluate(async () => { const a = document.querySelector('.mg-runner-area'); for (let k = 0; k < 18; k++) { a.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise((r) => setTimeout(r, 380)); } });
      await fast.screenshot({ path: `${OUT}/mg-flap-telephone.png` });
    } else if (id === 'maxime') {
      // sauts réguliers pour le rapide ; le lent ne fait rien
      await fast.evaluate(async () => { const b = [...document.querySelectorAll('.mg-btn')].find((x) => x.textContent.includes('Sauter')); for (let k = 0; k < 6; k++) { b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise((r) => setTimeout(r, 700)); } });
      await fast.screenshot({ path: `${OUT}/mg-maxime-telephone.png` });
    } else {
      // le rapide touche les petits adultes, le lent touche tout ce qui bouge
      for (const [p, smart] of [[fast, true], [slow, false]]) {
        await p.bringToFront();
        await p.evaluate(async (smart) => {
          for (let k = 0; k < (smart ? 55 : 20); k++) {
            const el = document.querySelector(smart ? '.ds-small:not(.ds-hit-ok)' : '.ds-tall:not(.ds-hit-bad), .ds-elder:not(.ds-hit-bad)');
            el?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            await new Promise((r) => setTimeout(r, 120));
          }
        }, smart);
      }
      await fast.bringToFront();
      await fast.screenshot({ path: `${OUT}/mg-dating-telephone.png` });
    }
    await host.bringToFront();
    await host.screenshot({ path: `${OUT}/mg-${id}-ecran-jeu.png` });
    const endless = ['maxime', 'flap', 'belos'].includes(id);
    if (endless) {
      // jeux de survie : pas de chrono ; on vérifie qu'il n'y en a pas, puis l'animateur révèle à la main
      const timer = await host.evaluate(() => { const el = document.querySelector('.timer, .timer-bar, .timer-number'); return el ? `${document.querySelector('.app')?.dataset.phase} ${el.outerHTML.slice(0, 160)}` : ''; });
      check(!timer, `${id} : pas de limite de temps ${timer}`);
      // le joueur « rapide » joue jusqu'à perdre ses 3 vies (page au premier plan pour que le jeu tourne)
      await fast.bringToFront();
      await fast.waitForFunction(() => !document.querySelector('.mg-runner') || /Plus de vies|Crash|tombé/.test(document.querySelector('.mg-overlay')?.textContent ?? ''), { polling: 300, timeout: 120000 });
      await sleep(800);
      await host.bringToFront();
      await host.evaluate(() => document.querySelector('.stage-bottom .btn-primary')?.click());
    }
    await wf(host, () => document.querySelector('.app')?.dataset.phase === 'reveal', 30000);
    await sleep(1000);
    await host.screenshot({ path: `${OUT}/mg-${id}-ecran-resultats.png` });
    const rows = await host.$$eval('.mg-score-row', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
    console.log(`  ${id} :`, rows.join(' | '));
    check(endless ? rows.length >= 1 : rows.length === 2, `${id} : scores affichés`);
    if (id !== 'maxime' && id !== 'flap') check(/Rapide/.test(rows[0] ?? ''), `${id} : le meilleur joueur est premier`);
    if (i < 5) {
      for (let k = 0; k < 3; k++) {
        await host.evaluate(() => document.querySelector('.stage-bottom .btn-primary')?.click());
        await sleep(600);
        if (await host.evaluate(() => ['ready', 'question'].includes(document.querySelector('.app')?.dataset.phase))) break;
      }
    }
  }
} catch (e) {
  ok = false;
  console.error('ERREUR', e.message);
} finally {
  await browser.close();
}
if (errors.length) { console.log('Erreurs JS :', errors); ok = false; }
console.log(ok ? 'RÉUSSI' : 'ÉCHEC');
process.exit(ok ? 0 : 1);
