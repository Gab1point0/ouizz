import { describe, expect, it } from 'vitest';
import { parseQuizText } from './importText';
import { computePoints, grade } from './scoring';
import type { Question } from './types';
import { textMatches } from './util';

const base = (x: Partial<Question>): Question => ({ id: 'q', type: 'choice', title: 't', time: 20, points: 1, ...x });

describe('grade', () => {
  it('QCM simple', () => {
    const q = base({ answers: [{ id: 'a', text: 'A', correct: true }, { id: 'b', text: 'B' }] });
    expect(grade(q, ['a'])).toBe(1);
    expect(grade(q, ['b'])).toBe(0);
    expect(grade(q, [])).toBe(0);
  });
  it('QCM multiple avec et sans points partiels', () => {
    const answers = [{ id: 'a', text: 'A', correct: true }, { id: 'b', text: 'B', correct: true }, { id: 'c', text: 'C' }];
    expect(grade(base({ answers, multi: true }), ['a', 'b'])).toBe(1);
    expect(grade(base({ answers, multi: true }), ['a'])).toBe(0);
    expect(grade(base({ answers, multi: true, partial: true }), ['a'])).toBe(0.5);
    expect(grade(base({ answers, multi: true, partial: true }), ['a', 'c'])).toBe(0);
  });
  it('vrai/faux', () => {
    expect(grade(base({ type: 'truefalse', correctBool: false }), false)).toBe(1);
    expect(grade(base({ type: 'truefalse', correctBool: false }), true)).toBe(0);
  });
  it('réponse tapée tolérante', () => {
    const q = base({ type: 'type', accepted: ['Océan Pacifique'], fuzzy: true });
    expect(grade(q, 'ocean pacifique')).toBe(1);
    expect(grade(q, 'Océan Pacifiqe')).toBe(1);
    expect(grade(q, 'Atlantique')).toBe(0);
    expect(textMatches('la France', 'France', false)).toBe(true);
    expect(textMatches('3,5', '3.5', false)).toBe(true);
  });
  it('ordre', () => {
    const q = base({ type: 'order', items: [{ id: '1', text: '' }, { id: '2', text: '' }, { id: '3', text: '' }, { id: '4', text: '' }], partial: true });
    expect(grade(q, ['1', '2', '3', '4'])).toBe(1);
    expect(grade(q, ['1', '2', '4', '3'])).toBe(0.5);
    expect(grade({ ...q, partial: false }, ['1', '2', '4', '3'])).toBe(0);
  });
  it('curseur', () => {
    const q = base({ type: 'slider', slider: { min: 0, max: 100, step: 1, correct: 50, margin: 2 } });
    expect(grade(q, 52)).toBe(1);
    expect(grade(q, 50 + 2 + 12.5)).toBe(0.5);
    expect(grade(q, 0)).toBe(0);
  });
  it('point sur image (zone circulaire même si image non carrée)', () => {
    const q = base({ type: 'pin', zone: { x: 0.5, y: 0.5, r: 0.1, ar: 0.5 } });
    expect(grade(q, { x: 0.55, y: 0.5 })).toBe(1);
    expect(grade(q, { x: 0.5, y: 0.68 })).toBe(1); // 0.18 * 0.5 = 0.09 < 0.1
    expect(grade(q, { x: 0.5, y: 0.75 })).toBe(0);
  });
  it('point sur image : rectangle, forme libre, plusieurs zones', () => {
    const q = base({ type: 'pin', zones: [
      { shape: 'rect', x: 0.2, y: 0.2, r: 0, w: 0.2, h: 0.1 },
      { shape: 'poly', x: 0, y: 0, r: 0, pts: [[0.5, 0.5], [0.9, 0.5], [0.5, 0.9]] }, // triangle
    ] });
    expect(grade(q, { x: 0.29, y: 0.24 })).toBe(1);
    expect(grade(q, { x: 0.31, y: 0.2 })).toBe(0);
    expect(grade(q, { x: 0.6, y: 0.6 })).toBe(1);
    expect(grade(q, { x: 0.8, y: 0.8 })).toBe(0); // hors du triangle (au-delà de l'hypoténuse)
  });
  it('paires, catégories, trous', () => {
    const m = base({ type: 'match', pairs: [{ id: 'p1', left: 'a', right: 'b' }, { id: 'p2', left: 'c', right: 'd' }], partial: true });
    expect(grade(m, { p1: 'p1', p2: 'p2' })).toBe(1);
    expect(grade(m, { p1: 'p2', p2: 'p2' })).toBe(0.5);
    const c = base({ type: 'categorize', categories: [{ id: 'A', name: '' }, { id: 'B', name: '' }], catItems: [{ id: 'x', text: '', cat: 'A' }, { id: 'y', text: '', cat: 'B' }] });
    expect(grade(c, { x: 'A', y: 'B' })).toBe(1);
    expect(grade(c, { x: 'B', y: 'B' })).toBe(0);
    const b = base({ type: 'blanks', blankText: 'La [France|la france] et [Rome].', partial: true });
    expect(grade(b, ['france', 'rome'])).toBe(1);
    expect(grade(b, ['france', 'paris'])).toBe(0.5);
  });
  it('questions sans note', () => {
    expect(grade(base({ type: 'poll' }), ['a'])).toBeNull();
    expect(grade(base({ type: 'wordcloud' }), ['a'])).toBeNull();
  });
});

describe('computePoints', () => {
  const p = { fraction: 1, multiplier: 1, elapsed: 0, limit: 20000, speedBonus: true, streak: 0, streakBonus: true };
  it('rapidité', () => {
    expect(computePoints(p).points).toBe(1000);
    expect(computePoints({ ...p, elapsed: 20000 }).points).toBe(500);
    expect(computePoints({ ...p, speedBonus: false, elapsed: 20000 }).points).toBe(1000);
  });
  it('points doublés et série', () => {
    expect(computePoints({ ...p, multiplier: 2 }).points).toBe(2000);
    const r = computePoints({ ...p, streak: 2 });
    expect(r.streak).toBe(3);
    expect(r.bonus).toBe(200);
    expect(computePoints({ ...p, fraction: 0, streak: 4 }).streak).toBe(0);
  });
});

describe('import texte', () => {
  it('reconnaît les types', () => {
    const qs = parseQuizText('Q1 ?\n* oui\n- non\n\nVrai ?\n= vrai\n\nNombre ?\n= 11 | onze\n\nOrdre\n> a\n> b\n\nSondage\n? x\n? y\nt: 45');
    expect(qs.map((q) => q.type)).toEqual(['choice', 'truefalse', 'type', 'order', 'poll']);
    expect(qs[2].accepted).toEqual(['11', 'onze']);
    expect(qs[4].time).toBe(45);
  });
});
