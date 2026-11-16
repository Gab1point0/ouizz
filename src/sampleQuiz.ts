// Quiz de démonstration : un exemple de chaque type de question.
import { newQuestion } from './qtypes';
import type { Question, Quiz } from './types';
import { uid } from './util';

const svg = (s: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;

const PIN_IMAGE = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
<rect width="800" height="500" fill="#e9f5ff"/>
<circle cx="140" cy="120" r="60" fill="#3d8bfd"/><rect x="300" y="60" width="140" height="140" rx="16" fill="#20b486"/>
<polygon points="620,60 700,200 540,200" fill="#f4b400"/><circle cx="420" cy="370" r="55" fill="#ff6b5b"/>
<rect x="90" y="300" width="160" height="110" rx="16" fill="#8b5cf6"/><circle cx="660" cy="380" r="50" fill="#ec4899"/>
</svg>`);

const ch = (text: string, correct = false) => ({ id: uid(5), text, correct });
const it = (text: string) => ({ id: uid(5), text });

export function makeSampleQuiz(): Quiz {
  const q = (type: Question['type'], extra: Partial<Question>): Question => ({ ...newQuestion(type), ...extra });
  const catA = uid(5), catB = uid(5);
  return {
    id: uid(),
    title: 'Démo : tous les types de questions',
    description: 'Un exemple de chaque type pour découvrir Ouizz.',
    theme: 'nuit',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    questions: [
      q('slide', { title: 'Bienvenue !', body: 'Ce quiz montre chaque type de question.\nPrends ton téléphone et réponds le plus vite possible.' }),
      q('choice', { title: 'Quelle est la capitale de l’Australie ?', answers: [ch('Sydney'), ch('Canberra', true), ch('Melbourne'), ch('Perth')], note: 'Canberra a été choisie comme compromis entre Sydney et Melbourne.' }),
      q('choice', { title: 'Lesquels sont des mammifères ?', multi: true, partial: true, answers: [ch('Dauphin', true), ch('Requin'), ch('Chauve-souris', true), ch('Manchot')] }),
      q('truefalse', { title: 'La Grande Muraille de Chine est visible à l’œil nu depuis la Lune.', correctBool: false, note: 'C’est une légende !' }),
      q('type', { title: 'Quel est le plus grand océan du monde ?', accepted: ['Pacifique', 'océan Pacifique'] }),
      q('order', { title: 'Du plus petit au plus grand :', items: [it('Fourmi'), it('Souris'), it('Chat'), it('Cheval'), it('Éléphant')] }),
      q('slider', { title: 'En quelle année a eu lieu le premier pas sur la Lune ?', slider: { min: 1950, max: 2000, step: 1, correct: 1969, margin: 1, unit: '' } }),
      q('pin', { title: 'Touche le cercle rouge !', media: { kind: 'image', src: PIN_IMAGE }, zone: { x: 0.525, y: 0.74, r: 0.075, ar: 0.625 } }),
      q('match', { title: 'Associe chaque pays à sa capitale', pairs: [{ id: uid(5), left: 'Italie', right: 'Rome' }, { id: uid(5), left: 'Espagne', right: 'Madrid' }, { id: uid(5), left: 'Portugal', right: 'Lisbonne' }, { id: uid(5), left: 'Grèce', right: 'Athènes' }] }),
      q('categorize', {
        title: 'Fruit ou légume ?', categories: [{ id: catA, name: 'Fruit' }, { id: catB, name: 'Légume' }],
        catItems: [{ id: uid(5), text: 'Pomme', cat: catA }, { id: uid(5), text: 'Carotte', cat: catB }, { id: uid(5), text: 'Fraise', cat: catA }, { id: uid(5), text: 'Poireau', cat: catB }],
      }),
      q('blanks', { title: 'Complète la phrase', blankText: 'La Seine traverse [Paris] avant de se jeter dans la [Manche].', blankMode: 'choice', distractors: ['Lyon', 'Méditerranée'] }),
      q('buzzer', { title: 'Buzzer : citez un pays qui commence par la lettre Z', buzzAnswer: 'Zambie, Zimbabwe' }),
      q('poll', { title: 'Quel est ton moment préféré de la journée ?', answers: [ch('Le matin'), ch('Le midi'), ch('Le soir'), ch('La nuit')] }),
      q('wordcloud', { title: 'Un mot pour décrire ce quiz ?', maxWords: 2 }),
      q('scale', { title: 'Tes goûts', statements: ['J’aime le sport', 'J’aime la musique'], scaleMax: 5, minLabel: 'Pas du tout', maxLabel: 'Énormément' }),
      q('ranking', { title: 'Classe ces vacances de la meilleure à la moins bonne', items: [it('Mer'), it('Montagne'), it('Campagne'), it('Ville')] }),
      q('points100', { title: 'Répartis 100 points selon ce qui compte pour toi', items: [it('Les amis'), it('La famille'), it('Le travail'), it('Les loisirs')] }),
      q('draw', { title: 'Dessine un chat en 60 secondes !' }),
      q('brainstorm', { title: 'Idées pour la prochaine soirée ?', maxWords: 2, votes: 2, time: 45 }),
      q('open', { title: 'Un dernier mot pour l’animateur ?' }),
    ],
  };
}
