// Test : un joueur qui revient (autre appareil / page fermée) avec le même pseudo reprend sa place.
// Usage : node tests/rejoin-e2e.mjs [url]   (mode test local, serveur de dev lancé)
import puppeteer from 'puppeteer-core';

const BASE = (process.argv[2] || 'http://localhost:5200/').replace(/#.*$/, '');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wf = (p, fn, ...a) => p.waitForFunction(fn, { polling: 150, timeout: 15000 }, ...a);
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const click = (p, text) => p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t) && !x.disabled); b?.click(); return !!b; }, text);
let ok = true;
const check = (cond, msg) => { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) ok = false; };

try {
  const ctx = await browser.createBrowserContext();
  const host = await ctx.newPage();
  await host.setViewport({ width: 1366, height: 768 });
  await host.goto(`${BASE}#/host`, { waitUntil: 'networkidle0' });
  await wf(host, () => document.body.innerText.includes('quiz de démonstration'));
  await click(host, 'quiz de démonstration');
  await wf(host, () => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Jouer') && !b.disabled));
  await click(host, 'Jouer');
  await wf(host, () => document.body.innerText.includes('Options de la partie'));
  await host.evaluate(() => [...document.querySelectorAll('label')].find((l) => l.textContent.includes('Mode test'))?.querySelector('input')?.click());
  await click(host, 'Ouvrir la salle');
  await host.waitForSelector('.pin');
  const pin = (await host.$eval('.pin', (e) => e.textContent)).replace(/\D/g, '');

  const join = async (name) => {
    const p = await ctx.newPage(); // nouvel onglet = nouvelle identité (comme un autre téléphone)
    await p.setViewport({ width: 390, height: 844 });
    await p.goto(`${BASE}#/j/${pin}?l=1`, { waitUntil: 'networkidle0' });
    await p.waitForSelector('input[maxlength="20"]');
    await p.$eval('input[maxlength="20"]', (el) => el.select());
    await p.type('input[maxlength="20"]', name);
    await click(p, 'C’est parti');
    return p;
  };
  const chips = () => host.$$eval('.player-chip', (els) => els.map((e) => e.textContent.trim()));

  // 1) dans la salle d'attente
  const a = await join('Alice');
  await join('Bruno');
  await wf(host, () => document.querySelectorAll('.player-chip').length >= 2);
  await a.close();
  await sleep(7000);
  const a2 = await join('alice');
  await a2.bringToFront();
  console.log('étape 1 : retour en salle d’attente…');
  await wf(a2, () => !!document.querySelector('.back-toast'));
  await sleep(800);
  const c1 = await chips();
  check(c1.length === 2 && !c1.some((t) => /alice 2/i.test(t)), `salle d'attente : toujours 2 joueurs (${c1.join(', ')})`);

  // 2) en pleine partie : même pseudo qu'un joueur encore connecté = nouveau joueur « Bruno 2 »
  const b2 = await join('Bruno');
  await sleep(1500);
  const c2 = await chips();
  check(c2.some((t) => /bruno 2/i.test(t)), `pseudo d'un joueur encore connecté → nouveau joueur (${c2.join(', ')})`);
  await b2.close();

  // 3) en partie : Alice répond, part, revient sous un autre appareil et garde ses points
  await host.bringToFront();
  // avancer jusqu'à une question QCM ouverte
  for (let k = 0; k < 40; k++) {
    const st = await host.evaluate(() => ({ ph: document.querySelector('.app')?.dataset.phase, ty: document.querySelector('.app')?.dataset.qtype }));
    if (st.ph === 'question' && (st.ty === 'choice' || st.ty === 'truefalse')) break;
    await host.evaluate(() => document.querySelector('.stage-bottom .btn-primary, .btn-big.btn-primary')?.click());
    await sleep(700);
  }
  await a2.bringToFront();
  await wf(a2, () => document.querySelectorAll('.phone-ans .ans').length > 0);
  // la bonne réponse de la 1re question du quiz de démo n'est pas connue ici : on essaie la 1re tuile
  await a2.evaluate(() => document.querySelector('.phone-ans .ans')?.click());
  await a2.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Valider|Envoyer/.test(b.textContent))?.click());
  await host.bringToFront();
  await click(host, 'Révéler');
  await wf(host, () => document.querySelector('.app')?.dataset.phase === 'reveal');
  const scoreBefore = await a2.evaluate(() => document.body.innerText.match(/(\d+) pts/)?.[1]);
  await a2.close();
  await sleep(7000);
  const a3 = await join('ALICE');
  await a3.bringToFront();
  await wf(a3, () => !!document.querySelector('.back-toast'));
  await sleep(1000);
  const scoreAfter = await a3.evaluate(() => document.body.innerText.match(/(\d+) pts/)?.[1]);
  check(scoreBefore !== undefined && scoreBefore === scoreAfter, `en partie : points gardés (${scoreBefore} → ${scoreAfter})`);
  const names = await a3.evaluate(() => document.querySelector('.phone .row .grow, .phone-top .grow')?.textContent ?? document.body.innerText.slice(0, 60));
  check(/alice/i.test(names), `le téléphone affiche bien le joueur d'origine (${names.trim().slice(0, 40)})`);
} catch (e) {
  ok = false;
  console.error('ERREUR', e.message);
} finally {
  await browser.close();
}
console.log(ok ? 'RÉUSSI' : 'ÉCHEC');
process.exit(ok ? 0 : 1);
