// « Calcul mental » : 10 calculs de plus en plus farfelus… qui donnent TOUS 67.
// Un niveau = plusieurs variantes ; une partie tire une variante par niveau.
// Chaque calcul a sa vérification (check) : le test calculs.test.ts s'assure qu'ils valent bien 67.

export interface Calcul { text: string; check: () => number }

const sumTo = (n: number) => (n * (n + 1)) / 2;
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const roman = (s: string) => {
  const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let t = 0;
  for (let i = 0; i < s.length; i++) t += v[s[i]] < (v[s[i + 1]] ?? 0) ? -v[s[i]] : v[s[i]];
  return t;
};
const nthPrime = (n: number) => { let c = 0; for (let k = 2; ; k++) { let p = true; for (let d = 2; d * d <= k; d++) if (k % d === 0) { p = false; break; } if (p && ++c === n) return k; } };
/** intégrale numérique (méthode des trapèzes) */
const integral = (f: (x: number) => number, a: number, b: number, n = 2000) => { let s = (f(a) + f(b)) / 2; const h = (b - a) / n; for (let i = 1; i < n; i++) s += f(a + i * h); return s * h; };

export const LEVELS: Calcul[][] = [
  [ // 1. échauffement
    { text: '60 + 7', check: () => 60 + 7 },
    { text: '70 − 3', check: () => 70 - 3 },
    { text: '100 − 33', check: () => 100 - 33 },
  ],
  [ // 2.
    { text: '8 × 8 + 3', check: () => 8 * 8 + 3 },
    { text: '134 ÷ 2', check: () => 134 / 2 },
    { text: '0,67 × 100', check: () => Math.round(0.67 * 100) },
  ],
  [ // 3.
    { text: '6 + 7 + 6 × 7 + 6 + 6', check: () => 6 + 7 + 6 * 7 + 6 + 6 },
    { text: '9 × 7 + 4', check: () => 9 * 7 + 4 },
    { text: '201 ÷ 3', check: () => 201 / 3 },
  ],
  [ // 4. puissances
    { text: '13² − 102', check: () => 13 ** 2 - 102 },
    { text: '5³ − 58', check: () => 5 ** 3 - 58 },
    { text: '2⁶ + 3', check: () => 2 ** 6 + 3 },
  ],
  [ // 5.
    { text: '√4489', check: () => Math.sqrt(4489) },
    { text: '(6 + 7)² − 102', check: () => (6 + 7) ** 2 - 102 },
    { text: 'log₂(1024) × 6 + 7', check: () => Math.log2(1024) * 6 + 7 },
  ],
  [ // 6. ça commence à dérailler
    { text: '6! ÷ 10 − 5', check: () => fact(6) / 10 - 5 },
    { text: 'MMXXVI − MCMLIX', check: () => roman('MMXXVI') - roman('MCMLIX') },
    { text: 'i² + 68', check: () => -1 + 68 },
    { text: '1 + 2 + 3 + … + 11 + 1', check: () => sumTo(11) + 1 },
  ],
  [ // 7. autres bases et trigonométrie
    { text: '0x43 (en hexadécimal)', check: () => 0x43 },
    { text: '1000011 (en binaire)', check: () => parseInt('1000011', 2) },
    { text: 'sin²(42) + cos²(42) + 66', check: () => Math.round(Math.sin(42) ** 2 + Math.cos(42) ** 2 + 66) },
  ],
  [ // 8. analyse
    { text: '∫₀¹ 134x dx', check: () => Math.round(integral((x) => 134 * x, 0, 1)) },
    { text: 'Σ (k = 1 → ∞) 67 ÷ 2ᵏ', check: () => { let s = 0; for (let k = 1; k < 60; k++) s += 67 / 2 ** k; return Math.round(s); } },
    { text: 'lim (x → +∞) (67x + 1) ÷ x', check: () => Math.round((67 * 1e9 + 1) / 1e9) },
  ],
  [ // 9. parties entières de constantes
    { text: '⌊e⁴⌋ + 13', check: () => Math.floor(Math.E ** 4) + 13 },
    { text: '⌊21π⌋ + 2', check: () => Math.floor(21 * Math.PI) + 2 },
    { text: '⌊100 × ln 2⌋ − 2', check: () => Math.floor(100 * Math.LN2) - 2 },
  ],
  [ // 10. n'importe quoi (mais juste)
    { text: 'Le 19ᵉ nombre premier', check: () => nthPrime(19) },
    { text: 'Nombre de lettres de « anticonstitutionnellement » × 3 − 8', check: () => 'anticonstitutionnellement'.length * 3 - 8 },
    { text: 'Code ASCII de la lettre « C »', check: () => 'C'.charCodeAt(0) },
    { text: 'Nombre de jours dans deux mois de février non bissextiles + 11', check: () => 28 * 2 + 11 },
    { text: 'Âge en 2026 d’une personne née en 1959', check: () => 2026 - 1959 },
  ],
];

/** Tire une série de 10 calculs (un par niveau, du plus simple au plus farfelu). */
export function drawCalculs(rand: () => number = Math.random): Calcul[] {
  return LEVELS.map((lv) => lv[Math.floor(rand() * lv.length)]);
}
