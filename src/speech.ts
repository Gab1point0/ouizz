// Lecture à voix haute (synthèse vocale du navigateur, gratuite, sans fichier).
// Comme Kahoot, la langue de la voix peut être différente de celle du texte (ex. du français lu avec une voix japonaise).

export const SPEECH_LANGS: { id: string; label: string }[] = [
  { id: 'fr-FR', label: '🇫🇷 Français' }, { id: 'en-US', label: '🇺🇸 Anglais (US)' }, { id: 'en-GB', label: '🇬🇧 Anglais (UK)' },
  { id: 'es-ES', label: '🇪🇸 Espagnol' }, { id: 'de-DE', label: '🇩🇪 Allemand' }, { id: 'it-IT', label: '🇮🇹 Italien' },
  { id: 'pt-BR', label: '🇧🇷 Portugais' }, { id: 'nl-NL', label: '🇳🇱 Néerlandais' }, { id: 'ja-JP', label: '🇯🇵 Japonais' },
  { id: 'zh-CN', label: '🇨🇳 Chinois' }, { id: 'ko-KR', label: '🇰🇷 Coréen' }, { id: 'ru-RU', label: '🇷🇺 Russe' },
  { id: 'ar-SA', label: '🇸🇦 Arabe' }, { id: 'hi-IN', label: '🇮🇳 Hindi' }, { id: 'tr-TR', label: '🇹🇷 Turc' }, { id: 'pl-PL', label: '🇵🇱 Polonais' },
];

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const vs = speechSynthesis.getVoices();
  const base = lang.split('-')[0];
  return vs.find((v) => v.lang === lang && /natural|online/i.test(v.name))
    ?? vs.find((v) => v.lang === lang)
    ?? vs.find((v) => v.lang.replace('_', '-').startsWith(base));
}

/** Lit le texte ; renvoie false si le navigateur ne sait pas parler. */
export function speak(text: string, lang = 'fr-FR', rate = 1): boolean {
  if (!supported() || !text.trim()) return false;
  speechSynthesis.cancel();
  const go = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const v = pickVoice(lang);
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  };
  // les voix se chargent parfois après coup (Chrome / Edge)
  if (speechSynthesis.getVoices().length) go();
  else {
    let done = false;
    const once = () => { if (done) return; done = true; go(); };
    speechSynthesis.addEventListener('voiceschanged', once, { once: true });
    setTimeout(once, 600);
  }
  return true;
}

export function stopSpeaking() {
  if (supported()) speechSynthesis.cancel();
}

/** La voix de cette langue existe-t-elle sur cet appareil ? */
export function hasVoice(lang: string): boolean {
  return supported() && !!pickVoice(lang);
}
