export const uid = (n = 8) => {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const r = crypto.getRandomValues(new Uint8Array(n));
  for (let i = 0; i < n; i++) s += a[r[i] % a.length];
  return s;
};

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mélange en garantissant (si possible) un ordre différent de l'original. */
export function shuffleDifferent<T>(arr: readonly T[]): T[] {
  if (arr.length < 2) return arr.slice();
  for (let k = 0; k < 10; k++) {
    const s = shuffle(arr);
    if (s.some((v, i) => v !== arr[i])) return s;
  }
  return arr.slice().reverse();
}

/** minuscules, sans accents ni ponctuation, espaces simplifiés */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´]/g, ' ')
    .replace(/[^\p{L}\p{N}\s.,-]/gu, ' ')
    .replace(/[.,-]/g, (m) => (m === ',' ? '.' : m)) // 3,5 == 3.5
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Compare une réponse tapée à une réponse attendue (tolérance aux fautes de frappe si fuzzy). */
export function textMatches(given: string, expected: string, fuzzy: boolean): boolean {
  const g = normalize(given);
  const e = normalize(expected);
  if (!g) return false;
  if (g === e) return true;
  // « la France » == « France » : on ignore les articles en tête
  const strip = (s: string) => s.replace(/^(le|la|les|l|un|une|des|du|de|d|the|a|an)\s+/, '');
  if (strip(g) === strip(e)) return true;
  if (!fuzzy) return false;
  const tol = e.length >= 9 ? 2 : e.length >= 4 ? 1 : 0;
  return levenshtein(strip(g), strip(e)) <= tol;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function download(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/** Identifiant d'une vidéo YouTube (liens youtube.com, youtu.be, shorts, live, music.youtube.com), sinon null */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

/** Analyse le texte à trous : « La [France|la France] a pour capitale [Paris]. » */
export function parseBlanks(text: string): { parts: string[]; blanks: string[][] } {
  const parts: string[] = [];
  const blanks: string[][] = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    parts.push(text.slice(last, m.index));
    blanks.push(m[1].split('|').map((s) => s.trim()).filter(Boolean));
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return { parts, blanks };
}
