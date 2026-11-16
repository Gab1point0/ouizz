// Éditeur de quiz : liste des questions à gauche, question au centre, réglages à droite.
import { useEffect, useRef, useState } from 'react';
import { answerColor, go, MediaView, Modal } from '../components/common';
import { fileToDataUrl } from '../image';
import { changeType, newQuestion, QT, QTYPES, questionProblems } from '../qtypes';
import { getQuiz, saveQuiz } from '../storage';
import { THEMES, themeStyle } from '../themes';
import type { Media, QType, Question, Quiz } from '../types';
import { LETTERS, parseBlanks, pickFile, uid } from '../util';

export function EditorPage({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [sel, setSel] = useState(0);
  const [saved, setSaved] = useState(true);
  const [adding, setAdding] = useState(false);
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

  return (
    <div className="app" style={themeStyle(quiz.theme)}>
      <div className="toolbar">
        <button className="btn btn-ghost" onClick={async () => { clearTimeout(timer.current); await saveQuiz(quiz); go('/host'); }}>← Mes quiz</button>
        <input className="input" style={{ maxWidth: 420, fontWeight: 700 }} placeholder="Titre du quiz" value={quiz.title} onChange={(e) => update((z) => ({ ...z, title: e.target.value }))} />
        <select className="select" style={{ width: 160 }} value={quiz.theme} onChange={(e) => update((z) => ({ ...z, theme: e.target.value }))} title="Thème">
          {THEMES.map((t) => <option key={t.id} value={t.id}>🎨 {t.name}</option>)}
        </select>
        <span className="spacer" />
        <span className="small muted">{saved ? '✓ Enregistré' : 'Enregistrement…'}</span>
        <button className="btn btn-primary" disabled={!quiz.questions.length} onClick={async () => { clearTimeout(timer.current); await saveQuiz(quiz); go(`/run/${quiz.id}`); }}>▶ Jouer</button>
      </div>
      <div className="editor">
        <div className="ed-list">
          {quiz.questions.map((x, i) => {
            const pb = questionProblems(x);
            return (
              <div key={x.id} className={`ed-thumb ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)}>
                <span className="n">{i + 1}</span>
                <span style={{ fontSize: '1.3em' }}>{QT[x.type].icon}</span>
                <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {x.title || <i className="muted">{QT[x.type].label}</i>}
                </span>
                {pb.length > 0 && <span className="warn" title={pb.join('\n')}>⚠</span>}
              </div>
            );
          })}
          <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Ajouter</button>
        </div>

        {q ? (
          <>
            <div className="ed-main" style={q.bg ? { background: q.bg } : undefined}>
              <div className="row">
                <span className="chip">{QT[q.type].icon} {QT[q.type].label}</span>
                <span className="spacer" />
                <button className="btn btn-sm icon-btn" onClick={() => move(sel, sel - 1)} disabled={sel === 0} title="Monter">↑</button>
                <button className="btn btn-sm icon-btn" onClick={() => move(sel, sel + 1)} disabled={sel === quiz.questions.length - 1} title="Descendre">↓</button>
                <button className="btn btn-sm" onClick={duplicate}>Dupliquer</button>
                <button className="btn btn-sm btn-danger" onClick={remove}>Supprimer</button>
              </div>
              <textarea className="textarea ed-title" style={{ background: 'var(--card)', minHeight: 60 }} placeholder={q.type === 'slide' ? 'Titre de la diapositive' : 'Écris ta question ici'} value={q.title} onChange={(e) => setQ((x) => ({ ...x, title: e.target.value }))} />
              <MediaEditor q={q} setQ={setQ} />
              <TypeEditor q={q} setQ={setQ} />
              {questionProblems(q).map((p) => <div key={p} className="problems">⚠ {p}</div>)}
            </div>
            <SidePanel q={q} setQ={setQ} />
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
    </div>
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

function MediaEditor({ q, setQ }: { q: Question; setQ: SetQ }) {
  const [url, setUrl] = useState('');
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
          <MediaView media={q.media} className="" />
          <button className="btn btn-sm" onClick={() => set(undefined)}>Retirer le média</button>
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

function PinEditor({ q, setQ, upload }: { q: Question; setQ: SetQ; upload: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const z = q.zone ?? { x: 0.5, y: 0.5, r: 0.1 };
  const place = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    setQ((x) => ({ ...x, zone: { ...z, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, ar: r.height / r.width } }));
  };
  if (!q.media || q.media.kind !== 'image') {
    return <div className="ed-media"><div className="col" style={{ alignItems: 'center' }}><div>Ajoute l’image sur laquelle les joueurs devront placer leur point.</div><button className="btn btn-primary" onClick={upload}>🖼 Choisir une image</button></div></div>;
  }
  return (
    <div className="col">
      <div className="small muted">Clique sur l’image pour placer la bonne zone, puis règle sa taille.</div>
      <div className="pin-img" ref={ref} onClick={place} style={{ maxWidth: 700, alignSelf: 'center', cursor: 'crosshair' }}>
        <img src={q.media.src} alt="" draggable={false}
          onLoad={(e) => { const im = e.currentTarget; const ar = im.naturalHeight / im.naturalWidth; if (ar && Math.abs((q.zone?.ar ?? 0) - ar) > 0.01) setQ((x) => ({ ...x, zone: { ...z, ar } })); }} />
        <span className="pin-zone" style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, width: `${z.r * 200}%`, aspectRatio: '1' }} />
      </div>
      <div className="row">
        <label className="field grow">Taille de la zone
          <input type="range" min={0.02} max={0.4} step={0.01} value={z.r} onChange={(e) => setQ((x) => ({ ...x, zone: { ...z, r: Number(e.target.value) } }))} />
        </label>
        <button className="btn btn-sm" onClick={upload}>Changer l’image</button>
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
            <button key={String(v)} className={`ans ${q.correctBool === v ? 'sel' : 'dim'}`} style={{ background: v ? 'var(--a2)' : 'var(--a1)', justifyContent: 'center', cursor: 'pointer', fontSize: '1.3em' }} onClick={() => setQ((x) => ({ ...x, correctBool: v }))}>
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
          {pairs.map((p, i) => (
            <div key={p.id} className="ed-line">
              <span className="chip" style={{ background: answerColor(i), color: '#fff' }}>{i + 1}</span>
              <input className="input" value={p.left} placeholder="Gauche" onChange={(e) => set(pairs.map((x) => (x.id === p.id ? { ...x, left: e.target.value } : x)))} />
              ⟷
              <input className="input" value={p.right} placeholder="Droite" onChange={(e) => set(pairs.map((x) => (x.id === p.id ? { ...x, right: e.target.value } : x)))} />
              <button className="btn btn-sm icon-btn" onClick={() => set(pairs.filter((x) => x.id !== p.id))}>✕</button>
            </div>
          ))}
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
          {cats.map((c, i) => (
            <div key={c.id} className="ed-line">
              <span className="chip" style={{ background: answerColor(i), color: '#fff' }}>{i + 1}</span>
              <input className="input" value={c.name} placeholder="Nom de la catégorie" onChange={(e) => setQ((x) => ({ ...x, categories: cats.map((y) => (y.id === c.id ? { ...y, name: e.target.value } : y)) }))} />
              <button className="btn btn-sm icon-btn" disabled={cats.length <= 2} onClick={() => setQ((x) => ({ ...x, categories: cats.filter((y) => y.id !== c.id) }))}>✕</button>
            </div>
          ))}
          {cats.length < 5 && <button className="btn btn-sm" onClick={() => setQ((x) => ({ ...x, categories: [...cats, { id: uid(5), name: '' }] }))}>+ Catégorie</button>}
          <div className="small muted" style={{ marginTop: 8 }}>Éléments à classer</div>
          {items.map((it) => (
            <div key={it.id} className="ed-line">
              <input className="input" value={it.text} placeholder="Élément" onChange={(e) => setQ((x) => ({ ...x, catItems: items.map((y) => (y.id === it.id ? { ...y, text: e.target.value } : y)) }))} />
              <select className="select" style={{ width: 180 }} value={it.cat} onChange={(e) => setQ((x) => ({ ...x, catItems: items.map((y) => (y.id === it.id ? { ...y, cat: e.target.value } : y)) }))}>
                {cats.map((c, i) => <option key={c.id} value={c.id}>{c.name || `Catégorie ${i + 1}`}</option>)}
              </select>
              <button className="btn btn-sm icon-btn" onClick={() => setQ((x) => ({ ...x, catItems: items.filter((y) => y.id !== it.id) }))}>✕</button>
            </div>
          ))}
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
  const set = (v: typeof answers) => setQ((x) => ({ ...x, answers: v }));
  const toggleCorrect = (id: string) => set(answers.map((a) => (a.id === id ? { ...a, correct: !a.correct } : q.multi ? a : { ...a, correct: false })));
  return (
    <>
      <div className="ed-ans">
        {answers.map((a, i) => (
          <div key={a.id} className="ans" style={{ background: answerColor(i), flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <span className="letter">{LETTERS[i]}</span>
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
              {answers.length > 2 && <button className="btn btn-sm icon-btn" title="Supprimer cette réponse" style={{ background: 'rgba(255,255,255,.22)', border: 'none', color: '#fff' }} onClick={() => set(answers.filter((x) => x.id !== a.id))}>✕</button>}
            </div>
          </div>
        ))}
      </div>
      {answers.length < 6 && <button className="btn" onClick={() => set([...answers, { id: uid(5), text: '', correct: false }])}>+ Réponse</button>}
    </>
  );
}

function StringList({ label, values, onChange, placeholder, max }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; max: number }) {
  return (
    <div className="col">
      <div className="small muted">{label}</div>
      {values.map((v, i) => (
        <div key={i} className="ed-line">
          <input className="input" value={v} placeholder={`${placeholder} ${i + 1}`} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          {values.length > 1 && <button className="btn btn-sm icon-btn" onClick={() => onChange(values.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      {values.length < max && <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...values, ''])}>+ Ajouter</button>}
    </div>
  );
}

function ItemList({ q, setQ, label }: { q: Question; setQ: SetQ; label: string }) {
  const items = q.items ?? [];
  const set = (v: typeof items) => setQ((x) => ({ ...x, items: v }));
  const move = (i: number, j: number) => { if (j < 0 || j >= items.length) return; const a = items.slice(); [a[i], a[j]] = [a[j], a[i]]; set(a); };
  return (
    <div className="card col">
      <div className="small muted">{label}</div>
      {items.map((it, i) => (
        <div key={it.id} className="ed-line">
          <span className="chip" style={{ background: answerColor(i), color: '#fff' }}>{i + 1}</span>
          <input className="input" value={it.text} placeholder={`Élément ${i + 1}`} onChange={(e) => set(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))} />
          <button className="btn btn-sm icon-btn" onClick={() => move(i, i - 1)} disabled={i === 0}>↑</button>
          <button className="btn btn-sm icon-btn" onClick={() => move(i, i + 1)} disabled={i === items.length - 1}>↓</button>
          <button className="btn btn-sm icon-btn" onClick={() => set(items.filter((x) => x.id !== it.id))} disabled={items.length <= 2}>✕</button>
        </div>
      ))}
      {items.length < 8 && <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set([...items, { id: uid(5), text: '' }])}>+ Élément</button>}
    </div>
  );
}

function SidePanel({ q, setQ }: { q: Question; setQ: SetQ }) {
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
      <label className="field">Fond de cette question
        <div className="row">
          <input type="color" value={q.bg ?? '#888888'} onChange={(e) => setQ((x) => ({ ...x, bg: e.target.value }))} style={{ width: 50, height: 34, border: 'none', background: 'none', opacity: q.bg ? 1 : 0.35 }} title="Choisir une couleur" />
          {q.bg ? <button className="btn btn-sm" onClick={() => setQ((x) => ({ ...x, bg: undefined }))}>Thème par défaut</button> : <span className="small muted">celui du thème</span>}
        </div>
      </label>
    </div>
  );
}
