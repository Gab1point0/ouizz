// Test de la sauvegarde en ligne entre deux « appareils » (deux navigateurs séparés).
// Usage : node tests/cloud-e2e.mjs [url]
import puppeteer from 'puppeteer-core';

const BASE = (process.argv[2] || 'http://localhost:5200/').replace(/#.*$/, '');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, protocolTimeout: 30000 });
const wf = (p, fn, opts = {}, ...a) => p.waitForFunction(fn, { polling: 150, timeout: 20000, ...opts }, ...a);
const clickText = (p, t) => p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t) && !x.disabled); b?.click(); return !!b; }, t);
const titles = (p) => p.$$eval('.quiz-card b', (bs) => bs.map((b) => b.textContent));
const errors = [];
let ok = true;
const check = (cond, label) => { console.log(cond ? '✔' : '✘', label); if (!cond) ok = false; };

try {
  const A = await (await browser.createBrowserContext()).newPage();
  const B = await (await browser.createBrowserContext()).newPage();
  for (const [p, n] of [[A, 'A'], [B, 'B']]) p.on('pageerror', (e) => errors.push(`${n}: ${e.message}`));

  // A : active la sauvegarde puis ajoute le quiz de démo
  await A.goto(`${BASE}#/host`, { waitUntil: 'networkidle0' });
  await clickText(A, '☁');
  await wf(A, () => document.body.innerText.includes('Activer (première fois)'));
  await clickText(A, 'Activer (première fois)');
  await wf(A, () => document.body.innerText.includes('Sauvegarde activée'));
  const key = await A.$eval('input[readonly]', (i) => i.value);
  check(/^ouizz-[a-z0-9-]{24}$/.test(key), `code généré (${key.slice(0, 11)}…)`);
  await clickText(A, 'Fermer');
  await clickText(A, 'quiz de démonstration');
  await wf(A, () => document.querySelectorAll('.quiz-card').length === 1);
  // modification dans l'éditeur
  await clickText(A, 'Modifier');
  await A.waitForSelector('.toolbar input');
  await A.$eval('.toolbar input', (el) => el.select());
  await A.type('.toolbar input', 'Quiz synchronisé');
  await wf(A, () => document.body.innerText.includes('Enregistré'));
  await clickText(A, 'Mes quiz');
  await wf(A, () => document.body.innerText.includes('Sauvegardé ✓'), { timeout: 30000 });
  check(true, 'A : envoi terminé');

  // B : nouveau navigateur, récupère avec le code
  await B.goto(`${BASE}#/host`, { waitUntil: 'networkidle0' });
  check((await B.$$('.quiz-card')).length === 0, 'B : aucun quiz au départ');
  await clickText(B, '☁');
  await wf(B, () => document.body.innerText.includes('déjà un code'));
  await clickText(B, 'déjà un code');
  await B.type('.modal input', key);
  await clickText(B, 'Récupérer mes quiz');
  await wf(B, () => document.body.innerText.includes('Code reconnu'));
  await clickText(B, 'Fermer');
  await wf(B, () => document.querySelectorAll('.quiz-card').length === 1);
  const tb = await titles(B);
  check(tb[0] === 'Quiz synchronisé', `B : quiz récupéré avec la modification (« ${tb[0]} »)`);
  // les images (data URL) sont-elles bien arrivées ?
  const qCount = await B.$eval('.quiz-card .small', (e) => e.textContent);
  check(qCount.startsWith('20 questions'), `B : contenu complet (${qCount.split('·')[0].trim()})`);

  // B supprime -> A le voit disparaître à la prochaine ouverture
  B.on('dialog', (d) => d.accept());
  await clickText(B, '⋯');
  await clickText(B, 'Supprimer');
  await wf(B, () => document.querySelectorAll('.quiz-card').length === 0);
  await wf(B, () => document.body.innerText.includes('Sauvegardé ✓'), { timeout: 30000 });
  await A.reload({ waitUntil: 'networkidle0' });
  await wf(A, () => document.querySelectorAll('.quiz-card').length === 0, { timeout: 20000 }).catch(() => {});
  check((await A.$$('.quiz-card')).length === 0, 'A : suppression faite sur B répercutée');
  await sleep(200);
} catch (e) {
  console.error('ÉCHEC :', e.message);
  ok = false;
} finally {
  if (errors.length) { console.log('Erreurs JS :', errors); ok = false; }
  await browser.close();
  process.exitCode = ok ? 0 : 1;
}
