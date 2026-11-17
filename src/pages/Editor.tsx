// Éditeur de quiz : liste des questions à gauche, question au centre, réglages à droite.
import { CropModal, cropPoint, type CropRect } from '../components/CropModal';
import { Grip, Sortable } from '../components/Sortable';
import { plain } from '../components/Rich';
import { hasVoice, speak, SPEECH_LANGS, stopSpeaking } from '../speech';
import { useEffect, useRef, useState } from 'react';
import { answerColor, go, MediaView, Modal } from '../components/common';
import { fileToDataUrl, shrinkDataUrl } from '../image';
import { changeType, newQuestion, QT, QTYPES, questionProblems } from '../qtypes';
import { getQuiz, saveQuiz } from '../storage';
import { themeStyle } from '../themes';
import { AppearanceEditor, ColorField } from '../components/Appearance';
import { DECOS, LookProvider, qlookOf, resolveLook, tile, TileLabel, TRANSITIONS } from '../style';
import type { DecoId, Media, QType, Question, QuestionLook, Quiz, TransitionId, Zone } from '../types';
import { ZoneShapes } from '../components/ZoneShapes';
import { polyArea, simplify, zonesOf } from '../zones';
import { parseBlanks, pickFile, uid } from '../util';

export function EditorPage({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [sel, setSel] = useState(0);
  const [saved, setSaved] = useState(true);
  const [adding, setAdding] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);
  // glisser-déposer des questions dans la liste de gauche
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const timer = useRef(0);

  useEffect(() => { getQuiz(quizId).then((q) => setQuiz(q ?? null)); }, [quizId]);

  const update = (fn: (q: Quiz) => Quiz) => {
    setQuiz((q) => {
      if (!q) return q;
      const n = fn(q);
      setSaved(false);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void saveQuiz(n).then(() => setSaved(true)); }, 500);
      return n;
    });
  };
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => { if (!saved) e.preventDefault(); };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [saved]);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  if (!quiz) return <div className="app" style={themeStyle()}><div className="page"><div className="spinner" /></div></div>;

  const q = quiz.questions[sel];
  const setQ = (fn: (q: Question) => Question) => update((z) => ({ ...z, questions: z.questions.map((x, i) => (i === sel ? fn(x) : x)) }));
  const addQuestion = (type: QType) => {
    const nq = newQuestion(type);
    update((z) => ({ ...z, questions: [...z.questions.slice(0, sel + 1), nq, ...z.questions.slice(sel + 1)] }));
    setSel(quiz.questions.length ? sel + 1 : 0);
    setAdding(false);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= quiz.questions.length) return;
    update((z) => {
      const a = z.questions.slice();
      const [x] = a.splice(from, 1);
      a.splice(to, 0, x);
      return { ...z, questions: a };
    });
    setSel(to);
  };
  const duplicate = () => {
    const copy: Question = { ...structuredClone(q), id: uid() };
    update((z) => ({ ...z, questions: [...z.questions.slice(0, sel + 1), copy, ...z.questions.slice(sel + 1)] }));
    setSel(sel + 1);
  };
  const remove = () => {
    if (!confirm('Supprimer cette question ?')) return;
    update((z) => ({ ...z, questions: z.questions.filter((_, i) => i !== sel) }));
    setSel(Math.max(0, sel - 1));
  };

  const applyLookToAll = (look?: QuestionLook) => {
    if (!confirm('Appliquer l’apparence de cette question (fond, mise en page, décor…) à toutes les questions ?')) return;
    update((z) => ({ ...z, questions: z.questions.map((x) => ({ ...x, look: look ? structuredClone(look) : undefined, bg: undefined })) }));
  };
  const look = resolveLook(quiz.theme, quiz.style, q ? qlookOf(q) : undefined);

  return (
    <LookProvider look={look}>
    <div className={`app editor-root ${look.cls}`} style={{ ...look.vars, ['--q-font' as string]: (look.vars as Record<string, string>)['--font'], ['--q-title-font' as string]: (look.vars as Record<string, string>)['--title-font'] === 'var(--font)' ? (look.vars as Record<string, string>)['--font'] : (look.vars as Record<string, string>)['--title-font'], ['--font' as string]: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", ['--title-font' as string]: 'inherit' }}>
      <div className="toolbar">
        <button className="btn btn-ghost" onClick={async () => { clearTimeout(timer.current); await saveQuiz(quiz); go('/host'); }}>← Mes quiz</button>
        <input className="input" style={{ maxWidth: 420, fontWeight: 700 }} placeholder="Titre du quiz" value={quiz.title} onChange={(e) => update((z) => ({ ...z, title: e.target.value }))} />
        <button className="btn" onClick={() => setLookOpen(true)}>🎨 Apparence</button>
        <span className="spacer" />
        <span className="small muted">{saved ? '✓ Enregistré' : 'Enregistrement…'}</span>
        <button className="btn btn-primary" disabled={!quiz.questions.length} onClick={async () => { clearTimeout(timer.current); await saveQuiz(quiz); go(`/run/${quiz.id}`); }}>▶ Jouer</button>
      </div>
      <div className="editor">
        <div className="ed-list">
          {quiz.questions.map((x, i) => {
            const pb = questionProblems(x);
            return (
              <div key={x.id} className={`ed-thumb ${i === sel ? 'active' : ''} ${dragFrom === i ? 'dragging' : ''} ${dropAt === i && dragFrom !== null && dragFrom !== i ? (dragFrom < i ? 'drop-after' : 'drop-before') : ''}`}
                onClick={() => setSel(i)} draggable title="Glisser pour déplacer"
                onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
                onDragOver={(e) => { if (dragFrom === null) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropAt !== i) setDropAt(i); }}
                onDrop={(e) => { e.preventDefault(); if (dragFrom !== null && dragFrom !== i) move(dragFrom, i); setDragFrom(null); setDropAt(null); }}
                onDragEnd={() => { setDragFrom(null); setDropAt(null); }}>
                <span className="n">{i + 1}</span>
                <span style={{ fontSize: '1.3em' }}>{QT[x.type].icon}</span>
                <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {plain(x.title) || <i className="muted">{QT[x.type].label}</i>}
                </span>
                {pb.length > 0 && <span className="warn" title={pb.join('\n')}>⚠</span>}
              </div>
            );
          })}
          <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Ajouter</button>
        </div>

        {q ? (
          <>
            <div className="ed-main" style={look.backdrop ? { background: look.backdrop.background, backgroundColor: 'var(--bg)' } : undefined}>
              <div className="row">
                <span className="chip">{QT[q.type].icon} {QT[q.type].label}</span>
                <span className="spacer" />
                <button className="btn btn-sm" onClick={duplicate}>Dupliquer</button>
                <button className="btn btn-sm btn-danger" onClick={remove}>Supprimer</button>
              </div>
              <textarea ref={titleRef} className="textarea ed-title" style={{ background: 'var(--card)', minHeight: 60 }} placeholder={q.type === 'slide' ? 'Titre de la diapositive' : 'Écris ta question ici'} value={q.title} onChange={(e) => setQ((x) => ({ ...x, title: e.target.value }))} />
              <div className="row small muted" style={{ marginTop: -6 }}>
                <button className="btn btn-sm btn-ghost" title="Mettre la sélection en gras" onMouseDown={(e) => { e.preventDefault(); boldSelection(titleRef.current, (v) => setQ((x) => ({ ...x, title: v }))); }}><b>G</b> Gras</button>
                <span>Sélectionne des mots puis « Gras », ou écris **comme ceci** (marche aussi dans les réponses et les diapositives).</span>
              </div>
              <MediaEditor q={q} setQ={setQ} />
              <SpeechEditor q={q} setQ={setQ} />
              <TypeEditor q={q} setQ={setQ} />
              {questionProblems(q).map((p) => <div key={p} className="problems">⚠ {p}</div>)}
            </div>
            <SidePanel q={q} setQ={setQ} onAll={applyLookToAll} />
          </>
        ) : (
          <div className="ed-main center col" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '3em' }}>✨</div>
            <h2>Ajoute ta première question</h2>
            <button className="btn btn-primary btn-big" onClick={() => setAdding(true)}>+ Ajouter une question</button>
          </div>
        )}
      </div>
      {adding && <TypePicker onPick={addQuestion} onClose={() => setAdding(false)} />}
      {lookOpen && <AppearanceEditor quiz={quiz} question={q} onChange={(theme, style) => update((z) => ({ ...z, theme, style }))} onClose={() => setLookOpen(false)} />}
    </div>
    </LookProvider>
  );
}

function TypePicker({ onPick, onClose }: { onPick: (t: QType) => void; onClose: () => void }) {
  const groups: [string, 'quiz' | 'avis' | 'contenu'][] = [['Questions notées', 'quiz'], ['Recueillir des avis', 'avis'], ['Contenu', 'contenu']];
  return (
    <Modal onClose={onClose}>
      <h2>Quel type de question ?</h2>
      {groups.map(([label, g]) => (
        <div key={g} style={{ marginTop: 14 }}>
          <div className="muted small" style={{ marginBottom: 6, fontWeight: 700 }}>{label}</div>
          <div className="type-grid">
            {QTYPES.filter((t) => t.group === g).map((t) => (
              <button key={t.type} className="type-btn" onClick={() => onPick(t.type)}>
                <span style={{ fontSize: '1.5em' }}>{t.icon}</span>
                <span><b>{t.label}</b><br /><span className="muted">{t.help}</span></span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </Modal>
  );
}

type SetQ = (fn: (q: Question) => Question) => void;

/** Entoure la sélection d'un champ de ** (gras). */
function boldSelection(el: HTMLTextAreaElement | HTMLInputElement | null, set: (v: string) => void) {
  if (!el) return;
  const { selectionStart: a, selectionEnd: b, value } = el;
  if (a === null || b === null || a === b) return;
  set(value.slice(0, a) + '**' + value.slice(a, b) + '**' + value.slice(b));
}

function SpeechEditor({ q, setQ }: { q: Question; setQ: SetQ }) {
  const sp = q.speech;
  if (q.type === 'pin') return null;
  if (!sp) return <button className="btn btn-sm btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setQ((x) => ({ ...x, speech: { text: '', lang: 'fr-FR' } }))}>🗣 Ajouter une lecture à voix haute</button>;
  const set = (p: Partial<NonNullable<Question['speech']>>) => setQ((x) => ({ ...x, speech: { ...sp, ...p } }));
  return (
    <div className="card col" style={{ gap: 8 }}>
      <div className="row"><b className="grow">🗣 Lecture à voix haute</b><button className="btn btn-sm btn-ghost" onClick={() => { stopSpeaking(); setQ((x) => ({ ...x, speech: undefined })); }}>Retirer</button></div>
      <textarea className="textarea" style={{ minHeight: 60 }} placeholder="Texte lu par le grand écran au début de la question" value={sp.text} onChange={(e) => set({ text: e.target.value })} />
      <div className="row">
        <label className="field grow">Voix
          <select className="input" value={sp.lang} onChange={(e) => set({ lang: e.target.value })}>
            {SPEECH_LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
        <button className="btn" onClick={() => speak(sp.text, sp.lang)} disabled={!sp.text.trim()}>▶ Écouter</button>
      </div>
      <div className="small muted">Le texte est lu une fois quand la question s’affiche (bouton « Réécouter » pendant la partie). Astuce : un texte français lu avec une voix étrangère, ça marche aussi. {!hasVoice(sp.lang) && '⚠ Cette voix n’est pas installée sur cet appareil : une voix par défaut sera utilisée.'}</div>
    </div>
  );
}

function MediaEditor({ q, setQ }: { q: Question; setQ: SetQ }) {
  const [url, setUrl] = useState('');
  const [crop, setCrop] = useState(false);
  const set = (m?: Media) => setQ((x) => ({ ...x, media: m }));
  const upload = async () => {
    const f = await pickFile('image/*');
    if (!f) return;
    set({ kind: 'image', src: await fileToDataUrl(f) });
  };
  const fromUrl = () => {
    const u = url.trim();
    if (!u) return;
    const isVideo = /youtu\.?be|\.mp4|\.webm/i.test(u);
    set({ kind: isVideo ? 'video' : 'image', src: u });
    setUrl('');
  };
  if (q.type === 'pin') return <PinEditor q={q} setQ={setQ} upload={upload} />;
  return (
    <div className="ed-media" onPaste={async (e) => {
      const f = [...e.clipboardData.files].find((x) => x.type.startsWith('image/'));
      if (f) set({ kind: 'image', src: await fileToDataUrl(f) });
    }}>
      {q.media ? (
        <div className="col" style={{ alignItems: 'center' }}>
          <MediaView media={{ ...q.media, audioOnly: false }} className="" autoplay={false} />
          {q.media.kind === 'video' && <VideoOptions media={q.media} set={set} />}
          <div className="row" style={{ justifyContent: 'center' }}>
            {q.media.kind === 'image' && <button className="btn btn-sm" onClick={() => setCrop(true)}>✂ Recadrer</button>}
            <button className="btn btn-sm" onClick={() => set(undefined)}>Retirer le média</button>
          </div>
          {crop && q.media.kind === 'image' && <CropModal src={q.media.src} onClose={() => setCrop(false)} onDone={(src) => { set({ kind: 'image', src }); setCrop(false); }} />}
        </div>
      ) : (
        <div className="col" style={{ alignItems: 'center' }}>
          <div className="muted">Image ou vidéo (facultatif)</div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={upload}>🖼 Choisir une image</button>
            <input className="input" style={{ width: 280 }} placeholder="…ou coller un lien (image, YouTube)" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fromUrl()} />
            <button className="btn" onClick={fromUrl} disabled={!url.trim()}>OK</button>
          </div>
          <div className="small muted">Astuce : tu peux aussi coller une image (Ctrl+V) ici.</div>
        </div>
      )}
    </div>
  );
}

/** « 1:23 » ou « 83 » -> 83 secondes */
const parseTime = (v: string): number | undefined => {
  const t = v.trim();
  if (!t) return undefined;
  const parts = t.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return undefined;
  return parts.reduce((a, n) => a * 60 + n, 0);
};
const fmtTime = (n?: number) => (n === undefined ? '' : `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`);

function TimeInput({ value, onChange, placeholder }: { value?: number; onChange: (v?: number) => void; placeholder: string }) {
  const [txt, setTxt] = useState(fmtTime(value));
  useEffect(() => { setTxt(fmtTime(value)); }, [value]);
  return <input className="input" style={{ width: 110 }} placeholder={placeholder} value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={() => onChange(parseTime(txt))} onKeyDown={(e) => { if (e.key === 'Enter') onChange(parseTime(txt)); }} />;
}

/** Options d'une vidéo : son seulement (blind test), dévoilement, extrait (début / fin). */
function VideoOptions({ media, set }: { media: Media; set: (m?: Media) => void }) {
  const upd = (p: Partial<Media>) => set({ ...media, ...p });
  return (
    <div className="card col" style={{ width: '100%', textAlign: 'left', gap: 8 }}>
      <label className="check"><input type="checkbox" checked={!!media.audioOnly} onChange={(e) => upd({ audioOnly: e.target.checked, revealVideo: e.target.checked ? media.revealVideo ?? true : media.revealVideo })} /> <b>🎧 Son seulement</b> : la vidéo est cachée, on n’entend que le son (blind test)</label>
      {media.audioOnly && <label className="check"><input type="checkbox" checked={media.revealVideo !== false} onChange={(e) => upd({ revealVideo: e.target.checked })} /> Montrer la vidéo au moment de la réponse</label>}
      <div className="row">
        <span className="small">Extrait : de</span>
        <TimeInput value={media.start} onChange={(v) => upd({ start: v })} placeholder="0:00" />
        <span className="small">à</span>
        <TimeInput value={media.end} onChange={(v) => upd({ end: v })} placeholder="fin" />
        <span className="small muted">(minutes:secondes)</span>
      </div>
      {media.audioOnly && <div className="small muted">💡 Blind test : choisis le type « Buzzer (oral) » (le son se coupe dès que quelqu’un buzze et reprend si sa réponse est fausse), ou « Réponse à taper » / « Quiz » pour que tout le monde réponde sur son téléphone. Pendant la partie, tu as aussi les boutons ⏸ Son, ↺ Rejouer l’extrait et 👁 Montrer la vidéo.</div>}
    </div>
  );
}

type ZoneTool = 'circle' | 'rect' | 'poly' | 'free';
const ZONE_TOOLS: { id: ZoneTool; label: string; help: string }[] = [
  { id: 'circle', label: '⭕ Cercle', help: 'Clique au centre (ou glisse pour choisir la taille).' },
  { id: 'rect', label: '▭ Rectangle', help: 'Glisse d’un coin à l’autre.' },
  { id: 'poly', label: '📐 Point par point', help: 'Clique chaque sommet, segment par segment ; reclique sur le 1er point (ou « Fermer la forme ») pour terminer.' },
  { id: 'free', label: '✏️ À main levée', help: 'Dessine le contour sans lâcher : la forme se ferme toute seule.' },
];
const ZONE_NAMES: Record<string, string> = { circle: 'Cercle', rect: 'Rectangle', poly: 'Forme libre' };

function PinEditor({ q, setQ, upload }: { q: Question; setQ: SetQ; upload: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const zones = zonesOf(q);
  const [tool, setTool] = useState<ZoneTool>('circle');
  const [sel, setSel] = useState(zones.length - 1);
  const [draft, setDraft] = useState<[number, number][]>([]);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [ar, setAr] = useState(zones.find((z) => z.ar)?.ar ?? 1);
  const [crop, setCrop] = useState(false);
  const applyCrop = (src: string, c: CropRect) => {
    const r4 = (n: number) => Math.round(n * 10000) / 10000;
    const nar = (ar * c.h) / c.w;
    setQ((x) => ({
      ...x,
      media: { kind: 'image', src },
      zone: undefined,
      zones: zonesOf(x).map((z) => {
        const shape = z.shape ?? 'circle';
        if (shape === 'poly') return { ...z, ar: nar, pts: (z.pts ?? []).map((p) => cropPoint(p, c).map(r4) as [number, number]) };
        const [cx, cy] = cropPoint([z.x, z.y], c);
        if (shape === 'rect') return { ...z, ar: nar, x: r4(cx), y: r4(cy), w: r4((z.w ?? 0) / c.w), h: r4((z.h ?? 0) / c.h) };
        return { ...z, ar: nar, x: r4(cx), y: r4(cy), r: r4(z.r / c.w) };
      }),
    }));
    setAr(nar);
    setCrop(false);
  };
  const setZones = (fn: (zs: Zone[]) => Zone[]) => setQ((x) => ({ ...x, zone: undefined, zones: fn(zonesOf(x)) }));
  const rel = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };
  const add = (z: Zone) => { setZones((zs) => [...zs, z]); setSel(zones.length); };
  const replaceLast = (z: Zone) => setZones((zs) => [...zs.slice(0, -1), z]);
  const closePoly = (pts: [number, number][]) => {
    if (pts.length >= 3 && polyArea(pts) > 0.0003) add({ shape: 'poly', x: 0, y: 0, r: 0, pts: pts.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)] as [number, number]), ar });
    setDraft([]);
  };

  const down = (e: React.PointerEvent) => {
    const [x, y] = rel(e);
    if (tool === 'poly') {
      if (draft.length >= 3 && Math.hypot(x - draft[0][0], (y - draft[0][1]) * ar) < 0.03) closePoly(draft);
      else setDraft((d) => [...d, [x, y]]);
      return;
    }
    ref.current!.setPointerCapture(e.pointerId);
    drag.current = { x, y, moved: false };
    if (tool === 'free') setDraft([[x, y]]);
    if (tool === 'circle') add({ shape: 'circle', x, y, r: 0.06, ar });
    if (tool === 'rect') add({ shape: 'rect', x, y, r: 0, w: 0, h: 0, ar });
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = rel(e);
    if (Math.hypot(x - d.x, y - d.y) > 0.01) d.moved = true;
    if (tool === 'free') setDraft((p) => [...p, [x, y]]);
    if (tool === 'circle' && d.moved) replaceLast({ shape: 'circle', x: d.x, y: d.y, r: Math.max(0.01, Math.hypot(x - d.x, (y - d.y) * ar)), ar });
    if (tool === 'rect') replaceLast({ shape: 'rect', x: (x + d.x) / 2, y: (y + d.y) / 2, r: 0, w: Math.abs(x - d.x), h: Math.abs(y - d.y), ar });
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (tool === 'free') closePoly(simplify(draft));
    if (tool === 'rect' && !d.moved) replaceLast({ shape: 'rect', x: d.x, y: d.y, r: 0, w: 0.15, h: 0.15 / ar, ar });
  };

  if (!q.media || q.media.kind !== 'image') {
    return <div className="ed-media"><div className="col" style={{ alignItems: 'center' }}><div>Ajoute l’image sur laquelle les joueurs devront placer leur point.</div><button className="btn btn-primary" onClick={upload}>🖼 Choisir une image</button></div></div>;
  }
  const cur = zones[sel];
  return (
    <div className="col">
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {ZONE_TOOLS.map((t) => (
          <button key={t.id} className={`btn btn-sm ${tool === t.id ? 'btn-primary' : ''}`} onClick={() => { setTool(t.id); setDraft([]); }}>{t.label}</button>
        ))}
      </div>
      <div className="small muted">{ZONE_TOOLS.find((t) => t.id === tool)!.help} Tu peux tracer plusieurs zones : un point dans n’importe laquelle compte juste.</div>
      <div className="pin-img" ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ maxWidth: 700, alignSelf: 'center', cursor: 'crosshair' }}>
        <img src={q.media.src} alt="" draggable={false}
          onLoad={(e) => {
            const im = e.currentTarget; const a = im.naturalHeight / im.naturalWidth;
            if (!a) return;
            setAr(a);
            if (zones.some((z) => Math.abs((z.ar ?? 0) - a) > 0.01)) setZones((zs) => zs.map((z) => ({ ...z, ar: a })));
          }} />
        <ZoneShapes zones={zones} ar={ar} selected={sel} draft={draft} />
      </div>
      {tool === 'poly' && draft.length > 0 && (
        <div className="row">
          <span className="small muted">{draft.length} point{draft.length > 1 ? 's' : ''}</span>
          <button className="btn btn-sm" onClick={() => setDraft((d) => d.slice(0, -1))}>↶ Annuler le dernier point</button>
          <button className="btn btn-sm btn-primary" disabled={draft.length < 3} onClick={() => closePoly(draft)}>✓ Fermer la forme</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setDraft([])}>Abandonner</button>
        </div>
      )}
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {zones.map((z, i) => (
          <span key={i} className={`chip ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)} role="button" style={{ cursor: 'pointer' }}>
            Zone {i + 1} · {ZONE_NAMES[z.shape ?? 'circle']}
            <button className="btn btn-sm btn-ghost" title="Supprimer cette zone" onClick={(e) => { e.stopPropagation(); setZones((zs) => zs.filter((_, k) => k !== i)); setSel(-1); }}>✕</button>
          </span>
        ))}
        {zones.length === 0 && <span className="small muted">Aucune zone : trace la bonne réponse sur l’image.</span>}
      </div>
      <div className="row">
        {cur && (cur.shape ?? 'circle') === 'circle' && (
          <label className="field grow">Taille du cercle {sel + 1}
            <input type="range" min={0.01} max={0.5} step={0.005} value={cur.r} onChange={(e) => { const r = Number(e.target.value); setZones((zs) => zs.map((z, k) => (k === sel ? { ...z, r } : z))); }} />
          </label>
        )}
        <span className="spacer" />
        {zones.length > 1 && <button className="btn btn-sm btn-ghost" onClick={() => { setZones(() => []); setSel(-1); }}>Tout effacer</button>}
        <button className="btn btn-sm" onClick={() => setCrop(true)}>✂ Recadrer</button>
        <button className="btn btn-sm" onClick={upload}>Changer l’image</button>
        {crop && <CropModal src={q.media.src} onClose={() => setCrop(false)} onDone={applyCrop} />}
      </div>
    </div>
  );
}

// ---------- éditeurs spécifiques ----------
function TypeEditor({ q, setQ }: { q: Question; setQ: SetQ }) {
  switch (q.type) {
    case 'choice': case 'poll': return <ChoiceEditor q={q} setQ={setQ} />;
    case 'truefalse':
      return (
        <div className="ed-ans">
          {[true, false].map((v) => (
            <button key={String(v)} className={`ans ${q.correctBool === v ? 'sel' : 'dim'}`} style={{ ...tile(v ? 1 : 0), justifyContent: 'center', cursor: 'pointer', fontSize: '1.3em' }} onClick={() => setQ((x) => ({ ...x, correctBool: v }))}>
              {v ? '✔ Vrai' : '✘ Faux'} {q.correctBool === v && ' — bonne réponse'}
            </button>
          ))}
        </div>
      );
    case 'type':
      return <StringList label="Réponses acceptées (toutes comptent comme justes)" values={q.accepted ?? ['']} onChange={(v) => setQ((x) => ({ ...x, accepted: v }))} placeholder="Réponse" max={10} />;
    case 'order': case 'ranking': case 'points100':
      return <ItemList q={q} setQ={setQ} label={q.type === 'order' ? 'Éléments, dans le BON ordre (ils seront mélangés pour les joueurs)' : 'Éléments'} />;
    case 'slider': {
      const s = q.slider!;
      const set = (k: keyof typeof s, v: string) => setQ((x) => ({ ...x, slider: { ...s, [k]: k === 'unit' ? v : Number(v) } }));
      return (
        <div className="card row">
          {([['min', 'Minimum'], ['max', 'Maximum'], ['step', 'Pas'], ['correct', 'Bonne réponse'], ['margin', 'Marge acceptée (±)']] as const).map(([k, l]) => (
            <label key={k} className="field" style={{ width: 130 }}>{l}<input className="input" type="number" value={s[k]} step="any" onChange={(e) => set(k, e.target.value)} /></label>
          ))}
          <label className="field" style={{ width: 110 }}>Unité<input className="input" value={s.unit ?? ''} placeholder="km, €…" onChange={(e) => set('unit', e.target.value)} /></label>
          <div className="small muted">Dans la marge : tous les points. Au-delà, les points diminuent avec l’écart (0 point à un quart de l’échelle).</div>
        </div>
      );
    }
    case 'pin': return null;
    case 'match': {
      const pairs = q.pairs ?? [];
      const set = (v: typeof pairs) => setQ((x) => ({ ...x, pairs: v }));
      return (
        <div className="card col">
          <div className="small muted">Paires correctes (la colonne de droite sera mélangée)</div>
          <Sortable items={pairs} onChange={set} withHandle className="col" render={(p, i, h) => (
            <div className="ed-line">
              <Grip {...h} />
              <span className="chip" style={{ background: answerColor(i), color: '#fff' }}>{i + 1}</span>
              <input className="input" value={p.left} placeholder="Gauche" onChange={(e) => set(pairs.map((x) => (x.id === p.id ? { ...x, left: e.target.value } : x)))} />
              ⟷
              <input className="input" value={p.right} placeholder="Droite" onChange={(e) => set(pairs.map((x) => (x.id === p.id ? { ...x, right: e.target.value } : x)))} />
              <button className="btn btn-sm icon-btn" onClick={() => set(pairs.filter((x) => x.id !== p.id))}>✕</button>
            </div>
          )} />
          {pairs.length < 8 && <button className="btn btn-sm" onClick={() => set([...pairs, { id: uid(5), left: '', right: '' }])}>+ Paire</button>}
        </div>
      );
    }
    case 'categorize': {
      const cats = q.categories ?? [];
      const items = q.catItems ?? [];
      return (
        <div className="card col">
          <div className="small muted">Catégories</div>
          <Sortable items={cats} onChange={(v) => setQ((x) => ({ ...x, categories: v }))} withHandle className="col" render={(c, i, h) => (
            <div className="ed-line">
              <Grip {...h} />
              <span className="chip" style={{ background: answerColor(i), color: '#fff' }}>{i + 1}</span>
              <input className="input" value={c.name} placeholder="Nom de la catégorie" onChange={(e) => setQ((x) => ({ ...x, categories: cats.map((y) => (y.id === c.id ? { ...y, name: e.target.value } : y)) }))} />
              <button className="btn btn-sm icon-btn" disabled={cats.length <= 2} onClick={() => setQ((x) => ({ ...x, categories: cats.filter((y) => y.id !== c.id) }))}>✕</button>
            </div>
          )} />
          {cats.length < 5 && <button className="btn btn-sm" onClick={() => setQ((x) => ({ ...x, categories: [...cats, { id: uid(5), name: '' }] }))}>+ Catégorie</button>}
          <div className="small muted" style={{ marginTop: 8 }}>Éléments à classer</div>
          <Sortable items={items} onChange={(v) => setQ((x) => ({ ...x, catItems: v }))} withHandle className="col" render={(it, _i, h) => (
            <div className="ed-line">
              <Grip {...h} />
              <input className="input" value={it.text} placeholder="Élément" onChange={(e) => setQ((x) => ({ ...x, catItems: items.map((y) => (y.id === it.id ? { ...y, text: e.target.value } : y)) }))} />
              <select className="select" style={{ width: 180 }} value={it.cat} onChange={(e) => setQ((x) => ({ ...x, catItems: items.map((y) => (y.id === it.id ? { ...y, cat: e.target.value } : y)) }))}>
                {cats.map((c, i) => <option key={c.id} value={c.id}>{c.name || `Catégorie ${i + 1}`}</option>)}
              </select>
              <button className="btn btn-sm icon-btn" onClick={() => setQ((x) => ({ ...x, catItems: items.filter((y) => y.id !== it.id) }))}>✕</button>
            </div>
          )} />
          {items.length < 12 && <button className="btn btn-sm" onClick={() => setQ((x) => ({ ...x, catItems: [...items, { id: uid(5), text: '', cat: cats[0]?.id ?? '' }] }))}>+ Élément</button>}
        </div>
      );
    }
    case 'blanks': {
      const { blanks } = parseBlanks(q.blankText ?? '');
      return (
        <div className="card col">
          <label className="field">Texte : mets les mots à trouver entre [crochets]. Variantes acceptées : [Rome|Roma]
            <textarea className="textarea" value={q.blankText ?? ''} placeholder="La capitale de l’Italie est [Rome] et celle de l’Espagne est [Madrid]." onChange={(e) => setQ((x) => ({ ...x, blankText: e.target.value }))} />
          </label>
          <div className="small muted">{blanks.length} trou{blanks.length > 1 ? 's' : ''} : {blanks.map((b) => b[0]).join(', ') || '—'}</div>
          <label className="field">Les joueurs…
            <select className="select" value={q.blankMode ?? 'type'} onChange={(e) => setQ((x) => ({ ...x, blankMode: e.target.value as 'type' | 'choice' }))}>
              <option value="type">écrivent les mots</option>
              <option value="choice">choisissent dans une liste</option>
            </select>
          </label>
          {q.blankMode === 'choice' && <StringList label="Mauvaises propositions ajoutées à la liste (pièges)" values={q.distractors?.length ? q.distractors : ['']} onChange={(v) => setQ((x) => ({ ...x, distractors: v }))} placeholder="Piège" max={10} />}
        </div>
      );
    }
    case 'buzzer':
      return (
        <div className="card col">
          <div className="small muted">Les joueurs buzzent sur leur téléphone. Le premier répond à voix haute, tu cliques sur ✔ ou ✘. En cas d’erreur, le suivant dans la file peut répondre.</div>
          <label className="field">Réponse attendue (pour toi, cachée par défaut)<input className="input" value={q.buzzAnswer ?? ''} onChange={(e) => setQ((x) => ({ ...x, buzzAnswer: e.target.value }))} /></label>
        </div>
      );
    case 'scale':
      return (
        <div className="card col">
          <StringList label="Affirmations à noter" values={q.statements ?? ['']} onChange={(v) => setQ((x) => ({ ...x, statements: v }))} placeholder="Affirmation" max={6} />
          <div className="row">
            <label className="field" style={{ width: 120 }}>Échelle de 1 à
              <select className="select" value={q.scaleMax ?? 5} onChange={(e) => setQ((x) => ({ ...x, scaleMax: Number(e.target.value) }))}>{[3, 4, 5, 7, 10].map((v) => <option key={v}>{v}</option>)}</select>
            </label>
            <label className="field grow">Étiquette du minimum<input className="input" value={q.minLabel ?? ''} onChange={(e) => setQ((x) => ({ ...x, minLabel: e.target.value }))} /></label>
            <label className="field grow">Étiquette du maximum<input className="input" value={q.maxLabel ?? ''} onChange={(e) => setQ((x) => ({ ...x, maxLabel: e.target.value }))} /></label>
          </div>
        </div>
      );
    case 'wordcloud':
      return (
        <div className="card row">
          <label className="field" style={{ width: 220 }}>Mots par joueur
            <select className="select" value={q.maxWords ?? 1} onChange={(e) => setQ((x) => ({ ...x, maxWords: Number(e.target.value) }))}>{[1, 2, 3].map((v) => <option key={v}>{v}</option>)}</select>
          </label>
        </div>
      );
    case 'brainstorm':
      return (
        <div className="card row">
          <label className="field" style={{ width: 200 }}>Idées par joueur
            <select className="select" value={q.maxWords ?? 3} onChange={(e) => setQ((x) => ({ ...x, maxWords: Number(e.target.value) }))}>{[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="field" style={{ width: 200 }}>Votes par joueur
            <select className="select" value={q.votes ?? 3} onChange={(e) => setQ((x) => ({ ...x, votes: Number(e.target.value) }))}>{[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <div className="small muted">1) chacun propose ses idées 2) tout le monde vote 3) classement des idées.</div>
        </div>
      );
    case 'slide':
      return <textarea className="textarea" style={{ minHeight: 160, fontSize: '1.1em' }} placeholder="Texte de la diapositive (facultatif)" value={q.body ?? ''} onChange={(e) => setQ((x) => ({ ...x, body: e.target.value }))} />;
    case 'open': return <div className="card small muted">Les joueurs écrivent une réponse libre (280 caractères). Elles s’affichent en mur de post-it ; tu peux masquer celles qui ne conviennent pas.</div>;
    case 'draw': return <div className="card small muted">Chaque joueur dessine sur son téléphone. Les dessins s’affichent en galerie sur le grand écran.</div>;
  }
}

function ChoiceEditor({ q, setQ }: { q: Question; setQ: SetQ }) {
  const answers = q.answers ?? [];
  const [cropId, setCropId] = useState<string | null>(null);
  const cropA = answers.find((a) => a.id === cropId);
  const set = (v: typeof answers) => setQ((x) => ({ ...x, answers: v }));
  const toggleCorrect = (id: string) => set(answers.map((a) => (a.id === id ? { ...a, correct: !a.correct } : q.multi ? a : { ...a, correct: false })));
  return (
    <>
      <Sortable items={answers} onChange={set} withHandle className="ed-ans" render={(a, i, h) => (
          <div className="ans" style={{ ...tile(i), flexDirection: 'column', alignItems: 'stretch', gap: 8, height: '100%' }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <Grip {...h} title="Glisser pour changer la place de cette réponse" />
              <TileLabel i={i} />
              <input type="text" value={a.text} placeholder={`Réponse ${i + 1}${i >= 2 ? ' (facultatif)' : ''}`} onChange={(e) => set(answers.map((x) => (x.id === a.id ? { ...x, text: e.target.value } : x)))} />
            </div>
            {a.image && <img src={a.image} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'contain' }} />}
            <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
              {q.type === 'choice' && (
                <button className="btn btn-sm" title="Bonne réponse ?" onClick={() => toggleCorrect(a.id)} style={{ background: a.correct ? '#fff' : 'rgba(255,255,255,.22)', color: a.correct ? '#20b486' : '#fff', border: 'none', marginRight: 'auto' }}>{a.correct ? '✔ Bonne réponse' : 'Fausse'}</button>
              )}
              <button className="btn btn-sm" title="Image pour cette réponse" style={{ background: 'rgba(255,255,255,.22)', border: 'none', color: '#fff' }} onClick={async () => {
                if (a.image) return set(answers.map((x) => (x.id === a.id ? { ...x, image: undefined } : x)));
                const f = await pickFile('image/*');
                if (f) { const src = await fileToDataUrl(f, 600); set(answers.map((x) => (x.id === a.id ? { ...x, image: src } : x))); }
              }}>{a.image ? 'Retirer l’image' : '🖼 Image'}</button>
              {a.image && <button className="btn btn-sm" title="Recadrer l’image" style={{ background: 'rgba(255,255,255,.22)', border: 'none', color: '#fff' }} onClick={() => setCropId(a.id)}>✂</button>}
              {answers.length > 2 && <button className="btn btn-sm icon-btn" title="Supprimer cette réponse" style={{ background: 'rgba(255,255,255,.22)', border: 'none', color: '#fff' }} onClick={() => set(answers.filter((x) => x.id !== a.id))}>✕</button>}
            </div>
          </div>
      )} />
      {answers.length < 6 && <button className="btn" onClick={() => set([...answers, { id: uid(5), text: '', correct: false }])}>+ Réponse</button>}
      {cropA?.image && <CropModal src={cropA.image} onClose={() => setCropId(null)} onDone={async (src) => { const small = await shrinkDataUrl(src, 400_000); set(answers.map((x) => (x.id === cropA.id ? { ...x, image: small } : x))); setCropId(null); }} />}
    </>
  );
}

function StringList({ label, values, onChange, placeholder, max }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; max: number }) {
  // identifiants stables (le texte peut être vide ou en double) pour le glisser-déposer
  const ids = useRef<string[]>([]);
  while (ids.current.length < values.length) ids.current.push(uid(6));
  ids.current.length = values.length;
  const rows = values.map((text, i) => ({ id: ids.current[i], text }));
  const setRows = (r: { id: string; text: string }[]) => { ids.current = r.map((x) => x.id); onChange(r.map((x) => x.text)); };
  return (
    <div className="col">
      <div className="small muted">{label}</div>
      <Sortable items={rows} onChange={setRows} withHandle className="col" render={(row, i, h) => (
        <div className="ed-line">
          {values.length > 1 && <Grip {...h} />}
          <input className="input" value={row.text} placeholder={`${placeholder} ${i + 1}`} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          {values.length > 1 && <button className="btn btn-sm icon-btn" onClick={() => { ids.current.splice(i, 1); onChange(values.filter((_, j) => j !== i)); }}>✕</button>}
        </div>
      )} />
      {values.length < max && <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...values, ''])}>+ Ajouter</button>}
    </div>
  );
}

function ItemList({ q, setQ, label }: { q: Question; setQ: SetQ; label: string }) {
  const items = q.items ?? [];
  const set = (v: typeof items) => setQ((x) => ({ ...x, items: v }));
  return (
    <div className="card col">
      <div className="small muted">{label} — glisse ⠿ pour changer l’ordre</div>
      <Sortable items={items} onChange={set} withHandle className="col" render={(it, i, h) => (
        <div className="ed-line">
          <Grip {...h} />
          <span className="chip" style={{ background: answerColor(i), color: '#fff' }}>{i + 1}</span>
          <input className="input" value={it.text} placeholder={`Élément ${i + 1}`} onChange={(e) => set(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))} />
          <button className="btn btn-sm icon-btn" onClick={() => set(items.filter((x) => x.id !== it.id))} disabled={items.length <= 2}>✕</button>
        </div>
      )} />
      {items.length < 8 && <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set([...items, { id: uid(5), text: '' }])}>+ Élément</button>}
    </div>
  );
}

function SidePanel({ q, setQ, onAll }: { q: Question; setQ: SetQ; onAll: (l?: QuestionLook) => void }) {
  const info = QT[q.type];
  return (
    <div className="ed-side">
      <div className="small muted" style={{ fontWeight: 700 }}>Type de question</div>
      <select className="select" value={q.type} onChange={(e) => setQ((x) => changeType(x, e.target.value as QType))}>
        {(['quiz', 'avis', 'contenu'] as const).map((g) => (
          <optgroup key={g} label={g === 'quiz' ? 'Questions notées' : g === 'avis' ? 'Avis (sans points)' : 'Contenu'}>
            {QTYPES.filter((t) => t.group === g).map((t) => <option key={t.type} value={t.type}>{t.icon} {t.label}</option>)}
          </optgroup>
        ))}
      </select>
      <div className="small muted">{info.help}</div>

      <label className="field">Temps limite
        <select className="select" value={q.time} onChange={(e) => setQ((x) => ({ ...x, time: Number(e.target.value) }))}>
          {[0, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240].map((t) => <option key={t} value={t}>{t === 0 ? 'Pas de limite' : t < 60 ? `${t} secondes` : `${t / 60} min`}</option>)}
        </select>
      </label>
      {info.scored && (
        <label className="field">Points
          <select className="select" value={q.points} onChange={(e) => setQ((x) => ({ ...x, points: Number(e.target.value) as 0 | 1 | 2 }))}>
            <option value={1}>Normaux (1000 max)</option>
            <option value={2}>Doublés (2000 max)</option>
            <option value={0}>Sans points (pour le plaisir)</option>
          </select>
        </label>
      )}
      {(q.type === 'choice' || q.type === 'poll') && (
        <label className="check"><input type="checkbox" checked={!!q.multi} onChange={(e) => setQ((x) => ({ ...x, multi: e.target.checked, answers: e.target.checked || x.type === 'poll' ? x.answers : x.answers?.map((a, i) => ({ ...a, correct: i === x.answers!.findIndex((y) => y.correct) })) }))} /> Plusieurs réponses possibles</label>
      )}
      {['choice', 'order', 'match', 'categorize', 'blanks'].includes(q.type) && (q.type !== 'choice' || q.multi) && (
        <label className="check"><input type="checkbox" checked={!!q.partial} onChange={(e) => setQ((x) => ({ ...x, partial: e.target.checked }))} /> Points partiels si en partie juste</label>
      )}
      {q.type === 'type' && (
        <label className="check"><input type="checkbox" checked={q.fuzzy !== false} onChange={(e) => setQ((x) => ({ ...x, fuzzy: e.target.checked }))} /> Tolérer les petites fautes de frappe</label>
      )}
      {info.group !== 'contenu' && (
        <label className="field">Explication après la réponse (facultatif)
          <textarea className="textarea" value={q.note ?? ''} onChange={(e) => setQ((x) => ({ ...x, note: e.target.value || undefined }))} />
        </label>
      )}
      <QuestionLookEditor q={q} setQ={setQ} onAll={onAll} />
    </div>
  );
}

/** Apparence propre à une question : fond, couleur du texte, mise en page, taille du titre, transition, décor. */
function QuestionLookEditor({ q, setQ, onAll }: { q: Question; setQ: SetQ; onAll: (l?: QuestionLook) => void }) {
  const l: QuestionLook = qlookOf(q) ?? {};
  const set = (p: Partial<QuestionLook>) => setQ((x) => ({ ...x, bg: undefined, look: { ...l, ...p } }));
  const mode = l.bgMode ?? 'quiz';
  return (
    <div className="look-box">
      <div className="small muted" style={{ fontWeight: 700 }}>🎨 Apparence de cette question</div>
      <label className="field">Fond
        <select className="select" value={mode} onChange={(e) => set({ bgMode: e.target.value as QuestionLook['bgMode'] })}>
          <option value="quiz">Comme le reste du quiz</option>
          <option value="color">Couleur unie</option>
          <option value="gradient">Dégradé</option>
          <option value="image">Image</option>
        </select>
      </label>
      {(mode === 'color' || mode === 'gradient') && <ColorField label={mode === 'gradient' ? 'Couleur 1' : 'Couleur'} value={l.bg} fallback="#3d8bfd" onChange={(v) => set({ bg: v })} />}
      {mode === 'gradient' && <ColorField label="Couleur 2" value={l.bg2} fallback="#8b5cf6" onChange={(v) => set({ bg2: v })} />}
      {mode === 'gradient' && <label className="field">Direction <input type="range" min={0} max={360} step={5} value={l.gradAngle ?? 135} onChange={(e) => set({ gradAngle: Number(e.target.value) })} /></label>}
      {mode === 'image' && (
        <>
          <div className="row">
            <button className="btn btn-sm" onClick={async () => { const f = await pickFile('image/*'); if (f) set({ bgImage: await fileToDataUrl(f, 1920) }); }}>🖼 Image de fond</button>
            {l.bgImage && <img src={l.bgImage} alt="" style={{ height: 34, borderRadius: 6 }} />}
          </div>
          <label className="field">Voile sombre <input type="range" min={0} max={0.85} step={0.05} value={l.overlay ?? 0.3} onChange={(e) => set({ overlay: Number(e.target.value) })} /></label>
        </>
      )}
      <ColorField label="Couleur du texte" value={l.fg} fallback="#ffffff" onChange={(v) => set({ fg: v })} />
      <label className="field">Mise en page (grand écran)
        <select className="select" value={l.layout ?? 'auto'} onChange={(e) => set({ layout: e.target.value as QuestionLook['layout'] })}>
          <option value="auto">Image au-dessus des réponses</option>
          <option value="media-left">Image à gauche</option>
          <option value="media-right">Image à droite</option>
          <option value="media-big">Grande image</option>
          <option value="text-only">Sans image (texte seul)</option>
        </select>
      </label>
      <label className="field">Taille du titre <b style={{ color: 'var(--fg)' }}>{Math.round((l.titleScale ?? 1) * 100)} %</b>
        <input type="range" min={0.6} max={1.8} step={0.05} value={l.titleScale ?? 1} onChange={(e) => set({ titleScale: Number(e.target.value) })} />
      </label>
      <label className="field">Transition d’arrivée
        <select className="select" value={l.transition ?? 'quiz'} onChange={(e) => set({ transition: e.target.value as TransitionId | 'quiz' })}>
          <option value="quiz">Comme le reste du quiz</option>
          {TRANSITIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      <label className="field">Décor animé
        <select className="select" value={l.deco ?? 'quiz'} onChange={(e) => set({ deco: e.target.value as DecoId | 'quiz' })}>
          <option value="quiz">Comme le reste du quiz</option>
          {DECOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      {l.deco === 'emoji' && <input className="input" placeholder="Emojis : 🎉⚽" value={l.decoEmoji ?? ''} onChange={(e) => set({ decoEmoji: e.target.value })} />}
      <div className="row">
        {Object.keys(l).length > 0 && <button className="btn btn-sm" onClick={() => setQ((x) => ({ ...x, look: undefined, bg: undefined }))}>↺ Réinitialiser</button>}
        <button className="btn btn-sm" onClick={() => onAll(qlookOf(q))}>Appliquer à toutes</button>
      </div>
    </div>
  );
}
