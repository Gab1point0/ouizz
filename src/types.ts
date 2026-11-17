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
export interface Media {
  kind: 'image' | 'video';
  src: string;
  /** vidéo : son seulement (vidéo cachée), pour les blind tests */
  audioOnly?: boolean;
  /** son seulement : dévoiler la vidéo au moment de la réponse */
  revealVideo?: boolean;
  /** vidéo : début et fin (secondes) */
  start?: number;
  end?: number;
}

export interface Choice { id: string; text: string; image?: string; correct?: boolean }
export interface Item { id: string; text: string }
export interface Pair { id: string; left: string; right: string }
export interface Category { id: string; name: string }
export interface CatItem { id: string; text: string; cat: string }
// x, y relatifs (0..1) ; r relatif à la largeur ; ar = hauteur/largeur de l'image ; rect : w, h ; poly : pts (voir zones.ts)
export interface Zone { shape?: 'circle' | 'rect' | 'poly'; x: number; y: number; r: number; w?: number; h?: number; pts?: [number, number][]; ar?: number }

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
  /** ancien champ : couleur de fond (remplacé par look.bg) */
  bg?: string;
  /** apparence propre à cette question (sinon celle du quiz) */
  look?: QuestionLook;

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
  /** plusieurs zones correctes (prioritaire sur zone) */
  zones?: Zone[];
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

// ---------------- Apparence ----------------
export type DecoId = 'none' | 'bubbles' | 'stars' | 'confetti' | 'waves' | 'snow' | 'hearts' | 'emoji' | 'bokeh' | 'grid' | 'sparkles' | 'leaves';
export type TransitionId = 'none' | 'fade' | 'slide' | 'zoom' | 'flip' | 'bounce' | 'swing';
export type BgMode = 'theme' | 'color' | 'gradient' | 'image';

/** Réglages d'apparence d'un quiz. Tout est facultatif : ce qui manque vient du thème choisi. */
export interface QuizStyle {
  // fond
  bgMode?: BgMode;
  bg?: string;
  bg2?: string;
  gradAngle?: number;
  gradType?: 'linear' | 'radial';
  bgImage?: string;
  bgFit?: 'cover' | 'contain' | 'tile';
  /** voile sombre (0..0.85) ou clair (négatif) par-dessus l'image */
  overlay?: number;
  blur?: number;
  // couleurs
  fg?: string;
  muted?: string;
  accent?: string;
  card?: string;
  /** opacité des cartes (0.2..1) */
  cardOpacity?: number;
  answerColors?: string[];
  // texte
  font?: string;
  titleFont?: string;
  titleScale?: number;
  titleUpper?: boolean;
  titleAlign?: 'center' | 'left';
  textShadow?: boolean;
  // formes
  radius?: number;
  tileStyle?: 'solid' | 'flat' | 'outline' | 'gradient' | 'glass' | '3d' | 'pastel';
  labels?: 'letters' | 'numbers' | 'shapes' | 'emoji' | 'none';
  labelEmojis?: string;
  // animations
  deco?: DecoId;
  decoEmoji?: string;
  decoAmount?: number;
  transition?: TransitionId;
  timerStyle?: 'circle' | 'bar' | 'number' | 'hidden';
  confettiOnPodium?: boolean;
  phoneCelebrate?: boolean;
  // ambiance sonore
  music?: 'calm' | 'party' | 'retro' | 'suspense' | 'lounge' | 'none';
  soundPack?: 'classic' | 'retro' | 'soft' | 'none';
  /** musique de réflexion pendant les questions */
  questionMusic?: 'thinking' | 'none';
  // identité
  logo?: string;
  lobbyMessage?: string;
  endMessage?: string;
  /** l'apparence s'applique aussi aux téléphones */
  phonesThemed?: boolean;
}

export interface QuestionLook {
  bgMode?: 'quiz' | 'color' | 'gradient' | 'image';
  bg?: string;
  bg2?: string;
  gradAngle?: number;
  bgImage?: string;
  overlay?: number;
  fg?: string;
  layout?: 'auto' | 'media-left' | 'media-right' | 'media-big' | 'text-only';
  titleScale?: number;
  transition?: TransitionId | 'quiz';
  deco?: DecoId | 'quiz';
  decoEmoji?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  theme: string;
  style?: QuizStyle;
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
