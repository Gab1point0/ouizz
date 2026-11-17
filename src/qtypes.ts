import { zoneOk, zonesOf } from './zones';
import type { QType, Question } from './types';
import { uid } from './util';

export interface QTypeInfo {
  type: QType;
  label: string;
  icon: string;
  group: 'quiz' | 'avis' | 'contenu';
  scored: boolean;
  help: string;
  time: number;
  /** l'image doit être visible sur les téléphones pour répondre */
  phoneNeedsMedia?: boolean;
  make: () => Partial<Question>;
}

const ch = (text: string, correct = false) => ({ id: uid(5), text, correct });
const it = (text: string) => ({ id: uid(5), text });

export const QTYPES: QTypeInfo[] = [
  {
    type: 'choice', label: 'Quiz (QCM)', icon: '🔠', group: 'quiz', scored: true, time: 20,
    help: '2 à 6 réponses, une ou plusieurs bonnes réponses.',
    make: () => ({ answers: [ch('', true), ch(''), ch(''), ch('')], multi: false, partial: false }),
  },
  {
    type: 'truefalse', label: 'Vrai ou faux', icon: '⚖️', group: 'quiz', scored: true, time: 15,
    help: 'Deux boutons : vrai / faux.',
    make: () => ({ correctBool: true }),
  },
  {
    type: 'type', label: 'Réponse à taper', icon: '⌨️', group: 'quiz', scored: true, time: 30,
    help: 'Les joueurs écrivent la réponse. Accents, majuscules et petites fautes tolérés.',
    make: () => ({ accepted: [''], fuzzy: true }),
  },
  {
    type: 'order', label: 'Remettre dans l’ordre', icon: '🔢', group: 'quiz', scored: true, time: 40,
    help: 'Les éléments sont mélangés ; écris-les ici dans le bon ordre.',
    make: () => ({ items: [it(''), it(''), it(''), it('')], partial: true }),
  },
  {
    type: 'slider', label: 'Estimation (curseur)', icon: '🎚️', group: 'quiz', scored: true, time: 25,
    help: 'Trouver un nombre. Plus on est proche, plus on gagne de points.',
    make: () => ({ slider: { min: 0, max: 100, step: 1, correct: 50, margin: 0, unit: '' } }),
  },
  {
    type: 'pin', label: 'Point sur l’image', icon: '📍', group: 'quiz', scored: true, time: 30, phoneNeedsMedia: true,
    help: 'Toucher le bon endroit sur l’image (carte, schéma, photo…).',
    make: () => ({ zone: { x: 0.5, y: 0.5, r: 0.1 } }),
  },
  {
    type: 'match', label: 'Associer les paires', icon: '🔗', group: 'quiz', scored: true, time: 45,
    help: 'Relier chaque élément de gauche à celui de droite.',
    make: () => ({ pairs: [{ id: uid(5), left: '', right: '' }, { id: uid(5), left: '', right: '' }, { id: uid(5), left: '', right: '' }], partial: true }),
  },
  {
    type: 'categorize', label: 'Classer par catégorie', icon: '🗂️', group: 'quiz', scored: true, time: 45,
    help: 'Ranger chaque élément dans la bonne catégorie.',
    make: () => {
      const a = uid(5), b = uid(5);
      return { categories: [{ id: a, name: '' }, { id: b, name: '' }], catItems: [{ id: uid(5), text: '', cat: a }, { id: uid(5), text: '', cat: b }], partial: true };
    },
  },
  {
    type: 'blanks', label: 'Texte à trous', icon: '🧩', group: 'quiz', scored: true, time: 45,
    help: 'Mets les mots à trouver entre crochets : « La capitale de l’Italie est [Rome]. » Variantes : [Rome|Roma].',
    make: () => ({ blankText: '', blankMode: 'type', distractors: [], partial: true }),
  },
  {
    type: 'buzzer', label: 'Buzzer (oral)', icon: '🔔', group: 'quiz', scored: true, time: 0,
    help: 'Le premier qui buzze répond à voix haute ; tu valides ou refuses.',
    make: () => ({ buzzAnswer: '' }),
  },
  {
    type: 'poll', label: 'Sondage', icon: '📊', group: 'avis', scored: false, time: 20,
    help: 'Recueillir des avis, sans bonne réponse.',
    make: () => ({ answers: [ch(''), ch(''), ch('')], multi: false }),
  },
  {
    type: 'wordcloud', label: 'Nuage de mots', icon: '☁️', group: 'avis', scored: false, time: 30,
    help: 'Chacun propose 1 à 3 mots ; les plus cités grossissent.',
    make: () => ({ maxWords: 1 }),
  },
  {
    type: 'open', label: 'Réponse ouverte', icon: '💬', group: 'avis', scored: false, time: 60,
    help: 'Réponses libres affichées en mur de post-it.',
    make: () => ({}),
  },
  {
    type: 'scale', label: 'Échelle', icon: '📏', group: 'avis', scored: false, time: 30,
    help: 'Noter une ou plusieurs affirmations (ex. de 1 à 5).',
    make: () => ({ statements: [''], scaleMax: 5, minLabel: 'Pas du tout', maxLabel: 'Tout à fait' }),
  },
  {
    type: 'ranking', label: 'Classement d’avis', icon: '🏅', group: 'avis', scored: false, time: 40,
    help: 'Chacun classe les éléments ; on affiche le classement moyen.',
    make: () => ({ items: [it(''), it(''), it('')] }),
  },
  {
    type: 'points100', label: '100 points à répartir', icon: '💯', group: 'avis', scored: false, time: 45,
    help: 'Chacun répartit 100 points entre les options.',
    make: () => ({ items: [it(''), it(''), it('')] }),
  },
  {
    type: 'draw', label: 'Dessin', icon: '🎨', group: 'avis', scored: false, time: 60,
    help: 'Chacun dessine sur son téléphone ; galerie sur l’écran.',
    make: () => ({}),
  },
  {
    type: 'brainstorm', label: 'Brainstorming + vote', icon: '💡', group: 'avis', scored: false, time: 60,
    help: 'On propose des idées, puis chacun vote pour ses préférées.',
    make: () => ({ maxWords: 3, votes: 3 }),
  },
  {
    type: 'slide', label: 'Diapositive', icon: '🖼️', group: 'contenu', scored: false, time: 0,
    help: 'Un écran d’information (texte, image, vidéo YouTube) entre deux questions.',
    make: () => ({ body: '' }),
  },
];

export const QT = Object.fromEntries(QTYPES.map((t) => [t.type, t])) as Record<QType, QTypeInfo>;

export const isScored = (q: Question) => QT[q.type].scored && q.points > 0;

export function newQuestion(type: QType = 'choice'): Question {
  const info = QT[type];
  return { id: uid(), type, title: '', time: info.time, points: info.scored ? 1 : 0, ...info.make() } as Question;
}

/** Change le type d'une question en gardant ce qui peut l'être. */
export function changeType(q: Question, type: QType): Question {
  const info = QT[type];
  const base = info.make();
  const next: Question = { ...base, ...q, type, time: q.type === type ? q.time : info.time, points: info.scored ? (q.points || 1) : 0 } as Question;
  // les champs propres au nouveau type doivent exister
  for (const [k, v] of Object.entries(base)) {
    const cur = (next as unknown as Record<string, unknown>)[k];
    if (cur === undefined || (Array.isArray(v) && Array.isArray(cur) && cur.length === 0)) (next as unknown as Record<string, unknown>)[k] = v;
  }
  // sondage <-> QCM : on garde les réponses mais pas les bonnes réponses du sondage
  if (type === 'poll' && next.answers) next.answers = next.answers.map((a) => ({ ...a, correct: false }));
  if (type === 'choice' && next.answers && !next.answers.some((a) => a.correct)) next.answers = next.answers.map((a, i) => ({ ...a, correct: i === 0 }));
  return next;
}

/** Problèmes empêchant de jouer une question (affichés dans l'éditeur). */
export function questionProblems(q: Question): string[] {
  const p: string[] = [];
  if (!q.title.trim() && q.type !== 'slide') p.push('La question n’a pas d’intitulé.');
  if (q.type === 'slide' && !q.title.trim() && !q.body?.trim() && !q.media) p.push('La diapositive est vide.');
  switch (q.type) {
    case 'choice':
    case 'poll': {
      const a = (q.answers ?? []).filter((x) => x.text.trim() || x.image);
      if (a.length < 2) p.push('Il faut au moins 2 réponses.');
      if (q.type === 'choice' && !a.some((x) => x.correct)) p.push('Coche au moins une bonne réponse.');
      break;
    }
    case 'type':
      if (!(q.accepted ?? []).some((s) => s.trim())) p.push('Indique au moins une réponse acceptée.');
      break;
    case 'order':
    case 'ranking':
    case 'points100':
      if ((q.items ?? []).filter((x) => x.text.trim()).length < 2) p.push('Il faut au moins 2 éléments.');
      break;
    case 'slider': {
      const s = q.slider!;
      if (!(s.max > s.min)) p.push('Le maximum doit être plus grand que le minimum.');
      if (s.correct < s.min || s.correct > s.max) p.push('La bonne réponse doit être entre le min et le max.');
      break;
    }
    case 'pin':
      if (!q.media || q.media.kind !== 'image') p.push('Ajoute une image et place la zone correcte.');
      else if (!zonesOf(q).some(zoneOk)) p.push('Trace au moins une zone correcte (une forme libre a besoin d’au moins 3 points).');
      break;
    case 'match':
      if ((q.pairs ?? []).filter((x) => x.left.trim() && x.right.trim()).length < 2) p.push('Il faut au moins 2 paires complètes.');
      break;
    case 'categorize':
      if ((q.categories ?? []).filter((c) => c.name.trim()).length < 2) p.push('Il faut au moins 2 catégories.');
      if ((q.catItems ?? []).filter((c) => c.text.trim()).length < 2) p.push('Il faut au moins 2 éléments à classer.');
      break;
    case 'blanks':
      if (!/\[[^\]]+\]/.test(q.blankText ?? '')) p.push('Mets au moins un mot entre [crochets].');
      break;
    case 'scale':
      if (!(q.statements ?? []).some((s) => s.trim())) p.push('Ajoute au moins une affirmation.');
      break;
  }
  return p;
}

/** Nettoie une question avant la partie (retire les lignes vides). */
export function cleanQuestion(q: Question): Question {
  const c: Question = { ...q };
  if (c.answers) c.answers = c.answers.filter((a) => a.text.trim() || a.image);
  if (c.items) c.items = c.items.filter((a) => a.text.trim());
  if (c.pairs) c.pairs = c.pairs.filter((a) => a.left.trim() && a.right.trim());
  if (c.categories) c.categories = c.categories.filter((a) => a.name.trim());
  if (c.catItems) c.catItems = c.catItems.filter((a) => a.text.trim() && c.categories?.some((k) => k.id === a.cat));
  if (c.accepted) c.accepted = c.accepted.filter((a) => a.trim());
  if (c.statements) c.statements = c.statements.filter((a) => a.trim());
  if (c.distractors) c.distractors = c.distractors.filter((a) => a.trim());
  return c;
}
