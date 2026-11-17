// Test de bout en bout : un animateur + N joueurs (navigateurs séparés) jouent tout le quiz de démo.
// Usage : node tests/e2e.mjs [url] [nbJoueurs] [--local]
//   --local : mode test sans Internet (BroadcastChannel) ; sinon vrai temps réel Supabase.
// Captures d'écran dans .tmp/shots/
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const BASE = (args[0] || 'http://localhost:5200/').replace(/#.*$/, '');
const N = Number(args[1] || 4);
const LOCAL = process.argv.includes('--local');
const OUT = '.tmp/shots';
fs.mkdirSync(OUT, { recursive: true });
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
// polling par intervalle : les pages en arrière-plan n'ont pas de requestAnimationFrame
const wf = (p, fn, opts = {}, ...a) => p.waitForFunction(fn, { polling: 150, timeout: 15000, ...opts }, ...a);

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, protocolTimeout: 30000, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] });
const watch = (p, who) => {
  p.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`${who} console: ${m.text()}`); });
};
async function clickText(p, text, sel = 'button') {
  const ok = await p.evaluate((text, sel) => {
    const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.includes(text) && !b.disabled);
    if (el) { el.click(); return true; }
    return false;
  }, text, sel);
  if (!ok) throw new Error(`Bouton introuvable : ${text}`);
}
const shot_ = async (p, o) => { await p.bringToFront(); await sleep(1100); await p.screenshot(o); };
const phaseOf = (p) => p.evaluate(() => { const a = document.querySelector('.app'); return { phase: a?.dataset.phase, type: a?.dataset.qtype }; });

try {
  // ---------- animateur ----------
  const hostCtx = await browser.createBrowserContext();
  const host = await hostCtx.newPage();
  watch(host, 'animateur');
  await host.setViewport({ width: 1366, height: 768 });
  await host.goto(`${BASE}#/host`, { waitUntil: 'networkidle0' });
  await wf(host, () => document.body.innerText.includes('quiz de démonstration'));
  await clickText(host, 'quiz de démonstration');
  await wf(host, () => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Jouer') && !b.disabled));
  await clickText(host, 'Jouer');
  await wf(host, () => document.body.innerText.includes('Options de la partie'));
  if (LOCAL) await host.evaluate(() => { const c = [...document.querySelectorAll('label')].find((l) => l.textContent.includes('Mode test'))?.querySelector('input'); c?.click(); });
  await clickText(host, 'Ouvrir la salle');
  await host.waitForSelector('.pin');
  const pin = (await host.$eval('.pin', (e) => e.textContent)).replace(/\D/g, '');
  console.log('PIN', pin, LOCAL ? '(local)' : '(Supabase)');
  await shot_(host, { path: `${OUT}/00-lobby-vide.png` });

  // ---------- joueurs ----------
  const players = [];
  for (let i = 0; i < N; i++) {
    const ctx = LOCAL ? hostCtx : await browser.createBrowserContext();
    const p = await ctx.newPage();
    watch(p, `joueur${i + 1}`);
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: false });
    await p.goto(`${BASE}#/j/${pin}${LOCAL ? '?l=1' : ''}`, { waitUntil: 'networkidle0' });
    await p.waitForSelector('input[maxlength="20"]');
    await p.$eval('input[maxlength="20"]', (el) => { el.select(); });
    await p.type('input[maxlength="20"]', ['Alice', 'Bruno', 'Chloé', 'Dylan', 'Emma', 'Farid', 'Gaëlle', 'Hugo'][i % 8] + (i >= 8 ? i : ''));
    await clickText(p, 'C’est parti');
    players.push(p);
  }
  const t0 = Date.now();
  await wf(host, (n) => document.querySelectorAll('.player-chip').length >= n, { timeout: 20000 }, N);
  console.log(`${N} joueurs connectés en ${Date.now() - t0} ms`);
  await Promise.all(players.map((p) => wf(p, () => document.querySelector('.app')?.dataset.phase === 'lobby', { timeout: 15000 })));
  await shot_(host, { path: `${OUT}/01-lobby.png` });
  await shot_(players[0], { path: `${OUT}/01-joueur-lobby.png` });

  // ---------- partie ----------
  const shot = new Set();
  let step = 0;
  for (let guard = 0; guard < 200; guard++) {
    const { phase, type } = await phaseOf(host);
    if (phase === 'podium') break;
    const tag = `${phase}-${type ?? ''}`;
    if (process.env.DEBUG) console.log('…', tag);
    if (phase === 'question' && type !== 'slide') {
      step++;
      // les téléphones doivent afficher la même question
      await Promise.all(players.map((p) => wf(p, (t) => { const a = document.querySelector('.app'); return a?.dataset.phase === 'question' && a?.dataset.qtype === t; }, { timeout: 15000 }, type)));
      await sleep(300);
      if (!shot.has(tag)) { await shot_(players[0], { path: `${OUT}/${String(step).padStart(2, '0')}-joueur-${type}.png` }); }
      if (type === 'buzzer') {
        await players[1 % N].bringToFront(); await players[1 % N].click('.buzzer');
        await wf(host, () => document.body.innerText.includes('a buzzé'), { timeout: 10000 });
        await shot_(host, { path: `${OUT}/${String(step).padStart(2, '0')}-ecran-buzz.png` });
        await clickText(host, 'Bonne réponse');
      } else {
        for (let i = 0; i < N; i++) { await players[i].bringToFront(); await answer(players[i], type, i); }
        if (type === 'brainstorm') {
          // passage au vote (automatique quand tout le monde a répondu)
          await wf(host, () => document.body.innerText.includes('— vote'), { timeout: 10000 });
          await Promise.all(players.map((p) => wf(p, () => document.body.innerText.includes('Vote pour'), { timeout: 10000 })));
          await shot_(players[0], { path: `${OUT}/${String(step).padStart(2, '0')}-joueur-vote.png` });
          for (let i = 0; i < N; i++) { await players[i].bringToFront(); await answer(players[i], 'vote', i); }
        }
        // révélation automatique quand tout le monde a répondu
        await wf(host, () => document.querySelector('.app')?.dataset.phase === 'reveal', { timeout: 10000 });
      }
      await sleep(900);
      await shot_(host, { path: `${OUT}/${String(step).padStart(2, '0')}-ecran-${type}-resultats.png` });
      await shot_(players[0], { path: `${OUT}/${String(step).padStart(2, '0')}-joueur-${type}-resultat.png` });
      shot.add(tag);
      continue;
    }
    if (phase === 'leaderboard' && !shot.has('lb')) { await sleep(700); await shot_(host, { path: `${OUT}/lb-classement.png` }); shot.add('lb'); }
    if (phase === 'ready' && !shot.has('ready')) { await shot_(host, { path: `${OUT}/ready.png` }); shot.add('ready'); }
    if (phase === 'question' && type === 'slide' && !shot.has('slide')) { await sleep(500); await shot_(host, { path: `${OUT}/00-slide.png` }); shot.add('slide'); }
    await host.keyboard.press('ArrowRight');
    await sleep(phase === 'ready' ? 200 : 400);
  }
  await sleep(3500);
  await shot_(host, { path: `${OUT}/99-podium.png` });
  await shot_(players[0], { path: `${OUT}/99-joueur-podium.png` });
  const ranking = await host.evaluate(() => [...document.querySelectorAll('.podium .step')].map((s) => s.innerText.replace(/\n/g, ' ')));
  console.log('Podium :', ranking);
  console.log('Questions jouées :', step);
} catch (e) {
  console.error('ÉCHEC :', e.message);
  process.exitCode = 1;
} finally {
  if (errors.length) { console.log('Erreurs JS :'); errors.slice(0, 20).forEach((e) => console.log(' -', e)); }
  await browser.close();
}

/** Glisser-déposer réel à la souris, du centre de a vers le centre de b. */
async function dragTo(p, a, b) {
  const A = await a.boundingBox(), B = await b.boundingBox();
  const x0 = A.x + A.width / 2, y0 = A.y + A.height / 2, x1 = B.x + B.width / 2, y1 = B.y + B.height / 2;
  await p.mouse.move(x0, y0);
  await p.mouse.down();
  for (let s = 1; s <= 10; s++) await p.mouse.move(x0 + ((x1 - x0) * s) / 10, y0 + ((y1 - y0) * s) / 10);
  await new Promise((r) => setTimeout(r, 120));
  await p.mouse.up();
  await new Promise((r) => setTimeout(r, 250));
}

async function answer(p, type, i) {
  const clickSubmit = async () => {
    await p.evaluate(() => {
      const b = [...document.querySelectorAll('.phone-main button.btn-primary')].find((x) => !x.disabled);
      b?.click();
    });
  };
  switch (type) {
    case 'choice': case 'poll': {
      const btns = await p.$$('.phone-ans .ans');
      await btns[i % btns.length].click();
      if (i % 2 === 0 && btns.length > 2) await btns[(i + 2) % btns.length].click().catch(() => {});
      await clickSubmit();
      break;
    }
    case 'truefalse': (await p.$$('.phone-ans .ans'))[i % 2].click(); break;
    case 'type': await p.type('.phone-main input', ['Pacifique', 'pacifiqe', 'Atlantique', 'océan pacifique'][i % 4]); await clickSubmit(); break;
    case 'open': await p.type('.phone-main textarea', `Super soirée ! (${i + 1})`); await clickSubmit(); break;
    case 'wordcloud': case 'brainstorm': {
      const inputs = await p.$$('.phone-main input');
      const words = ['génial', 'drôle', 'facile', 'génial', 'rapide'];
      for (let k = 0; k < inputs.length; k++) await inputs[k].type(type === 'brainstorm' ? `Idée ${(i + k) % 3 + 1}` : words[(i + k) % words.length]);
      await clickSubmit();
      break;
    }
    case 'vote': { const items = await p.$$('.phone-main .sort-item'); if (items.length) await items[i % items.length].click(); await clickSubmit(); break; }
    case 'order': case 'ranking': {
      if (i % 2) {
        // vrai glisser-déposer : le 1er élément est déplacé tout en bas
        const items = await p.$$('.phone-main .sort-item');
        const before = await p.$$eval('.phone-main .sort-item', (els) => els.map((e) => e.innerText));
        await dragTo(p, items[0], items[items.length - 1]);
        const after = await p.$$eval('.phone-main .sort-item', (els) => els.map((e) => e.innerText));
        if (after[after.length - 1].replace(/^\d+/, '') !== before[0].replace(/^\d+/, '')) throw new Error(`glisser-déposer (ordre) sans effet : ${after.join(' | ')}`);
      }
      await clickSubmit();
      break;
    }
    case 'slider': await clickSubmit(); break;
    case 'pin': {
      await p.waitForSelector('.pin-img img', { timeout: 10000 });
      const box = await (await p.$('.pin-img img')).boundingBox();
      await p.mouse.click(box.x + box.width * (i % 2 ? 0.525 : 0.2), box.y + box.height * (i % 2 ? 0.74 : 0.3));
      await clickSubmit();
      break;
    }
    case 'match': {
      const all = await p.$$('.phone-main .sort-item');
      const n = all.length / 2;
      // une paire sur deux par glisser-déposer, l'autre en touchant l'un puis l'autre
      for (let k = 0; k < n; k++) {
        const target = all[n + ((k + i) % n)];
        if (k % 2 === 0) await dragTo(p, all[k], target); else { await all[k].click(); await target.click(); }
      }
      await clickSubmit();
      break;
    }
    case 'categorize': {
      const buckets = await p.$$('.phone-main .cat-bucket');
      for (let k = 0; ; k++) {
        const chips = await p.$$('.phone-main .cat-pool .cat-chip');
        if (!chips.length || k > 20) break;
        const b = buckets[(k + i) % buckets.length];
        if (k % 2 === 0) await dragTo(p, chips[0], b); else { await chips[0].click(); await b.click(); }
      }
      await clickSubmit();
      break;
    }
    case 'blanks': {
      const sels = await p.$$('.phone-main select');
      for (const s of sels) { const opts = await s.$$eval('option', (o) => o.map((x) => x.value).filter(Boolean)); await s.select(opts[i % opts.length]); }
      const ins = await p.$$('.phone-main input');
      for (const x of ins) await x.type('Paris');
      await clickSubmit();
      break;
    }
    case 'scale': {
      const cards = await p.$$('.phone-main .card');
      for (const c of cards) { const b = await c.$$('button'); await b[(i + 2) % b.length].click(); }
      await clickSubmit();
      break;
    }
    case 'points100': {
      const cards = await p.$$('.phone-main .card');
      const plus10 = await cards[i % cards.length].$$('button');
      for (let k = 0; k < 10; k++) await plus10[3].click();
      await clickSubmit();
      break;
    }
    case 'draw': {
      const box = await (await p.$('canvas')).boundingBox();
      await p.mouse.move(box.x + 40, box.y + 40);
      await p.mouse.down();
      for (let k = 0; k < 20; k++) await p.mouse.move(box.x + 40 + k * 12, box.y + 40 + Math.sin(k / 2 + i) * 60 + 80);
      await p.mouse.up();
      await clickSubmit();
      break;
    }
    default: break;
  }
  await wf(p, () => document.body.innerText.includes('Réponse envoyée') || document.querySelector('.app')?.dataset.phase !== 'question', { timeout: 8000 })
    .catch(() => { throw new Error(`Le joueur ${i + 1} n'a pas pu répondre (${type})`); });
}
