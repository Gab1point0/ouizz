import type { CSSProperties } from 'react';

// Thèmes : uniquement des variables CSS. Pour en ajouter un, copier un bloc et changer les couleurs.
// Chaque thème peut aussi activer un « décor » animé (classe CSS dans styles/animations.css).

export interface Theme {
  id: string;
  name: string;
  vars: Record<string, string>;
  /** décor animé optionnel en arrière-plan (voir .deco-* dans animations.css) */
  deco?: 'bubbles' | 'stars' | 'confetti' | 'waves' | 'none';
}

const answerColors = {
  '--a1': '#ff6b5b', '--a2': '#3d8bfd', '--a3': '#f4b400', '--a4': '#20b486', '--a5': '#8b5cf6', '--a6': '#ec4899',
};

export const THEMES: Theme[] = [
  {
    id: 'craie', name: 'Craie (clair)', deco: 'none',
    vars: { '--bg': '#f6f5f2', '--bg2': '#ebe9e3', '--card': '#ffffff', '--fg': '#16161d', '--muted': '#6b6b76', '--accent': '#ff6b5b', '--line': '#dddad2', '--font': "'Inter', system-ui, sans-serif", ...answerColors },
  },
  {
    id: 'nuit', name: 'Nuit', deco: 'stars',
    vars: { '--bg': '#111118', '--bg2': '#1b1b25', '--card': '#22222e', '--fg': '#f3f3f7', '--muted': '#9a9aab', '--accent': '#ff6b5b', '--line': '#30303e', '--font': "'Inter', system-ui, sans-serif", ...answerColors },
  },
  {
    id: 'ocean', name: 'Océan', deco: 'bubbles',
    vars: { '--bg': '#0b3b5b', '--bg2': '#0f4c74', '--card': '#135a88', '--fg': '#f1f8ff', '--muted': '#a9cbe4', '--accent': '#4fd1c5', '--line': '#2a6f9e', '--font': "'Inter', system-ui, sans-serif", ...answerColors },
  },
  {
    id: 'foret', name: 'Forêt', deco: 'none',
    vars: { '--bg': '#eef3ea', '--bg2': '#dfe8d8', '--card': '#ffffff', '--fg': '#1d2a1b', '--muted': '#5d6e59', '--accent': '#2f855a', '--line': '#c9d7c1', '--font': "'Inter', system-ui, sans-serif", ...answerColors },
  },
  {
    id: 'bonbon', name: 'Bonbon', deco: 'confetti',
    vars: { '--bg': '#fff0f6', '--bg2': '#ffe0ee', '--card': '#ffffff', '--fg': '#3b1530', '--muted': '#8c5a7c', '--accent': '#d6336c', '--line': '#f7c6dc', '--font': "'Inter', system-ui, sans-serif", ...answerColors },
  },
  {
    id: 'stade', name: 'Stade', deco: 'waves',
    vars: { '--bg': '#0e3b22', '--bg2': '#13512f', '--card': '#17653a', '--fg': '#ffffff', '--muted': '#b7dcc4', '--accent': '#f4d03f', '--line': '#2a7a4d', '--font': "'Inter', system-ui, sans-serif", ...answerColors },
  },
  {
    id: 'retro', name: 'Rétro', deco: 'none',
    vars: { '--bg': '#fdf6e3', '--bg2': '#f3e9cc', '--card': '#fffaf0', '--fg': '#3c2f1e', '--muted': '#87735a', '--accent': '#cb4b16', '--line': '#e4d6b0', '--font': "'Courier New', ui-monospace, monospace", ...answerColors },
  },
];

export const themeById = (id?: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

export function themeStyle(id?: string): CSSProperties {
  return themeById(id).vars as unknown as CSSProperties;
}
