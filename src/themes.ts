import type { CSSProperties } from 'react';
import type { QuizStyle } from './types';

// Thèmes prêts à l'emploi : des variables CSS + éventuellement des réglages d'apparence (police, tuiles, décor…).
// Pour en ajouter un : copier un bloc et changer les valeurs. Tout ce qui est réglé ici peut être
// modifié ensuite dans « 🎨 Apparence » de l'éditeur.

export interface Theme {
  id: string;
  name: string;
  vars: Record<string, string>;
  style?: Partial<QuizStyle>;
}

export const DEFAULT_ANSWER_COLORS = ['#ff6b5b', '#3d8bfd', '#f4b400', '#20b486', '#8b5cf6', '#ec4899'];
const ac = (c: string[] = DEFAULT_ANSWER_COLORS) => Object.fromEntries(c.map((x, i) => [`--a${i + 1}`, x]));
const base = (bg: string, bg2: string, card: string, fg: string, muted: string, accent: string, line: string, colors?: string[]) => ({
  '--bg': bg, '--bg2': bg2, '--card': card, '--fg': fg, '--muted': muted, '--accent': accent, '--line': line, ...ac(colors),
});

export const THEMES: Theme[] = [
  { id: 'craie', name: 'Craie (clair)', vars: base('#f6f5f2', '#ebe9e3', '#ffffff', '#16161d', '#6b6b76', '#ff6b5b', '#dddad2') },
  { id: 'nuit', name: 'Nuit étoilée', vars: base('#111118', '#1b1b25', '#22222e', '#f3f3f7', '#9a9aab', '#ff6b5b', '#30303e'), style: { deco: 'stars' } },
  { id: 'ocean', name: 'Océan', vars: base('#0b3b5b', '#0f4c74', '#135a88', '#f1f8ff', '#a9cbe4', '#4fd1c5', '#2a6f9e'), style: { deco: 'bubbles', bgMode: 'gradient', bg: '#0b3b5b', bg2: '#07203a', gradAngle: 180 } },
  { id: 'foret', name: 'Forêt', vars: base('#eef3ea', '#dfe8d8', '#ffffff', '#1d2a1b', '#5d6e59', '#2f855a', '#c9d7c1'), style: { deco: 'leaves', font: 'nunito' } },
  { id: 'bonbon', name: 'Bonbon', vars: base('#fff0f6', '#ffe0ee', '#ffffff', '#3b1530', '#8c5a7c', '#d6336c', '#f7c6dc', ['#ff8fab', '#74c0fc', '#ffd43b', '#8ce99a', '#b197fc', '#ffa8a8']), style: { deco: 'hearts', font: 'fredoka', tileStyle: 'pastel', radius: 1.6 } },
  { id: 'stade', name: 'Stade', vars: base('#0e3b22', '#13512f', '#17653a', '#ffffff', '#b7dcc4', '#f4d03f', '#2a7a4d'), style: { deco: 'waves', titleFont: 'bebas', titleUpper: true, tileStyle: '3d' } },
  { id: 'retro', name: 'Rétro papier', vars: base('#fdf6e3', '#f3e9cc', '#fffaf0', '#3c2f1e', '#87735a', '#cb4b16', '#e4d6b0'), style: { font: 'courier', radius: 0.4, tileStyle: 'flat' } },
  { id: 'neon', name: 'Néon', vars: base('#07070f', '#10101e', '#141428', '#f0f0ff', '#8a8ab0', '#00f0ff', '#2a2a4a', ['#ff2a6d', '#05d9e8', '#f9f871', '#39ff14', '#b967ff', '#ff9f1c']), style: { font: 'orbitron', tileStyle: 'glass', deco: 'grid', bgMode: 'gradient', bg: '#120a2a', bg2: '#05050c', gradType: 'radial', textShadow: true } },
  { id: 'arcade', name: 'Arcade 8-bit', vars: base('#1a1c2c', '#262b44', '#333c57', '#f4f4f4', '#94b0c2', '#ffcd75', '#566c86', ['#b13e53', '#41a6f6', '#ffcd75', '#38b764', '#5d275d', '#ef7d57']), style: { font: 'righteous', titleFont: 'pixel', radius: 0, tileStyle: '3d', soundPack: 'retro', music: 'retro', labels: 'numbers', deco: 'sparkles' } },
  { id: 'tableau', name: 'Tableau noir', vars: base('#24372f', '#2d4339', '#2f4a3e', '#f5f3e8', '#c8d1c0', '#ffe066', '#45604f'), style: { font: 'caveat', titleFont: 'marker', tileStyle: 'outline', radius: 0.5 } },
  { id: 'plage', name: 'Plage', vars: base('#fff7e6', '#ffe8bf', '#fffdf7', '#2d3a4a', '#6b7a8c', '#00a6a6', '#f3d9a4', ['#ff7f50', '#00a6a6', '#ffbe0b', '#3a86ff', '#fb5607', '#8338ec']), style: { bgMode: 'gradient', bg: '#9be7ff', bg2: '#fff1c1', gradAngle: 180, font: 'baloo', deco: 'bubbles' } },
  { id: 'halloween', name: 'Halloween', vars: base('#140d1f', '#1f1430', '#2a1b40', '#fff4e0', '#b9a3d1', '#ff7518', '#3c2858', ['#ff7518', '#8e44ad', '#2ecc71', '#f1c40f', '#e74c3c', '#95a5a6']), style: { font: 'baloo', titleFont: 'creepster', deco: 'emoji', decoEmoji: '🎃👻🦇🕸️', music: 'suspense', labels: 'emoji', labelEmojis: '🎃👻🦇🕷️💀🍬' } },
  { id: 'noel', name: 'Noël', vars: base('#0f2e1f', '#16402b', '#1c4d34', '#ffffff', '#c6dccd', '#e63946', '#2c6b4a', ['#e63946', '#2a9d8f', '#f4a261', '#e9c46a', '#457b9d', '#ffffff']), style: { deco: 'snow', font: 'nunito', titleFont: 'mountains', labels: 'emoji', labelEmojis: '🎄⭐🎁🔔❄️🦌' } },
  { id: 'pastel', name: 'Pastel doux', vars: base('#f7f3ff', '#ece6fb', '#ffffff', '#3d3553', '#857ba0', '#9b7bd8', '#ddd4f3', ['#ffadad', '#a0c4ff', '#fdffb6', '#caffbf', '#bdb2ff', '#ffc6ff']), style: { tileStyle: 'pastel', font: 'quicksand', radius: 1.8, deco: 'bokeh', soundPack: 'soft', music: 'lounge' } },
  { id: 'luxe', name: 'Or & noir', vars: base('#0c0c0c', '#161616', '#1c1c1c', '#f5efe0', '#a89f8a', '#d4af37', '#2e2a20', ['#d4af37', '#c0c0c0', '#b08d57', '#e5e4e2', '#8c7853', '#f5efe0']), style: { titleFont: 'playfair', font: 'montserrat', tileStyle: 'outline', radius: 0.3, deco: 'sparkles' } },
  { id: 'sport', name: 'Sport (EPS)', vars: base('#f2f5f9', '#e2e8f0', '#ffffff', '#0f172a', '#64748b', '#f97316', '#cbd5e1', ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#f97316']), style: { titleFont: 'bebas', font: 'montserrat', titleUpper: true, tileStyle: 'gradient', deco: 'none', music: 'party' } },
];

export const themeById = (id?: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Variables CSS du thème seul (pour les endroits sans réglages d'apparence). */
export function themeStyle(id?: string): CSSProperties {
  return themeById(id).vars as unknown as CSSProperties;
}
