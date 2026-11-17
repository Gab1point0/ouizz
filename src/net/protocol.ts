import type { AnswerPayload, QType, QuestionLook, QuizStyle, Zone } from '../types';

// ---------- Ce que voient les téléphones (aucune bonne réponse avant la révélation) ----------

export interface PubQuestion {
  id: string;
  type: QType;
  title: string;
  time: number;
  points: number;
  /** clé du média (image) à demander à l'animateur, si le téléphone doit l'afficher */
  mediaKey?: string;
  video?: string;
  answers?: { id: string; text: string; imageKey?: string }[];
  multi?: boolean;
  items?: { id: string; text: string }[];
  left?: { id: string; text: string }[];
  right?: { id: string; text: string }[];
  categories?: { id: string; name: string }[];
  catItems?: { id: string; text: string }[];
  blankParts?: string[];
  blankOptions?: string[];
  blankMode?: 'type' | 'choice';
  slider?: { min: number; max: number; step: number; unit?: string };
  statements?: string[];
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
  maxWords?: number;
  votes?: number;
  body?: string;
  /** apparence de la question (images remplacées par « media:clé ») */
  look?: QuestionLook;
}

export interface PubReveal {
  correctIds?: string[];
  correctBool?: boolean;
  accepted?: string[];
  order?: string[];
  sliderCorrect?: number;
  zone?: Zone;
  zones?: Zone[];
  /** match : id gauche -> id droite */
  matchRight?: Record<string, string>;
  catOf?: Record<string, string>;
  blanks?: string[];
  note?: string;
  buzzAnswer?: string;
}

export interface PubPlayer {
  pid: string;
  name: string;
  avatar: string;
  score: number;
  rank: number;
  team?: number;
  on: boolean;
}

export interface PubResult {
  /** a répondu */
  a?: boolean;
  /** fraction de réussite (0..1) ; absent si non noté */
  f?: number;
  /** points gagnés */
  g?: number;
  /** série en cours */
  s?: number;
}

export type Phase = 'lobby' | 'ready' | 'question' | 'reveal' | 'leaderboard' | 'podium';

export interface PubState {
  v: number;
  pin: string;
  title: string;
  theme: string;
  phase: Phase;
  qNum: number;
  qTotal: number;
  q?: PubQuestion;
  /** ms restantes au moment de l'envoi (phase ready/question) */
  endsIn?: number;
  answered: number;
  players: PubPlayer[];
  res: Record<string, PubResult>;
  reveal?: PubReveal;
  showOnPhones: boolean;
  buzz?: { queue: string[]; locked: string[]; winner?: string };
  sub?: 'ideas' | 'vote';
  ideas?: { id: string; text: string }[];
  teams?: { id: number; name: string; color: string; score: number }[];
  /** l'animateur a mis en pause */
  paused?: boolean;
  /** apparence du quiz pour les téléphones (images remplacées par « media:clé ») */
  style?: QuizStyle;
}

// ---------- Messages ----------

export type ToHost =
  | { t: 'hello'; pid: string; name: string; avatar: string }
  | { t: 'answer'; pid: string; qid: string; a: AnswerPayload }
  | { t: 'buzz'; pid: string; qid: string }
  | { t: 'react'; pid: string; e: string }
  | { t: 'ping'; pid: string }
  | { t: 'need'; pid: string; keys: string[] }
  | { t: 'leave'; pid: string };

export type ToPlayers =
  | { t: 'state'; s: PubState }
  | { t: 'media'; key: string; src: string }
  | { t: 'kick'; pid: string }
  | { t: 'end' };

export type Msg = (ToHost & { from?: 'player' }) | (ToPlayers & { from: 'host' });

export const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐯', '🐨', '🐵', '🦄', '🐙', '🦖', '🐧', '🦉', '🐝', '🐢', '🦈', '🐳', '🦩', '🦔', '🐲', '👽', '🤖', '👻', '🎃', '🍕', '🌵', '⚡', '🔥', '⭐'];

export const REACTIONS = ['👏', '😂', '😮', '🔥', '😭', '❤️'];

export const TEAM_COLORS = ['#ff6b5b', '#3d8bfd', '#f4b400', '#20b486', '#8b5cf6', '#ec4899'];
export const TEAM_NAMES = ['Rouges', 'Bleus', 'Jaunes', 'Verts', 'Violets', 'Roses'];
