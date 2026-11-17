// Images : compressées dans le navigateur pour rester légères (stockage + envoi aux téléphones).

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function draw(img: HTMLImageElement, maxDim: number, quality: number, png = false): string {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(img, 0, 0, w, h);
  return png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', quality);
}

/** Fichier choisi -> data URL JPEG (max 1280 px). Les GIF animés sont gardés tels quels s'ils sont petits. */
export async function fileToDataUrl(file: File, maxDim = 1280): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  if (file.type === 'image/gif' && raw.length < 1_500_000) return raw;
  if (file.type === 'image/svg+xml' && raw.length < 400_000) return raw;
  const img = await loadImage(raw);
  let out = draw(img, maxDim, 0.85, file.type === 'image/png' && raw.length < 300_000);
  if (out.length > raw.length && raw.length < 600_000) out = raw;
  return out;
}

/** Réduit une data URL jusqu'à passer sous maxChars (pour l'envoi aux téléphones). */
export async function shrinkDataUrl(src: string, maxChars: number): Promise<string> {
  if (src.length <= maxChars) return src;
  const img = await loadImage(src);
  let dim = Math.min(1024, Math.max(img.naturalWidth, img.naturalHeight));
  let q = 0.8;
  for (let i = 0; i < 8; i++) {
    const out = draw(img, dim, q);
    if (out.length <= maxChars) return out;
    dim = Math.round(dim * 0.8);
    q = Math.max(0.5, q - 0.06);
  }
  return draw(img, 320, 0.5);
}

/** Recadre une image (rectangle en fractions 0..1 de l'image) -> data URL (max 1280 px). */
export async function cropImage(src: string, r: { x: number; y: number; w: number; h: number }, maxDim = 1280): Promise<string> {
  const img = await loadImage(src);
  const sx = r.x * img.naturalWidth, sy = r.y * img.naturalHeight;
  const sw = Math.max(1, r.w * img.naturalWidth), sh = Math.max(1, r.h * img.naturalHeight);
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * scale));
  c.height = Math.max(1, Math.round(sh * scale));
  const ctx = c.getContext('2d')!;
  const png = /^data:image\/(png|svg)/.test(src) || /\.png(\?|$)/i.test(src);
  if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  // lève une erreur si l'image vient d'un site qui interdit sa copie (canvas « sali »)
  return png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88);
}
