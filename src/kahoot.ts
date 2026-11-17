// Conversion d'un Kahoot (JSON de create.kahoot.it/rest/kahoots/<id>) en quiz Ouizz.
// Types gérés : content, quiz (dont vrai/faux), multiple_select_quiz, survey, open_ended, jumble, slider,
// pin_it (polygones, ellipses), word_cloud, feedback ; médias : vidéo YouTube (début/fin), image, GIF, lecture à voix haute.
import type { Choice, Item, Media, Question, Quiz, Zone } from './types';
import { uid } from './util';

/* eslint-disable @typescript-eslint/no-explicit-any */
type K = any;

export function isKahoot(data: K): boolean {
  const k = data?.kahoot ?? data;
  return !!k && Array.isArray(k.questions) && (typeof k.quizType === 'string' || k.questions.some((q: K) => 'questionFormat' in q || 'choiceRange' in q || 'choiceShapes' in q));
}

/** HTML de Kahoot -> texte Ouizz (<b> devient **gras**). */
export function htmlToText(html?: string): string {
  if (!html) return '';
  let s = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(b|strong)>/gi, '**')
    .replace(/<[^>]+>/g, '');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
  s = s.replace(/\*\*(\s*)\*\*/g, '$1'); // gras vide
  return s.trim();
}

function mediaOf(q: K): { media?: Media; speech?: Question['speech'] } {
  const out: { media?: Media; speech?: Question['speech'] } = {};
  const v = q.video;
  if (v?.id) {
    out.media = { kind: 'video', src: `https://www.youtube.com/watch?v=${v.id}` };
    if (v.startTime > 0) out.media.start = Math.round(v.startTime);
    if (v.endTime > (v.startTime ?? 0)) out.media.end = Math.round(v.endTime);
  } else if (q.image) {
    out.media = { kind: 'image', src: q.image };
  }
  for (const m of q.media ?? []) {
    if (m.type === 'read_aloud' && m.text) out.speech = { text: m.text, lang: m.languageInfo?.language || 'fr-FR' };
    else if (!out.media && m.url && (m.type === 'giphy_gif' || m.type === 'image' || m.type === 'unsplash_image')) out.media = { kind: 'image', src: m.url };
    else if (!out.media && m.type === 'background_image' && m.id) out.media = { kind: 'image', src: `https://media.kahoot.it/${m.id}` };
  }
  return out;
}

function zonesOfShapes(q: K): Zone[] {
  const W = q.imageMetadata?.width || 1;
  const H = q.imageMetadata?.height || 1;
  const ar = H / W;
  const r4 = (n: number) => Math.round(n * 10000) / 10000;
  const zones: Zone[] = [];
  for (const s of q.choiceShapes ?? []) {
    if (s.type === 'polygon' && Array.isArray(s.points)) {
      zones.push({ shape: 'poly', x: 0, y: 0, r: 0, ar, pts: s.points.map((p: K) => [r4(p.x / W), r4(p.y / H)] as [number, number]) });
    } else if (s.type === 'ellipse') {
      const rx = s.radiusX ?? 0, ry = s.radiusY ?? rx;
      if (Math.abs(rx - ry) <= Math.max(2, rx * 0.06)) {
        zones.push({ shape: 'circle', x: r4(s.x / W), y: r4(s.y / H), r: r4((rx + ry) / 2 / W), ar });
      } else {
        const pts: [number, number][] = [];
        for (let i = 0; i < 36; i++) { const t = (i / 36) * Math.PI * 2; pts.push([r4((s.x + rx * Math.cos(t)) / W), r4((s.y + ry * Math.sin(t)) / H)]); }
        zones.push({ shape: 'poly', x: 0, y: 0, r: 0, ar, pts });
      }
    } else if (s.type === 'rectangle' || s.type === 'rect') {
      const w = s.width ?? 0, h = s.height ?? 0;
      zones.push({ shape: 'rect', x: r4((s.x + w / 2) / W), y: r4((s.y + h / 2) / H), r: 0, w: r4(w / W), h: r4(h / H), ar });
    }
  }
  return zones;
}

function convertQuestion(q: K): Question | null {
  const base = { id: uid(), title: htmlToText(q.question ?? q.title), time: Math.round((q.time ?? 0) / 1000), ...mediaOf(q) };
  const pts = (q.pointsMultiplier ?? 1) as 0 | 1 | 2;
  const choices: Choice[] = (q.choices ?? []).map((c: K) => ({ id: uid(), text: htmlToText(c.answer), correct: !!c.correct }));
  switch (q.type) {
    case 'content':
      return { ...base, type: 'slide', time: 0, points: 0, body: htmlToText(q.description) || undefined };
    case 'quiz': {
      const tf = q.layout === 'TRUE_FALSE' || (choices.length === 2 && /^(true|vrai)$/i.test(choices[0].text) && /^(false|faux)$/i.test(choices[1].text));
      if (tf) return { ...base, type: 'truefalse', points: pts, correctBool: choices.find((c) => /^(true|vrai)$/i.test(c.text))?.correct ?? true };
      return { ...base, type: 'choice', points: pts, answers: choices, multi: false };
    }
    case 'multiple_select_quiz':
      return { ...base, type: 'choice', points: pts, answers: choices, multi: true, partial: true };
    case 'survey':
    case 'multiple_select_poll':
      return { ...base, type: 'poll', points: 0, answers: choices.map((c) => ({ ...c, correct: false })), multi: q.type === 'multiple_select_poll' };
    case 'open_ended':
      return { ...base, type: 'type', points: pts, accepted: choices.map((c) => c.text) };
    case 'jumble': {
      const items: Item[] = choices.map((c) => ({ id: c.id, text: c.text }));
      return { ...base, type: 'order', points: pts, items, partial: false };
    }
    case 'slider': {
      const r = q.choiceRange ?? {};
      return { ...base, type: 'slider', points: pts, slider: { min: r.start ?? 0, max: r.end ?? 100, step: r.step || 1, correct: r.correct ?? 0, margin: r.tolerance ?? 0, unit: r.unit || undefined } };
    }
    case 'pin_it':
      return { ...base, type: 'pin', points: pts, zones: zonesOfShapes(q) };
    case 'word_cloud':
      return { ...base, type: 'wordcloud', points: 0 };
    case 'feedback':
    case 'open_question':
      return { ...base, type: 'open', points: 0 };
    case 'brainstorming':
      return { ...base, type: 'brainstorm', points: 0 };
    default:
      return null;
  }
}

export function kahootToQuiz(data: K): { quiz: Quiz; skipped: string[] } {
  const k = data?.kahoot ?? data;
  const skipped: string[] = [];
  const questions: Question[] = [];
  (k.questions ?? []).forEach((q: K, i: number) => {
    const c = convertQuestion(q);
    if (c) questions.push(c);
    else skipped.push(`${i + 1}. ${q.type}`);
  });
  const now = Date.now();
  const cover = k.coverMedia?.url ? ({ kind: 'image', src: k.coverMedia.url } as Media) : undefined;
  return {
    quiz: { id: uid(), title: htmlToText(k.title) || 'Kahoot importé', description: htmlToText(k.description) || undefined, theme: 'neon', cover, questions, createdAt: now, updatedAt: now },
    skipped,
  };
}
