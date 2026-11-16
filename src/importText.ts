// Création rapide : on colle du texte, chaque bloc (séparé par une ligne vide) devient une question.
import { newQuestion } from './qtypes';
import type { Question } from './types';
import { uid } from './util';

export const TEXT_FORMAT_HELP = `Quelle est la capitale de la France ?
* Paris
- Lyon
- Marseille

Le Soleil est une étoile.
= vrai

Combien de joueurs dans une équipe de foot ?
= 11 | onze

Remets dans l'ordre chronologique :
> Préhistoire
> Antiquité
> Moyen Âge

Quel est ton sport préféré ?
? Football
? Basket
? Natation`;

export function parseQuizText(text: string): Question[] {
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean)).filter((b) => b.length);
  const out: Question[] = [];
  for (const lines of blocks) {
    const title = lines[0].replace(/^(\d+[).]|Q\s*\d*\s*[:.)-])\s*/i, '');
    const rest = lines.slice(1);
    let time: number | undefined;
    const good: string[] = [], bad: string[] = [], eq: string[] = [], ord: string[] = [], poll: string[] = [];
    for (const l of rest) {
      const m = l.match(/^(?:t|temps)\s*[:=]\s*(\d+)/i);
      if (m) { time = Number(m[1]); continue; }
      if (/^[*+✔✓]/.test(l)) good.push(l.slice(1).trim());
      else if (/^[-–•]/.test(l)) bad.push(l.slice(1).trim());
      else if (l.startsWith('=')) eq.push(...l.slice(1).split('|').map((s) => s.trim()).filter(Boolean));
      else if (l.startsWith('>')) ord.push(l.slice(1).trim());
      else if (l.startsWith('?')) poll.push(l.slice(1).trim());
    }
    let q: Question;
    if (good.length || bad.length) {
      q = newQuestion('choice');
      q.answers = [...good.map((t) => ({ id: uid(5), text: t, correct: true })), ...bad.map((t) => ({ id: uid(5), text: t, correct: false }))];
      q.multi = good.length > 1;
    } else if (eq.length === 1 && /^(vrai|faux|true|false|v|f)$/i.test(eq[0])) {
      q = newQuestion('truefalse');
      q.correctBool = /^(vrai|true|v)$/i.test(eq[0]);
    } else if (eq.length) {
      q = newQuestion('type');
      q.accepted = eq;
    } else if (ord.length) {
      q = newQuestion('order');
      q.items = ord.map((t) => ({ id: uid(5), text: t }));
    } else if (poll.length) {
      q = newQuestion('poll');
      q.answers = poll.map((t) => ({ id: uid(5), text: t }));
    } else {
      q = newQuestion('open');
    }
    q.title = title;
    if (time) q.time = time;
    out.push(q);
  }
  return out;
}
