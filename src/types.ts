// Modèle de données d'un quiz. Un seul type « Question » avec des champs optionnels :
// changer le type d'une question dans l'éditeur garde ce qui a déjà été saisi.

export type QType =
  // notées
  | 'choice' | 'truefalse' | 'type' | 'order' | 'slider' | 'pin' | 'match' | 'categorize' | 'blanks' | 'buzzer'
  // avis (non notées)
  | 'poll' | 'wordcloud' | 'open' | 'scale' | 'ranking' | 'points100' | 'draw' | 'brainstorm'
  // contenu
  | 'slide';

/** Image : data URL (fichier importé, compressé) ou lien https. Vidéo : lien YouTube ou fichier https. */
export interface Media { kind: 'image' | 'video'; src: string }

export interface Choice { id: string; text: string; image?: string; correct?: boolean }
export interface Item { id: string; text: string }
export interface Pair { id: string; left: string; right: string }
export interface Category { id: string; name: string }
export interface CatItem { id: string; text: string; cat: string }
export interface Zone { x: number; y: number; r: number; ar?: number } // x, y relatifs (0..1) ; r relatif à la largeur ; ar = hauteur/largeur de l'image

export interface SliderCfg { min: number; max: number; step: number; correct: number; margin: number; unit?: string }

export interface Question {
  id: string;
  type: QType;
  title: string;
  media?: Media;
  /** secondes ; 0 = pas de limite */
  time: number;
  /** multiplicateur de points : 0 = sans points, 1 = normal, 2 = double */
  points: 0 | 1 | 2;
  /** explication affichée après la réponse */
  note?: string;
  /** fond personnalisé (couleur CSS) pour cette question */
  bg?: string;

  // choice / poll
  answers?: Choice[];
  multi?: boolean;
  /** points partiels (multi, ordre, paires, catégories, trous) */
  partial?: boolean;
  // truefalse
  correctBool?: boolean;
  // type
  accepted?: string[];
  fuzzy?: boolean;
  // order / ranking / points100
  items?: Item[];
  // slider
  slider?: SliderCfg;
  // pin
  zone?: Zone;
  // match
  pairs?: Pair[];
  // categorize
  categories?: Category[];
  catItems?: CatItem[];
  // blanks : « Paris est la capitale de la [France]. » ; variantes acceptées : [France|la France]
  blankText?: string;
  blankMode?: 'type' | 'choice';
  distractors?: string[];
  // scale
  statements?: string[];
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
  // wordcloud / brainstorm
  maxWords?: number;
  votes?: number;
  // slide
  body?: string;
  // buzzer : réponse attendue (visible seulement sur l'écran de l'animateur)
  buzzAnswer?: string;
}

export interface GameSettings {
  /** afficher question + réponses sur les téléphones (sinon : seulement les boutons, comme au salon) */
  showOnPhones: boolean;
  speedBonus: boolean;
  streakBonus: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  /** révéler dès que tout le monde a répondu */
  autoReveal: boolean;
  /** classement intermédiaire après chaque question notée */
  leaderboard: boolean;
  /** temps de lecture avant l'ouverture des réponses (s) */
  readTime: number;
  sounds: boolean;
  music: boolean;
  /** équipes (0 = pas d'équipes) */
  teams: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  showOnPhones: true,
  speedBonus: true,
  streakBonus: true,
  shuffleQuestions: false,
  shuffleAnswers: false,
  autoReveal: true,
  leaderboard: true,
  readTime: 3,
  sounds: true,
  music: true,
  teams: 0,
};

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  theme: string;
  cover?: Media;
  questions: Question[];
  settings?: Partial<GameSettings>;
  createdAt: number;
  updatedAt: number;
}

// ---- Réponses envoyées par les téléphones (forme selon le type) ----
export type AnswerPayload =
  | string[]                 // choice, poll, order, ranking, wordcloud, blanks, brainstorm (idées ou votes)
  | boolean                  // truefalse
  | string                   // type, open, draw (data URL)
  | number                   // slider
  | number[]                 // scale
  | { x: number; y: number } // pin
  | Record<string, string>   // match (gauche -> droite), categorize (élément -> catégorie)
  | Record<string, number>;  // points100
