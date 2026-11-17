// Quiz enregistrés dans ce navigateur (IndexedDB : beaucoup de place, images comprises).
import { isKahoot, kahootToQuiz } from './kahoot';
import { createStore, del, get, keys, set } from 'idb-keyval';
import { queueDelete, queuePut } from './cloud';
import type { Quiz } from './types';
import { uid } from './util';

const quizStore = createStore('ouizz', 'quizzes');
const reportStore = createStore('ouizz-reports', 'reports');

// --- accès bruts (sans sauvegarde en ligne), utilisés par cloud.ts ---
export async function listQuizzesRaw(): Promise<Quiz[]> {
  const ks = await keys(quizStore);
  const all = await Promise.all(ks.map((k) => get<Quiz>(k, quizStore)));
  return all.filter(Boolean) as Quiz[];
}
export const getQuizRaw = (id: string) => get<Quiz>(id, quizStore);
export const setQuizRaw = (q: Quiz) => set(q.id, q, quizStore);
export const removeQuizRaw = (id: string) => del(id, quizStore);

// --- accès normaux : chaque modification part aussi dans la sauvegarde en ligne (si activée) ---
export async function listQuizzes(): Promise<Quiz[]> {
  return (await listQuizzesRaw()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getQuiz = getQuizRaw;

export async function saveQuiz(q: Quiz) {
  const saved = { ...q, updatedAt: Date.now() };
  await set(q.id, saved, quizStore);
  queuePut(saved);
}

export async function deleteQuiz(id: string) {
  await del(id, quizStore);
  queueDelete(id);
}

export async function duplicateQuiz(q: Quiz): Promise<Quiz> {
  const copy: Quiz = { ...structuredClone(q), id: uid(), title: `${q.title} (copie)`, createdAt: Date.now(), updatedAt: Date.now() };
  await saveQuiz(copy);
  return copy;
}

/** Fichier .ouizz.json : un quiz ou une liste de quiz */
export function exportQuizzes(qs: Quiz[]): string {
  return JSON.stringify({ app: 'ouizz', version: 1, quizzes: qs }, null, 1);
}

export async function importQuizzes(text: string): Promise<Quiz[]> {
  const data = JSON.parse(text);
  if (isKahoot(data)) {
    const { quiz } = kahootToQuiz(data);
    await saveQuiz(quiz);
    return [quiz];
  }
  const list: Quiz[] = Array.isArray(data) ? data : data.quizzes ?? (data.questions ? [data] : []);
  const out: Quiz[] = [];
  for (const q of list) {
    if (!q || !Array.isArray(q.questions)) continue;
    const exists = await getQuiz(q.id);
    const quiz: Quiz = { ...q, id: exists ? uid() : q.id || uid(), theme: q.theme || 'craie', createdAt: q.createdAt || Date.now(), updatedAt: Date.now() };
    await saveQuiz(quiz);
    out.push(quiz);
  }
  return out;
}

// ---------- Rapports de parties ----------
export interface Report {
  id: string;
  quizId: string;
  quizTitle: string;
  date: number;
  players: { name: string; avatar: string; score: number; correct: number; team?: number }[];
  questions: { title: string; type: string; scored: boolean; successRate: number | null; answers: number }[];
  table: { name: string; perQ: (number | null)[] }[];
}

export const saveReport = (r: Report) => set(r.id, r, reportStore);
export async function listReports(): Promise<Report[]> {
  const ks = await keys(reportStore);
  const all = await Promise.all(ks.map((k) => get<Report>(k, reportStore)));
  return (all.filter(Boolean) as Report[]).sort((a, b) => b.date - a.date);
}
export const deleteReport = (id: string) => del(id, reportStore);
