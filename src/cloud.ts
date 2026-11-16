// Sauvegarde en ligne des quiz (Supabase, fonctions ouizz_* : voir supabase/ouizz-cloud.sql).
// Le navigateur reste la copie de travail ; chaque modification est envoyée en ligne quelques secondes après,
// et à l'ouverture de « Mes quiz » on récupère ce qui a changé ailleurs (le plus récent gagne).
// L'accès se fait avec un « code de sauvegarde » secret gardé dans ce navigateur.
import type { SupabaseClient } from '@supabase/supabase-js';
import { makeClient } from './net/transport';
import { getQuizRaw, listQuizzesRaw, removeQuizRaw, setQuizRaw } from './storage';
import type { Quiz } from './types';

const KEY = 'ouizz.cloudKey';

export type CloudStatus = 'off' | 'syncing' | 'ok' | 'error';
interface State { status: CloudStatus; error?: string; lastSync?: number }
let state: State = { status: getCloudKey() ? 'ok' : 'off' };
const listeners = new Set<() => void>();
const setState = (s: Partial<State>) => { state = { ...state, ...s }; listeners.forEach((f) => f()); };
export const cloudState = () => state;
export function onCloudChange(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }

export function getCloudKey(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function setCloudKey(k: string | null) {
  try { if (k) localStorage.setItem(KEY, k); else localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Code lisible : ouizz-xxxx-xxxx-xxxx-xxxx-xxxx (≈ 120 bits de hasard) */
export function newCloudKey(): string {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint8Array(20));
  let s = '';
  for (let i = 0; i < 20; i++) { s += a[r[i] % a.length]; if (i % 4 === 3 && i < 19) s += '-'; }
  return `ouizz-${s}`;
}
export const normalizeKey = (k: string) => k.trim().toLowerCase().replace(/\s+/g, '');

let client: SupabaseClient | null = null;
const sb = () => (client ??= makeClient());

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------- envoi des modifications (regroupées) ----------
const pending = new Map<string, Quiz | { deletedAt: number }>();
let timer = 0;

export function queuePut(q: Quiz) {
  if (!getCloudKey()) return;
  pending.set(q.id, q);
  schedule();
}
export function queueDelete(id: string) {
  if (!getCloudKey()) return;
  pending.set(id, { deletedAt: Date.now() });
  schedule();
}
function schedule() {
  clearTimeout(timer);
  setState({ status: 'syncing' });
  timer = window.setTimeout(() => { void flush(); }, 2500);
}

let flushing: Promise<void> | null = null;
export async function flush(): Promise<void> {
  clearTimeout(timer);
  const key = getCloudKey();
  if (!key || !pending.size) { if (key && state.status === 'syncing' && !flushing) setState({ status: 'ok' }); return; }
  if (flushing) { await flushing; return flush(); }
  flushing = (async () => {
    setState({ status: 'syncing' });
    const items = [...pending.entries()];
    pending.clear();
    try {
      for (const [id, v] of items) {
        if ('deletedAt' in v) await rpc('ouizz_delete', { secret: key, quiz_id: id, at: v.deletedAt });
        else await rpc('ouizz_put', { secret: key, quiz: v });
      }
      setState({ status: 'ok', error: undefined, lastSync: Date.now() });
    } catch (e) {
      // on remet en attente ce qui n'est pas parti (sans écraser une version plus récente)
      for (const [id, v] of items) if (!pending.has(id)) pending.set(id, v);
      setState({ status: 'error', error: frenchError(e) });
      clearTimeout(timer);
      timer = window.setTimeout(() => { void flush(); }, 30000);
    }
  })();
  try { await flushing; } finally { flushing = null; }
}

function frenchError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/fetch|network|Failed/i.test(m)) return 'Pas de connexion Internet : nouvel essai dans 30 s.';
  return m;
}

// ---------- récupération ----------
/** Met ce navigateur à jour depuis la sauvegarde en ligne, et envoie ce qui manque en ligne. Renvoie le nombre de quiz modifiés ici. */
export async function pull(): Promise<number> {
  const key = getCloudKey();
  if (!key) return 0;
  await flush();
  setState({ status: 'syncing' });
  try {
    const remote = await rpc<{ id: string; title: string; updated_at: number; deleted: boolean }[]>('ouizz_list', { secret: key });
    const remoteById = new Map(remote.map((r) => [r.id, r]));
    const toFetch: string[] = [];
    let changed = 0;
    for (const r of remote) {
      const local = await getQuizRaw(r.id);
      if (r.deleted) {
        if (local && local.updatedAt <= r.updated_at) { await removeQuizRaw(r.id); changed++; }
      } else if (!local || local.updatedAt < r.updated_at) toFetch.push(r.id);
    }
    for (let i = 0; i < toFetch.length; i += 5) {
      const got = await rpc<Quiz[]>('ouizz_get', { secret: key, ids: toFetch.slice(i, i + 5) });
      for (const q of got) { await setQuizRaw(q); changed++; }
    }
    // quiz présents ici mais absents (ou plus anciens) en ligne -> on les envoie
    for (const q of await listQuizzesRaw()) {
      const r = remoteById.get(q.id);
      if (!r || r.updated_at < q.updatedAt) pending.set(q.id, q);
    }
    if (pending.size) await flush();
    setState({ status: 'ok', error: undefined, lastSync: Date.now() });
    return changed;
  } catch (e) {
    setState({ status: 'error', error: frenchError(e) });
    return 0;
  }
}

/** Active la sauvegarde avec un code (nouveau ou existant) puis synchronise. */
export async function enableCloud(key: string): Promise<number> {
  const k = normalizeKey(key);
  if (k.length < 20) throw new Error('Ce code est trop court.');
  // vérifie que le code est accepté avant de l'enregistrer
  await rpc('ouizz_list', { secret: k });
  setCloudKey(k);
  setState({ status: 'ok', error: undefined });
  return pull();
}

export function disableCloud() {
  clearTimeout(timer);
  pending.clear();
  setCloudKey(null);
  setState({ status: 'off', error: undefined });
}

// on essaie d'envoyer avant que l'onglet ne soit fermé ou mis en arrière-plan
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(); });
}
