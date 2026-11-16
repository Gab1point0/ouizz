// Connexion temps réel (Supabase Realtime). La clé « publishable » est publique par conception :
// elle ne donne accès qu'aux canaux de diffusion, pas aux données.
// Modifiable sans toucher au code : Réglages -> Serveur temps réel (stocké dans ce navigateur).

export interface RealtimeConfig { url: string; key: string }

export const DEFAULT_CONFIG: RealtimeConfig = {
  url: 'https://vvsmienmspftdzqykhnt.supabase.co',
  key: 'sb_publishable_D0cEBEyEtCTA6Ys1xsQKoA_-uN-BEEN',
};

const KEY = 'ouizz.realtime';

export function getConfig(): RealtimeConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as RealtimeConfig;
      if (c.url && c.key) return c;
    }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

export function setConfig(c: RealtimeConfig | null) {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
