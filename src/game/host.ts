// Moteur de partie côté animateur : il fait autorité (états, chronos, points).
// Les téléphones ne font qu'afficher l'état reçu et envoyer leurs réponses.

import { zonesOf } from '../zones';
import { cleanQuestion, isScored, QT } from '../qtypes';
import { computePoints, grade } from '../scoring';
import type { AnswerPayload, GameSettings, Question, Quiz } from '../types';
import { normalize, parseBlanks, shuffle, shuffleDifferent, uid } from '../util';
import { shrinkDataUrl } from '../image';
import { qlookOf } from '../style';
import { TEAM_COLORS, TEAM_NAMES, type Msg, type Phase, type PubQuestion, type PubReveal, type PubState, type ToHost } from '../net/protocol';
import type { NetStatus, Transport } from '../net/transport';

export interface HostPlayer {
  pid: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  team?: number;
  lastSeen: number;
  joinedAt: number;
  kicked?: boolean;
  prevRank: number;
  lastGain: number;
}

export interface AnswerRec { a: AnswerPayload; at: number; f: number | null; g: number; bonus?: number }

interface Shuf {
  answers?: string[];
  items?: string[];
  right?: { id: string; text: string }[];
  rightToPair?: Record<string, string>;
  catItems?: string[];
  blankOptions?: string[];
}

export interface Idea { id: string; text: string; pid: string; votes: number }

export interface HostSnapshot {
  pin: string;
  quizId: string;
  local: boolean;
  settings: GameSettings;
  order: string[];
  idx: number;
  phase: Phase;
  openedAt: number;
  endsAt: number;
  pausedLeft?: number;
  players: Record<string, HostPlayer>;
  answers: Record<string, Record<string, AnswerRec>>;
  shuf: Record<string, Shuf>;
  buzz: { queue: string[]; locked: string[]; winner?: string };
  sub?: 'ideas' | 'vote';
  ideas: Record<string, Idea[]>;
  hidden: Record<string, true>;
  v: number;
  startedAt: number;
  savedAt: number;
}

const OFFLINE_AFTER = 12000;
/** un joueur absent depuis ce délai (2 « ping » manqués) peut être repris par quelqu'un qui tape le même pseudo */
const RECLAIM_AFTER = 6000;
const SAVE_KEY = (quizId: string) => `ouizz.host.${quizId}`;

export function newPin(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export function loadSavedGame(quizId: string): HostSnapshot | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY(quizId));
    if (!raw) return null;
    const s = JSON.parse(raw) as HostSnapshot;
    if (Date.now() - s.savedAt > 6 * 3600_000 || s.phase === 'podium') return null;
    return s;
  } catch { return null; }
}
export function clearSavedGame(quizId: string) {
  try { localStorage.removeItem(SAVE_KEY(quizId)); } catch { /* ignore */ }
}

type Listener = () => void;

export class HostGame {
  s: HostSnapshot;
  readonly quiz: Quiz;
  readonly qs: Record<string, Question>;
  status: NetStatus = 'connecting';
  private t: Transport;
  private listeners = new Set<Listener>();
  private timer: number;
  private lastBeat = 0;
  private sendPending = 0;
  private savePending = 0;
  /** aperçu depuis l'éditeur : rien n'est sauvegardé */
  private preview = false;
  private mediaCache = new Map<string, Promise<string>>();
  private revealPending = 0;
  /** évènements ponctuels pour l'interface (réactions, sons) */
  onReact: (pid: string, e: string) => void = () => {};
  onEvent: (e: 'join' | 'answer' | 'buzz' | 'tick' | 'reveal' | 'start') => void = () => {};

  constructor(quiz: Quiz, settings: GameSettings, transport: Transport, opts: { pin: string; local: boolean; resume?: HostSnapshot; preview?: boolean }) {
    this.preview = !!opts.preview;
    this.quiz = quiz;
    this.qs = Object.fromEntries(quiz.questions.map((q) => [q.id, cleanQuestion(q)]));
    this.t = transport;
    if (opts.resume) {
      this.s = opts.resume;
    } else {
      const ids = quiz.questions.map((q) => q.id);
      this.s = {
        pin: opts.pin, quizId: quiz.id, local: opts.local, settings,
        order: settings.shuffleQuestions ? shuffle(ids) : ids,
        idx: -1, phase: 'lobby', openedAt: 0, endsAt: 0,
        players: {}, answers: {}, shuf: {}, buzz: { queue: [], locked: [] }, ideas: {}, hidden: {},
        v: 0, startedAt: Date.now(), savedAt: Date.now(),
      };
    }
    transport.onMessage((m) => this.handle(m));
    transport.onStatus((st) => { this.status = st; if (st === 'online') this.broadcast(true); this.emit(); });
    this.timer = window.setInterval(() => this.tick(), 250);
  }

  destroy() {
    clearInterval(this.timer);
    this.t.send({ from: 'host', t: 'end' });
    setTimeout(() => this.t.close(), 300);
  }

  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach((f) => f()); }

  private changed() {
    this.s.v++;
    this.emit();
    this.broadcast();
    this.save();
  }

  private save() {
    if (this.savePending || this.preview) return;
    this.savePending = window.setTimeout(() => {
      this.savePending = 0;
      this.s.savedAt = Date.now();
      try { localStorage.setItem(SAVE_KEY(this.s.quizId), JSON.stringify(this.s)); } catch { /* quota : tant pis */ }
    }, 500);
  }

  // ---------- accès pratiques ----------
  get question(): Question | undefined { return this.s.idx >= 0 ? this.qs[this.s.order[this.s.idx]] : undefined; }
  get activePlayers(): HostPlayer[] { return Object.values(this.s.players).filter((p) => !p.kicked); }
  isOnline(p: HostPlayer) { return Date.now() - p.lastSeen < OFFLINE_AFTER; }
  answersFor(qid: string, sub?: 'vote') { return this.s.answers[sub ? `${qid}#vote` : qid] ?? {}; }
  get currentAnswers() {
    const q = this.question;
    return q ? this.answersFor(q.id, this.s.sub === 'vote' ? 'vote' : undefined) : {};
  }
  remaining(): number {
    if (this.s.pausedLeft !== undefined) return this.s.pausedLeft;
    return this.s.endsAt ? Math.max(0, this.s.endsAt - Date.now()) : 0;
  }
  ranking(): HostPlayer[] {
    return this.activePlayers.slice().sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
  }
  teamScores() {
    const n = this.s.settings.teams;
    if (!n) return [];
    return Array.from({ length: n }, (_, i) => {
      const m = this.activePlayers.filter((p) => p.team === i);
      const score = m.length ? Math.round(m.reduce((s, p) => s + p.score, 0) / m.length) : 0;
      return { id: i, name: TEAM_NAMES[i], color: TEAM_COLORS[i], score, members: m.length };
    }).sort((a, b) => b.score - a.score);
  }

  // ---------- messages des téléphones ----------
  private handle(m: Msg) {
    if (m.from === 'host') return;
    const msg = m as ToHost;
    const p = this.s.players[msg.pid];
    if (p) p.lastSeen = Date.now();
    switch (msg.t) {
      case 'hello': return this.onHello(msg.pid, msg.name, msg.avatar);
      case 'ping':
        if (!p) this.send({ from: 'host', t: 'state', s: this.pub() }); // inconnu : il renverra « hello »
        return;
      case 'answer': return this.onAnswer(msg.pid, msg.qid, msg.a);
      case 'buzz': return this.onBuzz(msg.pid, msg.qid);
      case 'react':
        if (p && !p.kicked) this.onReact(msg.pid, msg.e);
        return;
      case 'need': return void this.sendMedia(msg.keys);
      case 'leave':
        if (p) { p.lastSeen = 0; this.changed(); }
        return;
    }
  }

  private onHello(pid: string, rawName: string, avatar: string) {
    const existing = this.s.players[pid];
    if (existing?.kicked) { this.send({ from: 'host', t: 'kick', pid }); return; }
    if (existing) {
      existing.lastSeen = Date.now();
      existing.avatar = avatar || existing.avatar;
      this.changed();
      this.resendMedia();
      return;
    }
    let name = rawName.trim().slice(0, 20) || 'Joueur';
    // reconnexion avec le même pseudo (autre appareil, page fermée, données effacées…) : on reprend le joueur déconnecté
    const key = normalize(name);
    const back = this.activePlayers
      .filter((x) => normalize(x.name) === key && Date.now() - x.lastSeen > RECLAIM_AFTER)
      .sort((a, b) => b.score - a.score)[0];
    if (back) {
      this.send({ from: 'host', t: 'rejoin', pid, as: back.pid });
      return;
    }
    const taken = new Set(this.activePlayers.map((x) => x.name.toLowerCase()));
    if (taken.has(name.toLowerCase())) {
      let k = 2;
      while (taken.has(`${name} ${k}`.toLowerCase())) k++;
      name = `${name} ${k}`;
    }
    const pl: HostPlayer = { pid, name, avatar, score: 0, streak: 0, lastSeen: Date.now(), joinedAt: Date.now(), prevRank: 0, lastGain: 0 };
    if (this.s.settings.teams) {
      const counts = Array.from({ length: this.s.settings.teams }, (_, i) => this.activePlayers.filter((x) => x.team === i).length);
      pl.team = counts.indexOf(Math.min(...counts));
    }
    this.s.players[pid] = pl;
    this.onEvent('join');
    this.changed();
    this.resendMedia();
  }

  private onAnswer(pid: string, qid: string, a: AnswerPayload) {
    const q = this.question;
    const p = this.s.players[pid];
    if (!q || !p || p.kicked || q.id !== qid || this.s.phase !== 'question' || this.s.pausedLeft !== undefined) return;
    if (q.type === 'slide' || q.type === 'buzzer') return;
    const key = this.s.sub === 'vote' ? `${qid}#vote` : qid;
    const bucket = (this.s.answers[key] ??= {});
    if (bucket[pid]) return; // une seule réponse
    bucket[pid] = { a: this.sanitize(q, a), at: Date.now() - this.s.openedAt, f: null, g: 0 };
    this.onEvent('answer');
    this.changed();
    this.maybeAutoReveal();
  }

  /** limite la taille / forme des réponses reçues */
  private sanitize(q: Question, a: AnswerPayload): AnswerPayload {
    if (typeof a === 'string') return q.type === 'draw' ? a.slice(0, 400_000) : a.slice(0, 300);
    if (Array.isArray(a)) return (a as unknown[]).slice(0, 30).map((x) => (typeof x === 'string' ? x.slice(0, 120) : x)) as AnswerPayload;
    return a;
  }

  private onBuzz(pid: string, qid: string) {
    const q = this.question;
    const p = this.s.players[pid];
    if (!q || !p || p.kicked || q.type !== 'buzzer' || q.id !== qid || this.s.phase !== 'question') return;
    const b = this.s.buzz;
    if (b.winner || b.queue.includes(pid) || b.locked.includes(pid)) return;
    b.queue.push(pid);
    this.onEvent('buzz');
    this.changed();
  }

  private maybeAutoReveal() {
    const q = this.question;
    if (!q || !this.s.settings.autoReveal || this.s.phase !== 'question' || q.type === 'buzzer' || q.type === 'slide') return;
    const expected = this.activePlayers.filter((p) => this.isOnline(p));
    if (!expected.length) return;
    const ans = this.currentAnswers;
    if (expected.every((p) => ans[p.pid])) {
      clearTimeout(this.revealPending);
      this.revealPending = window.setTimeout(() => {
        if (this.s.phase === 'question' && this.question?.id === q.id) this.endAnswering();
      }, 700);
    }
  }

  // ---------- déroulement ----------
  private tick() {
    const now = Date.now();
    if (this.s.pausedLeft === undefined && this.s.endsAt && now >= this.s.endsAt) {
      if (this.s.phase === 'ready') this.openQuestion();
      else if (this.s.phase === 'question') this.endAnswering();
    }
    if (this.s.phase === 'question' && this.s.endsAt && this.s.pausedLeft === undefined) {
      const left = this.s.endsAt - now;
      if (left > 0 && left <= 5000 && Math.floor(left / 1000) !== Math.floor((left + 250) / 1000)) this.onEvent('tick');
    }
    // statut en ligne : on rafraîchit l'affichage de temps en temps
    if (now - this.lastBeat > 4000) {
      this.lastBeat = now;
      this.broadcast(true);
      this.emit();
    }
  }

  start() {
    if (!this.s.order.length) return;
    this.s.startedAt = Date.now();
    this.onEvent('start');
    this.goTo(0);
  }

  /** Bouton « Suivant » unique, selon la phase. */
  next() {
    const q = this.question;
    switch (this.s.phase) {
      case 'lobby': return this.start();
      case 'ready': return this.openQuestion();
      case 'question':
        if (q?.type === 'slide') return this.afterQuestion();
        return this.endAnswering();
      case 'reveal': {
        const last = this.s.idx >= this.s.order.length - 1;
        if (q && isScored(q) && this.s.settings.leaderboard && !last) return this.setPhase('leaderboard');
        return this.afterQuestion();
      }
      case 'leaderboard': return this.afterQuestion();
      case 'podium': return;
    }
  }

  private afterQuestion() {
    if (this.s.idx >= this.s.order.length - 1) this.setPhase('podium');
    else this.goTo(this.s.idx + 1);
  }

  goTo(i: number) {
    clearTimeout(this.revealPending);
    this.s.idx = i;
    this.s.pausedLeft = undefined;
    this.s.sub = undefined;
    this.s.buzz = { queue: [], locked: [] };
    const q = this.question!;
    this.prepareShuffle(q);
    this.resendMedia();
    if (q.type === 'slide') {
      this.s.phase = 'question';
      this.s.openedAt = Date.now();
      this.s.endsAt = q.time > 0 ? Date.now() + q.time * 1000 : 0;
      return this.changed();
    }
    const rt = this.s.settings.readTime;
    if (rt > 0) {
      this.s.phase = 'ready';
      this.s.endsAt = Date.now() + rt * 1000;
      this.changed();
    } else this.openQuestion();
  }

  private openQuestion() {
    const q = this.question!;
    this.s.phase = 'question';
    this.s.openedAt = Date.now();
    this.s.endsAt = q.time > 0 ? Date.now() + q.time * 1000 : 0;
    if (q.type === 'brainstorm') this.s.sub = 'ideas';
    this.changed();
  }

  /** Fin des réponses : brainstorming -> vote, sinon révélation */
  endAnswering() {
    const q = this.question;
    if (!q || this.s.phase !== 'question') return;
    clearTimeout(this.revealPending);
    this.s.pausedLeft = undefined;
    if (q.type === 'brainstorm' && this.s.sub === 'ideas') {
      this.collectIdeas(q);
      this.s.sub = 'vote';
      this.s.openedAt = Date.now();
      this.s.endsAt = q.time > 0 ? Date.now() + Math.max(20, Math.round(q.time / 2)) * 1000 : 0;
      return this.changed();
    }
    this.reveal();
  }

  private collectIdeas(q: Question) {
    const seen = new Map<string, Idea>();
    for (const [pid, rec] of Object.entries(this.answersFor(q.id))) {
      for (const text of (rec.a as string[]) ?? []) {
        const k = normalize(text);
        if (!k || seen.has(k)) continue;
        seen.set(k, { id: uid(5), text: text.trim(), pid, votes: 0 });
      }
    }
    this.s.ideas[q.id] = [...seen.values()];
  }

  private reveal() {
    const q = this.question!;
    const ranks = this.ranking();
    ranks.forEach((p, i) => { p.prevRank = i + 1; p.lastGain = 0; });
    if (q.type === 'brainstorm') {
      const ideas = this.s.ideas[q.id] ?? [];
      ideas.forEach((i) => (i.votes = 0));
      for (const rec of Object.values(this.answersFor(q.id, 'vote'))) {
        for (const id of new Set(rec.a as string[])) { const idea = ideas.find((x) => x.id === id); if (idea) idea.votes++; }
      }
      ideas.sort((a, b) => b.votes - a.votes);
    }
    const scored = isScored(q);
    const ans = this.answersFor(q.id);
    const limit = q.time * 1000;
    for (const p of this.activePlayers) {
      const rec = ans[p.pid];
      if (!scored) continue;
      if (!rec) {
        if (q.type !== 'buzzer') p.streak = 0;
        continue;
      }
      const f = grade(q, this.toCanonical(q, rec.a)) ?? 0;
      const r = computePoints({
        fraction: f, multiplier: q.points, elapsed: q.type === 'buzzer' ? 0 : rec.at, limit,
        speedBonus: this.s.settings.speedBonus && q.type !== 'buzzer', streak: p.streak, streakBonus: this.s.settings.streakBonus,
      });
      rec.f = f;
      rec.g = r.points;
      rec.bonus = r.bonus;
      p.streak = r.streak;
      p.score += r.points;
      p.lastGain = r.points;
    }
    if (!scored) for (const rec of Object.values(ans)) rec.f = grade(q, this.toCanonical(q, rec.a));
    this.s.phase = 'reveal';
    this.s.endsAt = 0;
    this.onEvent('reveal');
    this.changed();
  }

  /** Les « droites » des paires ont des identifiants publics : on les retraduit avant de noter. */
  private toCanonical(q: Question, a: AnswerPayload): AnswerPayload {
    if (q.type === 'match' && a && typeof a === 'object' && !Array.isArray(a)) {
      const map = this.s.shuf[q.id]?.rightToPair ?? {};
      const out: Record<string, string> = {};
      for (const [l, r] of Object.entries(a as Record<string, string>)) out[l] = map[r] ?? '';
      return out;
    }
    return a;
  }

  private setPhase(p: Phase) {
    this.s.phase = p;
    this.s.endsAt = 0;
    this.s.pausedLeft = undefined;
    if (p === 'podium') { this.s.idx = this.s.order.length - 1; clearSavedGame(this.s.quizId); }
    this.changed();
    if (p === 'podium') {
      // la sauvegarde ne doit pas rester après la fin
      setTimeout(() => clearSavedGame(this.s.quizId), 800);
    }
  }

  endGame() { this.setPhase('podium'); }

  // ---------- actions de l'animateur ----------
  kick(pid: string) {
    const p = this.s.players[pid];
    if (!p) return;
    p.kicked = true;
    this.send({ from: 'host', t: 'kick', pid });
    this.changed();
  }
  addTime(sec: number) {
    if (this.s.pausedLeft !== undefined) this.s.pausedLeft += sec * 1000;
    else if (this.s.endsAt) this.s.endsAt += sec * 1000;
    else if (this.s.phase === 'question') this.s.endsAt = Date.now() + sec * 1000;
    this.changed();
  }
  togglePause() {
    if (this.s.phase !== 'question' && this.s.phase !== 'ready') return;
    if (this.s.pausedLeft !== undefined) {
      if (this.s.endsAt) this.s.endsAt = Date.now() + this.s.pausedLeft;
      this.s.pausedLeft = undefined;
    } else if (this.s.endsAt) {
      this.s.pausedLeft = Math.max(0, this.s.endsAt - Date.now());
    }
    this.changed();
  }
  judgeBuzz(ok: boolean) {
    const q = this.question;
    const b = this.s.buzz;
    const pid = b.queue[0];
    if (!q || q.type !== 'buzzer' || !pid) return;
    const bucket = (this.s.answers[q.id] ??= {});
    bucket[pid] = { a: ok, at: Date.now() - this.s.openedAt, f: null, g: 0 };
    if (ok) {
      b.winner = pid;
      b.queue = [];
      this.reveal();
    } else {
      b.locked.push(pid);
      b.queue.shift();
      this.changed();
    }
  }
  toggleHidden(key: string) {
    if (this.s.hidden[key]) delete this.s.hidden[key];
    else this.s.hidden[key] = true;
    this.changed();
  }
  /** Corriger à la main : accepter une réponse tapée refusée (ou l'inverse). */
  overrideAnswer(pid: string, accept: boolean) {
    const q = this.question;
    if (!q || this.s.phase !== 'reveal' || !isScored(q)) return;
    const rec = this.answersFor(q.id)[pid];
    const p = this.s.players[pid];
    if (!rec || !p) return;
    p.score -= rec.g;
    if (accept) {
      const r = computePoints({ fraction: 1, multiplier: q.points, elapsed: rec.at, limit: q.time * 1000, speedBonus: this.s.settings.speedBonus, streak: Math.max(0, p.streak - (rec.f === 1 ? 1 : 0)), streakBonus: this.s.settings.streakBonus });
      rec.f = 1; rec.g = r.points; p.streak = r.streak;
    } else {
      rec.f = 0; rec.g = 0; p.streak = 0;
    }
    p.score += rec.g;
    p.lastGain = rec.g;
    this.changed();
  }

  // ---------- état public ----------
  private prepareShuffle(q: Question) {
    if (this.s.shuf[q.id]) return;
    const sh: Shuf = {};
    const mix = this.s.settings.shuffleAnswers;
    if (q.answers) sh.answers = (mix ? shuffle(q.answers) : q.answers).map((a) => a.id);
    if (q.type === 'order') sh.items = shuffleDifferent(q.items ?? []).map((x) => x.id);
    if (q.type === 'ranking' || q.type === 'points100') sh.items = (mix ? shuffle(q.items ?? []) : q.items ?? []).map((x) => x.id);
    if (q.type === 'match') {
      const right = shuffleDifferent(q.pairs ?? []);
      sh.rightToPair = {};
      sh.right = right.map((p) => { const id = uid(5); sh.rightToPair![id] = p.id; return { id, text: p.right }; });
    }
    if (q.type === 'categorize') sh.catItems = shuffle(q.catItems ?? []).map((x) => x.id);
    if (q.type === 'blanks' && q.blankMode === 'choice') {
      const { blanks } = parseBlanks(q.blankText ?? '');
      sh.blankOptions = shuffle([...new Set([...blanks.map((b) => b[0]), ...(q.distractors ?? [])])]);
    }
    this.s.shuf[q.id] = sh;
  }

  /** Question telle que vue par les téléphones (et dans le même ordre sur le grand écran). */
  pubQuestion(q: Question): PubQuestion {
    const sh = this.s.shuf[q.id] ?? {};
    const phonesSee = this.s.settings.showOnPhones;
    const pq: PubQuestion = { id: q.id, type: q.type, title: phonesSee || q.type === 'slide' ? q.title : '', time: q.time, points: q.points };
    if (q.media?.kind === 'image' && (phonesSee || QT[q.type].phoneNeedsMedia)) pq.mediaKey = `${q.id}:m`;
    if (q.answers) {
      const byId = Object.fromEntries(q.answers.map((a) => [a.id, a]));
      pq.answers = (sh.answers ?? q.answers.map((a) => a.id)).map((id) => byId[id]).filter(Boolean).map((a) => ({
        id: a.id, text: a.text, imageKey: a.image ? `${q.id}:a:${a.id}` : undefined,
      }));
      pq.multi = q.multi;
    }
    if (q.items) {
      const byId = Object.fromEntries(q.items.map((a) => [a.id, a]));
      pq.items = (sh.items ?? q.items.map((x) => x.id)).map((id) => byId[id]).filter(Boolean);
    }
    if (q.type === 'match') {
      pq.left = (q.pairs ?? []).map((p) => ({ id: p.id, text: p.left }));
      pq.right = sh.right;
    }
    if (q.type === 'categorize') {
      pq.categories = q.categories;
      const byId = Object.fromEntries((q.catItems ?? []).map((a) => [a.id, a]));
      pq.catItems = (sh.catItems ?? []).map((id) => byId[id]).filter(Boolean).map((x) => ({ id: x.id, text: x.text }));
    }
    if (q.type === 'blanks') {
      const { parts } = parseBlanks(q.blankText ?? '');
      pq.blankParts = parts;
      pq.blankMode = q.blankMode;
      pq.blankOptions = sh.blankOptions;
    }
    if (q.type === 'slider' && q.slider) pq.slider = { min: q.slider.min, max: q.slider.max, step: q.slider.step, unit: q.slider.unit };
    if (q.type === 'scale') Object.assign(pq, { statements: q.statements, scaleMax: q.scaleMax ?? 5, minLabel: q.minLabel, maxLabel: q.maxLabel });
    if (q.type === 'wordcloud' || q.type === 'brainstorm') { pq.maxWords = q.maxWords ?? 1; pq.votes = q.votes ?? 3; }
    if (q.type === 'slide' && phonesSee) pq.body = q.body;
    const ql = qlookOf(q);
    if (ql && this.phonesThemed) pq.look = { ...ql, bgImage: ql.bgImage ? `media:${q.id}:bg` : undefined };
    return pq;
  }

  private pubReveal(q: Question): PubReveal {
    const r: PubReveal = { note: q.note };
    switch (q.type) {
      case 'choice': r.correctIds = (q.answers ?? []).filter((a) => a.correct).map((a) => a.id); break;
      case 'truefalse': r.correctBool = q.correctBool; break;
      case 'type': r.accepted = q.accepted; break;
      case 'order': r.order = (q.items ?? []).map((x) => x.id); break;
      case 'slider': r.sliderCorrect = q.slider?.correct; break;
      case 'pin': r.zones = zonesOf(q); break;
      case 'match': {
        const inv: Record<string, string> = {};
        for (const [pub, pair] of Object.entries(this.s.shuf[q.id]?.rightToPair ?? {})) inv[pair] = pub;
        r.matchRight = inv;
        break;
      }
      case 'categorize': r.catOf = Object.fromEntries((q.catItems ?? []).map((x) => [x.id, x.cat])); break;
      case 'blanks': r.blanks = parseBlanks(q.blankText ?? '').blanks.map((b) => b[0]); break;
      case 'buzzer': r.buzzAnswer = q.buzzAnswer; break;
    }
    return r;
  }

  pub(): PubState {
    const q = this.question;
    const ranking = this.ranking();
    const rankOf = new Map(ranking.map((p, i) => [p.pid, i + 1]));
    const st: PubState = {
      v: this.s.v,
      pin: this.s.pin,
      title: this.quiz.title,
      theme: this.quiz.theme,
      phase: this.s.phase,
      qNum: this.s.idx + 1,
      qTotal: this.s.order.length,
      answered: Object.keys(this.currentAnswers).length,
      players: ranking.map((p) => ({ pid: p.pid, name: p.name, avatar: p.avatar, score: p.score, rank: rankOf.get(p.pid)!, team: p.team, on: this.isOnline(p) })),
      res: {},
      showOnPhones: this.s.settings.showOnPhones,
      paused: this.s.pausedLeft !== undefined || undefined,
      style: this.pubStyle(),
    };
    if (this.s.settings.teams) st.teams = this.teamScores().map(({ id, name, color, score }) => ({ id, name, color, score }));
    if (q && this.s.phase !== 'lobby' && this.s.phase !== 'podium') {
      st.q = this.pubQuestion(q);
      if (this.s.phase === 'ready' || this.s.phase === 'question') st.endsIn = this.remaining();
      const ans = this.currentAnswers;
      for (const pid of Object.keys(ans)) st.res[pid] = { a: true };
      if (this.s.phase === 'reveal' || this.s.phase === 'leaderboard') {
        st.reveal = this.pubReveal(q);
        const main = this.answersFor(q.id);
        for (const p of this.activePlayers) {
          const rec = main[p.pid];
          st.res[p.pid] = rec ? { a: true, f: rec.f ?? undefined, g: rec.g, s: p.streak } : { s: p.streak };
        }
      }
      if (q.type === 'buzzer') st.buzz = { ...this.s.buzz };
      if (q.type === 'brainstorm') {
        st.sub = this.s.sub;
        if (this.s.sub === 'vote' || this.s.phase === 'reveal') st.ideas = (this.s.ideas[q.id] ?? []).map(({ id, text }) => ({ id, text }));
      }
    }
    return st;
  }

  get phonesThemed() { return this.quiz.style?.phonesThemed !== false; }

  /** Apparence envoyée aux téléphones : les images passent par des messages « media » séparés. */
  private pubStyle() {
    const st = this.quiz.style;
    if (!st || !this.phonesThemed) return undefined;
    return { ...st, bgImage: st.bgImage ? 'media:style:bg' : undefined, logo: st.logo ? 'media:style:logo' : undefined };
  }

  private send(m: Msg) { this.t.send(m); }

  /** Envoie l'état à tous (regroupé pour ne pas inonder le réseau). */
  broadcast(now = false) {
    if (now) {
      clearTimeout(this.sendPending);
      this.sendPending = 0;
      this.send({ from: 'host', t: 'state', s: this.pub() });
      return;
    }
    if (this.sendPending) return;
    this.sendPending = window.setTimeout(() => {
      this.sendPending = 0;
      this.send({ from: 'host', t: 'state', s: this.pub() });
    }, 120);
  }

  // ---------- images envoyées aux téléphones ----------
  private mediaSrc(key: string): string | undefined {
    const [qid, kind, aid] = key.split(':');
    if (qid === 'style') return kind === 'bg' ? this.quiz.style?.bgImage : kind === 'logo' ? this.quiz.style?.logo : undefined;
    const q = this.qs[qid];
    if (!q) return;
    if (kind === 'bg') return qlookOf(q)?.bgImage;
    if (kind === 'm') return q.media?.kind === 'image' ? q.media.src : undefined;
    if (kind === 'a') return q.answers?.find((a) => a.id === aid)?.image;
  }

  private resendMedia() {
    const st = this.pubStyle();
    const keys: string[] = [st?.bgImage, st?.logo].filter(Boolean).map((k) => k!.slice(6));
    const q = this.question;
    if (q) {
      const pq = this.pubQuestion(q);
      keys.push(...([pq.mediaKey, pq.look?.bgImage?.slice(6), ...(pq.answers ?? []).map((a) => a.imageKey)].filter(Boolean) as string[]));
    }
    if (keys.length) void this.sendMedia(keys);
  }

  private async sendMedia(keys: string[]) {
    for (const key of keys.slice(0, 10)) {
      const src = this.mediaSrc(key);
      if (!src) continue;
      let p = this.mediaCache.get(key);
      if (!p) {
        p = src.startsWith('data:') ? shrinkDataUrl(src, 200_000) : Promise.resolve(src);
        this.mediaCache.set(key, p);
      }
      try { this.send({ from: 'host', t: 'media', key, src: await p }); } catch { /* ignore */ }
    }
  }

  // ---------- statistiques pour l'écran ----------
  resultsTable(): { pid: string; name: string; avatar: string; score: number; perQ: (number | null)[]; correct: number; team?: number }[] {
    return this.ranking().map((p) => {
      const perQ = this.s.order.map((qid) => {
        const q = this.qs[qid];
        if (!isScored(q)) return null;
        return this.s.answers[qid]?.[p.pid]?.g ?? 0;
      });
      const correct = this.s.order.filter((qid) => (this.s.answers[qid]?.[p.pid]?.f ?? 0) >= 0.999 && isScored(this.qs[qid])).length;
      return { pid: p.pid, name: p.name, avatar: p.avatar, score: p.score, perQ, correct, team: p.team };
    });
  }
}
