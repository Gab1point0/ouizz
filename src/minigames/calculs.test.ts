import { describe, expect, it } from 'vitest';
import { drawCalculs, LEVELS } from './calculs';

describe('Calcul mental', () => {
  it('chaque calcul vaut bien 67', () => {
    for (const lv of LEVELS) for (const c of lv) expect([c.text, c.check()]).toEqual([c.text, 67]);
  });
  it('10 niveaux, une série = 10 calculs', () => {
    expect(LEVELS.length).toBe(10);
    expect(drawCalculs().length).toBe(10);
  });
});
