// Titre d'une question : texte normal, sauf pour un mini-jeu dont le titre est découpé en morceaux (titleParts) :
// chaque ligne est plus petite que la précédente (ex. « Calcul mental » énorme… « ne prenez pas cela à la légère » minuscule).
import { Rich } from '../components/Rich';
import { MINIGAMES } from './index';

const SIZES = [1, 0.62, 0.42, 0.3, 0.24, 0.2];

export function ShrinkTitle({ parts }: { parts: string[] }) {
  return (
    <span className="shrink-title">
      {parts.map((p, i) => <span key={i} style={{ fontSize: `${SIZES[Math.min(i, SIZES.length - 1)]}em` }}>{p}</span>)}
    </span>
  );
}

/** Titre de question ; si c'est le nom « à rallonge » d'un mini-jeu, il rétrécit ligne après ligne. */
export function QTitle({ title, minigame }: { title?: string; minigame?: string }) {
  const def = minigame ? MINIGAMES.find((m) => m.id === minigame) : undefined;
  if (def?.titleParts && title?.trim() === def.name) return <ShrinkTitle parts={def.titleParts} />;
  return <Rich text={title} />;
}
