// Mini-jeux joués sur le téléphone pendant une question de type « minigame ».
// Chaque joueur fait un score ; à la révélation, le meilleur score gagne tous les points, les autres au prorata.
// Ajouter un mini-jeu = un composant (props MinigameProps) + une entrée dans MINIGAMES. Rien d'autre à toucher.
import type { ComponentType } from 'react';
import { SixSeven } from './SixSeven';
import { MaximeRunner } from './MaximeRunner';
import { DatingSim } from './DatingSim';
import { FlapEmile } from './FlapEmile';

export interface MinigameProps {
  /** heure (Date.now) de fin de la question : le jeu s'arrête juste avant et envoie le score */
  endsAt: number;
  /** à appeler une seule fois avec le score final (fin du temps ou partie perdue) */
  onFinish: (score: number) => void;
}

export interface MinigameDef {
  id: string;
  name: string;
  icon: string;
  /** une phrase pour l'éditeur et le grand écran */
  pitch: string;
  /** comment jouer (grand écran pendant la partie) */
  howTo: string;
  /** unité du score (« 67 », « m »…) */
  unit: string;
  /** durée conseillée (s), compte à rebours compris */
  time: number;
  Component: ComponentType<MinigameProps>;
}

export const MINIGAMES: MinigameDef[] = [
  {
    id: '67', name: '67 Challenge', icon: '🫲🫱', unit: '67', time: 20, Component: SixSeven,
    pitch: 'Tape main gauche, main droite, gauche, droite… le plus vite possible. Chaque « 6-7 » rapporte.',
    howTo: 'Alternez main gauche (6) et main droite (7) le plus vite possible !',
  },
  {
    id: 'maxime', name: 'Maxime pendant l’ellipse', icon: '🏃', unit: 'm', time: 45, Component: MaximeRunner,
    pitch: 'Course sans fin : saute les burgers, double-saute les tacos, baisse-toi sous les enseignes. Plus tu cours, plus Maxime maigrit. 3 vies.',
    howTo: 'Sautez par-dessus la malbouffe, double saut pour les tacos, baissez-vous sous les enseignes. 3 vies !',
  },
  {
    id: 'dating', name: 'Clint’s Dating Sim', icon: '💘', unit: '💘', time: 63, Component: DatingSim,
    pitch: 'Des gens apparaissent partout à l’écran : touche uniquement les petits (casquette ou robe/jupe, cocktail à la main), pas les grands ni les personnes âgées. 1 minute.',
    howTo: 'Touchez seulement les petits (casquette ou robe/jupe, cocktail à la main) ! Grands et papis-mamies = −1.',
  },
  {
    id: 'flap', name: 'Flap Emile', icon: '✈️', unit: '🌴', time: 45, Component: FlapEmile,
    pitch: 'Pilote l’avion Emile Airlines dans la jungle amazonienne : touche pour remonter, passe entre les arbres et les lianes. Les singes lancent des bananes (sans danger). 3 vies.',
    howTo: 'Touchez l’écran pour remonter et passez entre les arbres ! 3 vies.',
  },
];

export const minigameOf = (id?: string): MinigameDef => MINIGAMES.find((m) => m.id === id) ?? MINIGAMES[0];

/** Part des points de chacun : meilleur score = 1, les autres au prorata (0 si personne n'a marqué). */
export function minigameFractions(scores: Record<string, number>): Record<string, number> {
  const best = Math.max(0, ...Object.values(scores).map((v) => (Number.isFinite(v) ? v : 0)));
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(scores)) out[k] = best > 0 ? Math.max(0, Math.min(1, (Number(v) || 0) / best)) : 0;
  return out;
}
