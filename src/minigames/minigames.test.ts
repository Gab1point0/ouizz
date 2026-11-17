import { describe, expect, it } from 'vitest';
import { minigameFractions, MINIGAMES } from './index';
import { grade } from '../scoring';

describe('mini-jeux', () => {
  it('meilleur score = 1, les autres au prorata', () => {
    expect(minigameFractions({ a: 40, b: 20, c: 0 })).toEqual({ a: 1, b: 0.5, c: 0 });
    expect(minigameFractions({ a: 0, b: 0 })).toEqual({ a: 0, b: 0 });
  });
  it('registre complet', () => {
    expect(MINIGAMES.map((m) => m.id)).toEqual(['67', 'maxime', 'dating', 'flap']);
    expect(grade({ id: 'q', type: 'minigame', title: '', time: 20, points: 1 }, 12)).toBe(1);
  });
});
