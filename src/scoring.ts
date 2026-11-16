import type { AnswerPayload, Question } from './types';
import { normalize, parseBlanks, textMatches } from './util';

/**
 * Note d'une réponse entre 0 et 1 (fraction de la réussite), ou null pour une question non notée.
 * Fonction pure : testée dans scoring.test.ts.
 */
export function grade(q: Question, a: AnswerPayload | undefined): number | null {
  if (a === undefined || a === null) return 0;
  switch (q.type) {
    case 'choice': {
      const good = new Set((q.answers ?? []).filter((x) => x.correct).map((x) => x.id));
      const picked = new Set(Array.isArray(a) ? (a as string[]) : []);
      if (!picked.size) return 0;
      if (!q.multi) {
        // une seule réponse attendue (s'il y a plusieurs bonnes réponses, n'importe laquelle compte)
        const [p] = picked;
        return good.has(p) ? 1 : 0;
      }
      let hits = 0;
      for (const p of picked) if (good.has(p)) hits++;
      const wrong = picked.size - hits;
      if (hits === good.size && wrong === 0) return 1;
      if (!q.partial) return 0;
      return Math.max(0, (hits - wrong) / good.size);
    }
    case 'truefalse':
      return a === q.correctBool ? 1 : 0;
    case 'type':
      return typeof a === 'string' && (q.accepted ?? []).some((e) => textMatches(a, e, q.fuzzy !== false)) ? 1 : 0;
    case 'order': {
      const want = (q.items ?? []).map((x) => x.id);
      const got = Array.isArray(a) ? (a as string[]) : [];
      if (!want.length) return 0;
      const ok = want.filter((id, i) => got[i] === id).length;
      if (ok === want.length) return 1;
      return q.partial ? ok / want.length : 0;
    }
    case 'slider': {
      const s = q.slider!;
      if (typeof a !== 'number') return 0;
      const d = Math.abs(a - s.correct);
      if (d <= s.margin + 1e-9) return 1;
      const range = s.max - s.min || 1;
      const f = 1 - (d - s.margin) / (0.25 * range);
      return Math.max(0, Math.round(f * 100) / 100);
    }
    case 'pin': {
      const z = q.zone;
      if (!z || typeof a !== 'object' || a === null || !('x' in a)) return 0;
      const p = a as { x: number; y: number };
      return Math.hypot(p.x - z.x, (p.y - z.y) * (z.ar ?? 1)) <= z.r ? 1 : 0;
    }
    case 'match': {
      const pairs = q.pairs ?? [];
      const got = (a ?? {}) as Record<string, string>;
      if (!pairs.length) return 0;
      // la réponse associe l'id de la paire (gauche) à l'id de la paire (droite)
      const ok = pairs.filter((p) => got[p.id] === p.id).length;
      if (ok === pairs.length) return 1;
      return q.partial ? ok / pairs.length : 0;
    }
    case 'categorize': {
      const items = q.catItems ?? [];
      const got = (a ?? {}) as Record<string, string>;
      if (!items.length) return 0;
      const ok = items.filter((x) => got[x.id] === x.cat).length;
      if (ok === items.length) return 1;
      return q.partial ? ok / items.length : 0;
    }
    case 'blanks': {
      const { blanks } = parseBlanks(q.blankText ?? '');
      const got = Array.isArray(a) ? (a as string[]) : [];
      if (!blanks.length) return 0;
      const ok = blanks.filter((variants, i) => {
        const g = got[i] ?? '';
        if (q.blankMode === 'choice') return normalize(g) === normalize(variants[0]);
        return variants.some((v) => textMatches(g, v, true));
      }).length;
      if (ok === blanks.length) return 1;
      return q.partial ? ok / blanks.length : 0;
    }
    case 'buzzer':
      return a === true ? 1 : 0;
    default:
      return null;
  }
}

export interface PointsInput {
  fraction: number;
  multiplier: number;
  /** temps de réponse (ms) et durée de la question (ms, 0 = illimité) */
  elapsed: number;
  limit: number;
  speedBonus: boolean;
  /** série de bonnes réponses AVANT cette question */
  streak: number;
  streakBonus: boolean;
}

export const BASE_POINTS = 1000;

/** Points gagnés + nouvelle série. Les points rapides : jusqu'à moitié moins si on répond à la dernière seconde. */
export function computePoints(p: PointsInput): { points: number; streak: number; bonus: number } {
  const full = p.fraction >= 0.999;
  const streak = full ? p.streak + 1 : 0;
  if (p.multiplier <= 0 || p.fraction <= 0) return { points: 0, streak, bonus: 0 };
  let speed = 1;
  if (p.speedBonus && p.limit > 0) speed = 1 - 0.5 * Math.min(1, Math.max(0, p.elapsed / p.limit));
  const pts = Math.round(BASE_POINTS * p.multiplier * p.fraction * speed);
  const bonus = full && p.streakBonus && streak >= 2 ? Math.min(streak - 1, 5) * 100 * p.multiplier : 0;
  return { points: pts + bonus, streak, bonus };
}
