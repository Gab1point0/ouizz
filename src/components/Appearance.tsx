// Panneau « 🎨 Apparence » de l'éditeur : tous les réglages esthétiques du quiz, avec aperçu en direct.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fileToDataUrl } from '../image';
import { onPreview, previewMusic, previewSounds, stopPreview } from '../sfx';
import {
  answerColorsOf, DECOS, FONTS, LABEL_STYLES, MUSICS, resolveLook, SOUND_PACKS, Styled, tile, TileLabel, TILE_STYLES, TIMER_STYLES, TRANSITIONS, type Look,
} from '../style';
import { DEFAULT_ANSWER_COLORS, THEMES, themeById } from '../themes';
import type { Question, Quiz, QuizStyle } from '../types';
import { pickFile, uid } from '../util';
import { Timer } from './common';

type Tab = 'themes' | 'fond' | 'couleurs' | 'texte' | 'reponses' | 'anim' | 'sons' | 'identite';
const TABS: [Tab, string][] = [
  ['themes', '🎨 Thèmes'], ['fond', '🖼 Fond'], ['couleurs', '🌈 Couleurs'], ['texte', '🔤 Texte'],
  ['reponses', '🔘 Réponses'], ['anim', '✨ Animations'], ['sons', '🔊 Sons'], ['identite', '🏷 Logo & messages'],
];

const PALETTES: [string, string[]][] = [
  ['Vives', DEFAULT_ANSWER_COLORS],
  ['Pastel', ['#ffadad', '#a0c4ff', '#fdffb6', '#caffbf', '#bdb2ff', '#ffc6ff']],
  ['Néon', ['#ff2a6d', '#05d9e8', '#f9f871', '#39ff14', '#b967ff', '#ff9f1c']],
  ['Terre', ['#c8553d', '#588b8b', '#f2a65a', '#8a9a5b', '#6d597a', '#b56576']],
  ['Océan', ['#03045e', '#0077b6', '#00b4d8', '#48cae4', '#023e8a', '#90e0ef']],
  ['Feu', ['#d00000', '#e85d04', '#faa307', '#9d0208', '#f48c06', '#ffba08']],
  ['Forêt', ['#2d6a4f', '#40916c', '#95d5b2', '#1b4332', '#74c69d', '#b7e4c7']],
  ['Monochrome', ['#212529', '#495057', '#868e96', '#343a40', '#6c757d', '#adb5bd']],
  ['Arc-en-ciel', ['#e63946', '#f77f00', '#fcbf49', '#2a9d8f', '#457b9d', '#9d4edd']],
];

// ---------- thèmes perso (gardés dans ce navigateur) ----------
interface MyTheme { id: string; name: string; theme: string; style: QuizStyle }
const MY_KEY = 'ouizz.myThemes';
const loadMine = (): MyTheme[] => { try { return JSON.parse(localStorage.getItem(MY_KEY) ?? '[]'); } catch { return []; } };
const saveMine = (l: MyTheme[]) => { try { localStorage.setItem(MY_KEY, JSON.stringify(l)); } catch { alert('Plus de place pour enregistrer ce thème (image trop lourde ?).'); } };

export function AppearanceEditor({ quiz, question, onChange, onClose }: { quiz: Quiz; question?: Question; onChange: (theme: string, style: QuizStyle) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('themes');
  const [view, setView] = useState<'stage' | 'phone' | 'lobby'>('stage');
  const [replay, setReplay] = useState(0);
  const st = quiz.style ?? {};
  const set = (patch: Partial<QuizStyle>) => onChange(quiz.theme, { ...st, ...patch });
  const look = resolveLook(quiz.theme, st);
  const eff = look.style; // réglages effectifs (thème + perso)

  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal anim-pop appearance">
        <div className="row" style={{ marginBottom: 8 }}>
          <h2>🎨 Apparence du quiz</h2>
          <span className="spacer" />
          <button className="btn btn-sm btn-ghost" onClick={() => { if (confirm('Revenir à l’apparence du thème (tes réglages perso seront effacés, sauf logo et messages) ?')) onChange(quiz.theme, keepIdentity(st)); }}>Tout réinitialiser</button>
          <button className="btn btn-primary" onClick={onClose}>Terminé</button>
        </div>
        <div className="appearance-body">
          <div className="appearance-settings">
            <div className="tabs">
              {TABS.map(([id, label]) => <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
            </div>
            <div className="col" style={{ gap: 14, paddingTop: 10 }}>
              {tab === 'themes' && <ThemesTab quiz={quiz} onChange={onChange} />}
              {tab === 'fond' && <BgTab st={st} eff={eff} set={set} />}
              {tab === 'couleurs' && <ColorsTab st={st} quiz={quiz} set={set} />}
              {tab === 'texte' && <TextTab st={st} eff={eff} set={set} />}
              {tab === 'reponses' && <TilesTab eff={eff} set={set} />}
              {tab === 'anim' && <AnimTab eff={eff} set={set} replay={() => setReplay((x) => x + 1)} />}
              {tab === 'sons' && <SoundTab eff={eff} set={set} />}
              {tab === 'identite' && <IdentityTab st={st} set={set} />}
            </div>
          </div>
          <div className="appearance-preview">
            <div className="row" style={{ justifyContent: 'center', marginBottom: 8 }}>
              {([['stage', '🖥 Grand écran'], ['phone', '📱 Téléphone'], ['lobby', '🚪 Salle d’attente']] as const).map(([v, l]) => (
                <button key={v} className={`btn btn-sm ${view === v ? 'btn-primary' : ''}`} onClick={() => setView(v)}>{l}</button>
              ))}
              <button className="btn btn-sm" onClick={() => setReplay((x) => x + 1)} title="Rejouer la transition">↻</button>
            </div>
            <Preview look={look} view={view} title={question?.title || quiz.title || 'Exemple de question ?'} answers={question?.answers?.map((a) => a.text)} quizTitle={quiz.title} replay={replay} />
            <div className="small muted center" style={{ marginTop: 6 }}>Aperçu en direct. Chaque question peut aussi avoir son propre fond, sa mise en page et son décor (panneau de droite de l’éditeur).</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const keepIdentity = (st: QuizStyle): QuizStyle => ({ logo: st.logo, lobbyMessage: st.lobbyMessage, endMessage: st.endMessage, phonesThemed: st.phonesThemed });

// ---------------- Aperçu ----------------
export function Preview({ look, view, title, answers, quizTitle, replay = 0 }: { look: Look; view: 'stage' | 'phone' | 'lobby'; title: string; answers?: string[]; quizTitle?: string; replay?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const W = view === 'phone' ? 380 : 1100;
  const H = view === 'phone' ? 720 : 620;
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / W, view === 'phone' ? 520 / H : 1));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H, view]);
  const endsAt = useMemo(() => Date.now() + 14000, [replay, view]);
  const labels = (answers?.filter(Boolean).length ? answers.filter(Boolean) : ['Réponse A', 'Réponse B', 'Réponse C', 'Réponse D']).slice(0, 4);
  return (
    <div ref={box} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: W * scale, height: H * scale, overflow: 'hidden', borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,.25)', flex: 'none' }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <Styled look={look} preview className="preview-root">
            <div key={`${replay}:${view}`} className={`${view === 'phone' ? 'phone' : 'stage'} tr-${look.transition}`} style={{ minHeight: H, height: H }}>
              {view === 'stage' && (
                <>
                  <div className="stage-top">
                    {look.logo && <img src={look.logo} alt="" className="stage-logo" />}
                    <span className="chip">Question 3/10</span><span className="chip">🔠 Quiz (QCM)</span>
                    <span className="spacer" /><div className="counter"><b>7</b>réponses / 12</div>
                    <Timer endsAt={endsAt} total={20000} />
                  </div>
                  <div className="stage-title">{title}</div>
                  <div className="stage-body">
                    <div className="ans-grid" style={{ width: '100%' }}>
                      {labels.map((t, i) => <div key={i} className={`ans anim-pop d${i + 1}`} style={tile(i)}><TileLabel i={i} /><span>{t}</span></div>)}
                    </div>
                  </div>
                  <div className="stage-bottom"><span className="chip">🟢 en ligne</span><span className="spacer" /><button className="btn btn-primary btn-big">Révéler →</button></div>
                </>
              )}
              {view === 'lobby' && (
                <>
                  <div className="stage-top">{look.logo ? <img src={look.logo} alt="" className="stage-logo" /> : <span className="logo">Ou<b>izz</b></span>}</div>
                  <div className="row" style={{ justifyContent: 'center' }}>
                    <div className="pin-box"><div><div className="muted">Code de la partie :</div><div className="pin">123 456</div></div><div className="qr" style={{ width: 150, height: 150 }} /></div>
                  </div>
                  <h1 className="center">{quizTitle || 'Mon quiz'}</h1>
                  {look.style.lobbyMessage && <div className="center" style={{ fontSize: '1.3em', whiteSpace: 'pre-wrap' }}>{look.style.lobbyMessage}</div>}
                  <div className="players">{['🦊 Léa', '🐼 Tom', '🦄 Inès', '🐸 Max'].map((p) => <div key={p} className="player-chip">{p}</div>)}</div>
                </>
              )}
              {view === 'phone' && (
                <>
                  {look.logo && <img src={look.logo} alt="" className="stage-logo" style={{ alignSelf: 'center', maxHeight: 40 }} />}
                  <div className="phone-top"><span style={{ fontSize: '1.6em' }}>🦊</span><span className="grow">Léa</span><span className="chip">2 450 pts</span></div>
                  <div className="card center" style={{ fontWeight: 800, fontSize: '1.15em', padding: 12 }}>{title}</div>
                  <div className="phone-main">
                    <div className="phone-ans">
                      {labels.map((t, i) => <button key={i} className={`ans anim-pop d${i + 1}`} style={tile(i)}><TileLabel i={i} /><span>{t}</span></button>)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Styled>
        </div>
      </div>
    </div>
  );
}

// ---------------- petits champs ----------------
function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return <label className="field">{label}{children}{help && <span className="small muted">{help}</span>}</label>;
}
export function ColorField({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v?: string) => void }) {
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
      <input type="color" value={toHex(value ?? fallback)} onChange={(e) => onChange(e.target.value)} style={{ width: 44, height: 34, border: 'none', background: 'none', padding: 0, flex: 'none' }} />
      <span className="grow small">{label}</span>
      {value && <button className="btn btn-sm btn-ghost" onClick={() => onChange(undefined)} title="Revenir à la couleur du thème">↺</button>}
    </div>
  );
}
const toHex = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c : /^#[0-9a-f]{3}$/i.test(c) ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : '#888888');
function Slider({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  return (
    <label className="field">{label} <b style={{ color: 'var(--fg)' }}>{fmt ? fmt(value) : value}</b>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
function Choices<T extends string>({ value, options, onChange }: { value: T; options: readonly { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="choice-grid">
      {options.map((o) => <button key={o.id} className={`type-btn ${value === o.id ? 'active' : ''}`} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}
async function pickImage(maxDim: number): Promise<string | null> {
  const f = await pickFile('image/*');
  return f ? fileToDataUrl(f, maxDim) : null;
}

// ---------------- onglets ----------------
function ThemesTab({ quiz, onChange }: { quiz: Quiz; onChange: (t: string, s: QuizStyle) => void }) {
  const [mine, setMine] = useState<MyTheme[]>(loadMine);
  const st = quiz.style ?? {};
  const apply = (theme: string, style: QuizStyle) => onChange(theme, { ...style, ...keepIdentity(st) });
  return (
    <>
      <div className="small muted">Choisis une ambiance de départ, puis ajuste chaque détail dans les autres onglets.</div>
      <div className="theme-grid">
        {THEMES.map((t) => (
          <button key={t.id} className={`theme-card ${quiz.theme === t.id && !Object.keys(st).some((k) => !['logo', 'lobbyMessage', 'endMessage', 'phonesThemed'].includes(k)) ? 'active' : ''}`} onClick={() => apply(t.id, {})}>
            <MiniSwatch look={resolveLook(t.id)} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>
      <h3 style={{ marginTop: 8 }}>Mes thèmes</h3>
      {mine.length === 0 && <div className="small muted">Enregistre l’apparence actuelle pour la réutiliser sur tes autres quiz.</div>}
      <div className="theme-grid">
        {mine.map((m) => (
          <div key={m.id} className="theme-card" onClick={() => apply(m.theme, m.style)} role="button">
            <MiniSwatch look={resolveLook(m.theme, m.style)} />
            <span>{m.name}</span>
            <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); if (confirm(`Supprimer le thème « ${m.name} » ?`)) { const l = mine.filter((x) => x.id !== m.id); saveMine(l); setMine(l); } }}>✕</button>
          </div>
        ))}
      </div>
      <button className="btn" onClick={() => {
        const name = prompt('Nom de ce thème perso :', quiz.title ? `Style ${quiz.title}` : 'Mon thème');
        if (!name) return;
        const { logo: _l, lobbyMessage: _m, endMessage: _e, ...rest } = st;
        void _l; void _m; void _e;
        const l = [...mine, { id: uid(), name, theme: quiz.theme, style: rest }];
        saveMine(l); setMine(l);
      }}>💾 Enregistrer l’apparence actuelle comme thème perso</button>
    </>
  );
}

function MiniSwatch({ look }: { look: Look }) {
  return (
    <Styled look={{ ...look, deco: 'none' }} preview className="mini-swatch">
      <div className="mini-inner">
        <div className="mini-title">Aa</div>
        <div className="mini-tiles">{[0, 1, 2, 3].map((i) => <div key={i} className="ans" style={tile(i)} />)}</div>
      </div>
    </Styled>
  );
}

function BgTab({ st, eff, set }: { st: QuizStyle; eff: QuizStyle; set: (p: Partial<QuizStyle>) => void }) {
  const mode = eff.bgMode ?? 'theme';
  return (
    <>
      <Choices value={mode} options={[{ id: 'theme', label: 'Couleur du thème' }, { id: 'color', label: 'Couleur unie' }, { id: 'gradient', label: 'Dégradé' }, { id: 'image', label: 'Image / photo' }] as const} onChange={(v) => set({ bgMode: v })} />
      {(mode === 'color' || mode === 'gradient') && <ColorField label={mode === 'gradient' ? 'Couleur 1' : 'Couleur du fond'} value={st.bg} fallback={eff.bg ?? '#336699'} onChange={(v) => set({ bg: v })} />}
      {mode === 'gradient' && (
        <>
          <ColorField label="Couleur 2" value={st.bg2} fallback={eff.bg2 ?? '#112233'} onChange={(v) => set({ bg2: v })} />
          <Choices value={eff.gradType ?? 'linear'} options={[{ id: 'linear', label: 'Dégradé droit' }, { id: 'radial', label: 'Dégradé rond' }] as const} onChange={(v) => set({ gradType: v })} />
          {(eff.gradType ?? 'linear') === 'linear' && <Slider label="Direction" value={eff.gradAngle ?? 135} min={0} max={360} step={5} onChange={(v) => set({ gradAngle: v })} fmt={(v) => `${v}°`} />}
        </>
      )}
      {mode === 'image' && (
        <>
          <div className="row">
            <button className="btn" onClick={async () => { const src = await pickImage(1920); if (src) set({ bgImage: src }); }}>🖼 Choisir une image</button>
            <UrlInput onUrl={(u) => set({ bgImage: u })} />
          </div>
          {st.bgImage && <img src={st.bgImage} alt="" style={{ maxHeight: 90, borderRadius: 8, objectFit: 'cover' }} />}
          <Choices value={eff.bgFit ?? 'cover'} options={[{ id: 'cover', label: 'Remplir l’écran' }, { id: 'contain', label: 'Image entière' }, { id: 'tile', label: 'Mosaïque' }] as const} onChange={(v) => set({ bgFit: v })} />
          <Slider label="Voile (assombrir ← → éclaircir)" value={-(eff.overlay ?? 0.3)} min={-0.85} max={0.85} step={0.05} onChange={(v) => set({ overlay: -v })} fmt={(v) => (v < 0 ? `sombre ${Math.round(-v * 100)} %` : v > 0 ? `clair ${Math.round(v * 100)} %` : 'aucun')} />
          <Slider label="Flou" value={eff.blur ?? 0} min={0} max={16} step={1} onChange={(v) => set({ blur: v })} fmt={(v) => `${v} px`} />
        </>
      )}
    </>
  );
}

function UrlInput({ onUrl }: { onUrl: (u: string) => void }) {
  const [u, setU] = useState('');
  return (
    <div className="row grow" style={{ flexWrap: 'nowrap' }}>
      <input className="input" placeholder="…ou coller un lien d’image" value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && u.trim()) { onUrl(u.trim()); setU(''); } }} />
      <button className="btn" disabled={!u.trim()} onClick={() => { onUrl(u.trim()); setU(''); }}>OK</button>
    </div>
  );
}

function ColorsTab({ st, quiz, set }: { st: QuizStyle; quiz: Quiz; set: (p: Partial<QuizStyle>) => void }) {
  const tv = themeById(quiz.theme).vars;
  const colors = answerColorsOf(st, quiz.theme);
  return (
    <>
      <ColorField label="Texte" value={st.fg} fallback={tv['--fg']} onChange={(v) => set({ fg: v })} />
      <ColorField label="Couleur principale (boutons, chrono)" value={st.accent} fallback={tv['--accent']} onChange={(v) => set({ accent: v })} />
      <ColorField label="Cartes (titre, encadrés)" value={st.card} fallback={tv['--card']} onChange={(v) => set({ card: v })} />
      <Slider label="Opacité des cartes" value={st.cardOpacity ?? 1} min={0.15} max={1} step={0.05} onChange={(v) => set({ cardOpacity: v })} fmt={(v) => `${Math.round(v * 100)} %`} />
      <h3>Couleurs des réponses</h3>
      <div className="row">
        {colors.map((c, i) => (
          <input key={i} type="color" value={toHex(c)} title={`Réponse ${i + 1}`} onChange={(e) => { const a = colors.slice(); a[i] = e.target.value; set({ answerColors: a }); }} style={{ width: 44, height: 40, border: 'none', background: 'none', padding: 0 }} />
        ))}
        {st.answerColors && <button className="btn btn-sm btn-ghost" onClick={() => set({ answerColors: undefined })}>↺ celles du thème</button>}
      </div>
      <div className="small muted">Palettes toutes prêtes :</div>
      <div className="choice-grid">
        {PALETTES.map(([name, p]) => (
          <button key={name} className="type-btn" onClick={() => set({ answerColors: p })}>
            <span style={{ display: 'flex', gap: 2 }}>{p.map((c) => <i key={c} style={{ width: 12, height: 18, background: c, borderRadius: 3, display: 'inline-block' }} />)}</span> {name}
          </button>
        ))}
      </div>
    </>
  );
}

function TextTab({ st, eff, set }: { st: QuizStyle; eff: QuizStyle; set: (p: Partial<QuizStyle>) => void }) {
  useEffect(() => { /* précharge les polices pour la liste */ }, []);
  return (
    <>
      <Field label="Police du texte">
        <FontSelect value={eff.font ?? 'system'} onChange={(v) => set({ font: v })} />
      </Field>
      <Field label="Police des titres">
        <FontSelect value={eff.titleFont ?? ''} onChange={(v) => set({ titleFont: v || undefined })} allowSame />
      </Field>
      <Slider label="Taille des titres" value={st.titleScale ?? 1} min={0.6} max={1.8} step={0.05} onChange={(v) => set({ titleScale: v })} fmt={(v) => `${Math.round(v * 100)} %`} />
      <Choices value={eff.titleAlign ?? 'center'} options={[{ id: 'center', label: 'Titres centrés' }, { id: 'left', label: 'Titres à gauche' }] as const} onChange={(v) => set({ titleAlign: v })} />
      <label className="check"><input type="checkbox" checked={!!eff.titleUpper} onChange={(e) => set({ titleUpper: e.target.checked })} /> Titres en MAJUSCULES</label>
      <label className="check"><input type="checkbox" checked={!!eff.textShadow} onChange={(e) => set({ textShadow: e.target.checked })} /> Effet lumineux sur les titres</label>
    </>
  );
}

function FontSelect({ value, onChange, allowSame }: { value: string; onChange: (v: string) => void; allowSame?: boolean }) {
  const [open, setOpen] = useState(false);
  const cur = FONTS.find((f) => f.id === value);
  useEffect(() => { if (open) FONTS.forEach((f) => { if (f.g) { const id = `font-${f.id}`; if (!document.getElementById(id)) { const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f.g}&display=swap`; document.head.appendChild(l); } } }); }, [open]);
  return (
    <div>
      <button className="select" style={{ textAlign: 'left', fontFamily: cur?.family, cursor: 'pointer' }} onClick={() => setOpen((x) => !x)}>{cur?.label ?? (allowSame ? 'Comme le texte' : 'Système')} ▾</button>
      {open && (
        <div className="font-list">
          {allowSame && <button className="type-btn" onClick={() => { onChange(''); setOpen(false); }}>Comme le texte</button>}
          {FONTS.map((f) => (
            <button key={f.id} className={`type-btn ${value === f.id ? 'active' : ''}`} style={{ fontFamily: f.family, fontSize: '1.05em' }} onClick={() => { onChange(f.id); setOpen(false); }}>{f.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function TilesTab({ eff, set }: { eff: QuizStyle; set: (p: Partial<QuizStyle>) => void }) {
  return (
    <>
      <div className="small muted" style={{ fontWeight: 700 }}>Style des tuiles de réponse</div>
      <Choices value={eff.tileStyle ?? 'solid'} options={TILE_STYLES} onChange={(v) => set({ tileStyle: v })} />
      <Slider label="Arrondi des coins" value={eff.radius ?? 1} min={0} max={2.5} step={0.1} onChange={(v) => set({ radius: v })} fmt={(v) => (v === 0 ? 'carrés' : v < 0.8 ? 'peu arrondis' : v < 1.6 ? 'arrondis' : 'très arrondis')} />
      <div className="small muted" style={{ fontWeight: 700 }}>Repère sur chaque réponse</div>
      <Choices value={eff.labels ?? 'letters'} options={LABEL_STYLES} onChange={(v) => set({ labels: v })} />
      {eff.labels === 'emoji' && <Field label="Tes emojis (dans l’ordre des réponses)" help="Ex. 🍎🍊🍋🍏🍇🍓"><input className="input" value={eff.labelEmojis ?? ''} onChange={(e) => set({ labelEmojis: e.target.value })} /></Field>}
    </>
  );
}

function AnimTab({ eff, set, replay }: { eff: QuizStyle; set: (p: Partial<QuizStyle>) => void; replay: () => void }) {
  return (
    <>
      <div className="small muted" style={{ fontWeight: 700 }}>Décor animé en arrière-plan</div>
      <Choices value={eff.deco ?? 'none'} options={DECOS} onChange={(v) => set({ deco: v })} />
      {eff.deco === 'emoji' && <Field label="Emojis qui tombent" help="Mets-en un ou plusieurs : 🎉⚽🏀"><input className="input" value={eff.decoEmoji ?? ''} onChange={(e) => set({ decoEmoji: e.target.value })} /></Field>}
      {eff.deco && eff.deco !== 'none' && <Slider label="Quantité" value={eff.decoAmount ?? 1} min={0.3} max={3} step={0.1} onChange={(v) => set({ decoAmount: v })} fmt={(v) => `×${v.toFixed(1)}`} />}
      <div className="small muted" style={{ fontWeight: 700 }}>Transition entre les écrans</div>
      <Choices value={eff.transition ?? 'fade'} options={TRANSITIONS} onChange={(v) => { set({ transition: v }); setTimeout(replay, 50); }} />
      <div className="small muted" style={{ fontWeight: 700 }}>Chrono</div>
      <Choices value={eff.timerStyle ?? 'circle'} options={TIMER_STYLES} onChange={(v) => set({ timerStyle: v })} />
      <label className="check"><input type="checkbox" checked={eff.confettiOnPodium !== false} onChange={(e) => set({ confettiOnPodium: e.target.checked })} /> Confettis sur le podium</label>
      <label className="check"><input type="checkbox" checked={eff.phoneCelebrate !== false} onChange={(e) => set({ phoneCelebrate: e.target.checked })} /> Confettis sur le téléphone en cas de bonne réponse</label>
    </>
  );
}

function SoundTab({ eff, set }: { eff: QuizStyle; set: (p: Partial<QuizStyle>) => void }) {
  return (
    <>
      <div className="small muted" style={{ fontWeight: 700 }}>Musique de la salle d’attente</div>
      <div className="choice-grid">
        {MUSICS.map((m) => (
          <div key={m.id} className={`type-btn ${(eff.music ?? 'calm') === m.id ? 'active' : ''}`} onClick={() => set({ music: m.id })} role="button">
            <span className="grow">{m.label}</span>
            {m.id !== 'none' && <PreviewBtn id={m.id} />}
          </div>
        ))}
      </div>
      <div className="small muted" style={{ fontWeight: 700 }}>Pendant les questions</div>
      <div className="choice-grid">
        {([['thinking', 'Musique de réflexion'], ['none', 'Silence']] as const).map(([id, label]) => (
          <div key={id} className={`type-btn ${(eff.questionMusic ?? 'thinking') === id ? 'active' : ''}`} onClick={() => set({ questionMusic: id })} role="button">
            <span className="grow">{label}</span>
            {id !== 'none' && <PreviewBtn id="thinking" />}
          </div>
        ))}
        <div className="type-btn" role="button" onClick={() => previewMusic('podium')}><span className="grow">Jingle du podium</span><PreviewBtn id="podium" /></div>
      </div>
      <div className="small muted">Pas de musique de réflexion sur les questions avec vidéo (blind test) ni au buzzer.</div>
      <div className="small muted" style={{ fontWeight: 700 }}>Bruitages</div>
      <div className="choice-grid">
        {SOUND_PACKS.map((m) => (
          <div key={m.id} className={`type-btn ${(eff.soundPack ?? 'classic') === m.id ? 'active' : ''}`} onClick={() => set({ soundPack: m.id })} role="button">
            <span className="grow">{m.label}</span>
            {m.id !== 'none' && <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); previewSounds(m.id); }} title="Écouter">▶</button>}
          </div>
        ))}
      </div>
      <div className="small muted">Musiques créées avec Gemini (filigrane audio SynthID). Les sons et la musique peuvent aussi être coupés au lancement de chaque partie.</div>
    </>
  );
}

function IdentityTab({ st, set }: { st: QuizStyle; set: (p: Partial<QuizStyle>) => void }) {
  return (
    <>
      <Field label="Logo (affiché en haut de l’écran et sur les téléphones)">
        <div className="row">
          <button className="btn" onClick={async () => { const src = await pickImage(600); if (src) set({ logo: src }); }}>🖼 Choisir un logo</button>
          {st.logo && <><img src={st.logo} alt="" style={{ maxHeight: 50, maxWidth: 160, objectFit: 'contain' }} /><button className="btn btn-sm" onClick={() => set({ logo: undefined })}>Retirer</button></>}
        </div>
      </Field>
      <Field label="Message de la salle d’attente" help="Ex. « Bienvenue à la soirée quiz de Julie ! »">
        <textarea className="textarea" value={st.lobbyMessage ?? ''} onChange={(e) => set({ lobbyMessage: e.target.value || undefined })} />
      </Field>
      <Field label="Message de fin (sur le podium)">
        <textarea className="textarea" value={st.endMessage ?? ''} onChange={(e) => set({ endMessage: e.target.value || undefined })} />
      </Field>
      <label className="check"><input type="checkbox" checked={st.phonesThemed !== false} onChange={(e) => set({ phonesThemed: e.target.checked })} /> Appliquer cette apparence aussi sur les téléphones des joueurs</label>
    </>
  );
}

/** Bouton d'écoute : ▶ (écouter), ⏳ (chargement du morceau), ⏹ (arrêter). Un seul aperçu à la fois. */
let previewState: { id: string | null; state: 'loading' | 'playing' | null } = { id: null, state: null };
const previewSubs = new Set<() => void>();
onPreview((id, state) => { previewState = { id, state }; previewSubs.forEach((f) => f()); });
function PreviewBtn({ id }: { id: string }) {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); previewSubs.add(f); return () => { previewSubs.delete(f); }; }, []);
  useEffect(() => () => { if (previewState.id) stopPreview(); }, []);
  const mine = previewState.id === id;
  const label = mine ? (previewState.state === 'loading' ? '⏳' : '⏹') : '▶';
  return (
    <button className="btn btn-sm btn-ghost" title={mine ? (previewState.state === 'loading' ? 'Chargement…' : 'Arrêter') : 'Écouter'}
      onClick={(e) => { e.stopPropagation(); previewMusic(id); }}>{label}</button>
  );
}
