// Saisie des réponses sur le téléphone, un composant par type de question.
import { Sortable, useDragTo } from './Sortable';
import { Rich } from './Rich';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PubQuestion } from '../net/protocol';
import type { AnswerPayload } from '../types';
import { tile, TileLabel } from '../style';
import { answerColor } from './common';

interface Props {
  q: PubQuestion;
  media: Record<string, string>;
  showText: boolean;
  sub?: 'ideas' | 'vote';
  ideas?: { id: string; text: string }[];
  onSubmit: (a: AnswerPayload) => void;
}

export function AnswerInput(p: Props) {
  switch (p.q.type) {
    case 'choice':
    case 'poll': return <ChoiceInput {...p} />;
    case 'truefalse': return <TrueFalseInput {...p} />;
    case 'type': return <TextInput {...p} placeholder="Ta réponse" max={60} />;
    case 'open': return <TextInput {...p} placeholder="Écris ta réponse…" max={280} multiline />;
    case 'order':
    case 'ranking': return <OrderInput {...p} />;
    case 'slider': return <SliderInput {...p} />;
    case 'pin': return <PinInput {...p} />;
    case 'match': return <MatchInput {...p} />;
    case 'categorize': return <CategorizeInput {...p} />;
    case 'blanks': return <BlanksInput {...p} />;
    case 'wordcloud': return <WordsInput {...p} n={p.q.maxWords ?? 1} max={25} />;
    case 'scale': return <ScaleInput {...p} />;
    case 'points100': return <PointsInput {...p} />;
    case 'draw': return <DrawInput {...p} />;
    case 'brainstorm':
      return p.sub === 'vote' ? <VoteInput {...p} /> : <WordsInput {...p} n={p.q.maxWords ?? 3} max={80} placeholder="Une idée" />;
    default: return null;
  }
}

function Submit({ disabled, onClick, label = 'Valider' }: { disabled?: boolean; onClick: () => void; label?: string }) {
  return <button className="btn btn-primary btn-big" disabled={disabled} onClick={onClick} style={{ width: '100%' }}>{label}</button>;
}

function ChoiceInput({ q, media, showText, onSubmit }: Props) {
  const [sel, setSel] = useState<string[]>([]);
  const answers = q.answers ?? [];
  const hasImg = answers.some((a) => a.imageKey);
  const list = showText && !hasImg && answers.some((a) => a.text.length > 28);
  const click = (id: string) => {
    if (!q.multi) return onSubmit([id]);
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };
  return (
    <>
      {q.multi && <div className="center muted small">Plusieurs réponses possibles</div>}
      <div className={`phone-ans ${list ? 'list' : ''} ${answers.length <= 2 ? 'full' : ''}`}>
        {answers.map((a, i) => (
          <button key={a.id} className={`ans anim-pop d${i + 1} ${sel.includes(a.id) ? 'sel' : ''}`} style={tile(i)} onClick={() => click(a.id)}>
            <TileLabel i={i} />
            {a.imageKey && media[a.imageKey] && <img src={media[a.imageKey]} alt="" />}
            {showText && a.text && <span><Rich text={a.text} /></span>}
          </button>
        ))}
      </div>
      {q.multi && <Submit disabled={!sel.length} onClick={() => onSubmit(sel)} />}
    </>
  );
}

function TrueFalseInput({ onSubmit }: Props) {
  return (
    <div className="phone-ans full">
      <button className="ans anim-pop" style={{ ...tile(1), fontSize: '1.6em' }} onClick={() => onSubmit(true)}>✔ Vrai</button>
      <button className="ans anim-pop d1" style={{ ...tile(0), fontSize: '1.6em' }} onClick={() => onSubmit(false)}>✘ Faux</button>
    </div>
  );
}

function TextInput({ onSubmit, placeholder, max, multiline }: Props & { placeholder: string; max: number; multiline?: boolean }) {
  const [v, setV] = useState('');
  return (
    <form className="col" onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()); }}>
      {multiline
        ? <textarea className="textarea" autoFocus value={v} maxLength={max} placeholder={placeholder} onChange={(e) => setV(e.target.value)} style={{ minHeight: 140, fontSize: '1.2em' }} />
        : <input className="input" autoFocus value={v} maxLength={max} placeholder={placeholder} onChange={(e) => setV(e.target.value)} style={{ fontSize: '1.4em', padding: 16, textAlign: 'center' }} autoComplete="off" autoCapitalize="off" />}
      <Submit disabled={!v.trim()} onClick={() => v.trim() && onSubmit(v.trim())} />
    </form>
  );
}

function WordsInput({ q, onSubmit, n, max, placeholder = 'Un mot' }: Props & { n: number; max: number; placeholder?: string }) {
  const [v, setV] = useState<string[]>(Array(n).fill(''));
  const filled = v.map((x) => x.trim()).filter(Boolean);
  void q;
  return (
    <form className="col" onSubmit={(e) => { e.preventDefault(); if (filled.length) onSubmit(filled); }}>
      {v.map((x, i) => (
        <input key={i} className="input" autoFocus={i === 0} value={x} maxLength={max} placeholder={n > 1 ? `${placeholder} ${i + 1}` : placeholder}
          onChange={(e) => setV((s) => s.map((y, j) => (j === i ? e.target.value : y)))} style={{ fontSize: '1.2em', padding: 14 }} autoComplete="off" />
      ))}
      <Submit disabled={!filled.length} onClick={() => filled.length && onSubmit(filled)} />
    </form>
  );
}

/** Liste réordonnable au doigt : on attrape un élément et on le glisse à sa place. */
export function SortableList({ items, onChange }: { items: { id: string; text: string }[]; onChange: (ids: { id: string; text: string }[]) => void }) {
  return (
    <Sortable items={items} onChange={onChange} itemClassName="sort-item" render={(it, i) => (
      <>
        <span className="num">{i + 1}</span>
        <span className="grow"><Rich text={it.text} /></span>
        <span className="grip-dots" aria-hidden>⠿</span>
      </>
    )} />
  );
}

function OrderInput({ q, onSubmit }: Props) {
  const [items, setItems] = useState(q.items ?? []);
  return (
    <div className="col">
      <div className="center muted small">{q.type === 'order' ? 'Attrape un élément et glisse-le à sa place' : 'Glisse pour classer du préféré (1) au moins aimé'}</div>
      <SortableList items={items} onChange={setItems} />
      <Submit onClick={() => onSubmit(items.map((x) => x.id))} />
    </div>
  );
}

function SliderInput({ q, onSubmit }: Props) {
  const s = q.slider!;
  const [v, setV] = useState(Math.round(((s.min + s.max) / 2) / s.step) * s.step);
  const dec = (String(s.step).split('.')[1] ?? '').length;
  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="center" style={{ fontSize: '3em', fontWeight: 900 }}>{v.toFixed(dec)}{s.unit ? ` ${s.unit}` : ''}</div>
      <input type="range" min={s.min} max={s.max} step={s.step} value={v} onChange={(e) => setV(Number(e.target.value))} style={{ width: '100%', height: 40, accentColor: 'var(--accent)' }} />
      <div className="row"><span className="muted">{s.min}</span><span className="spacer" /><span className="muted">{s.max}</span></div>
      <div className="row" style={{ justifyContent: 'center' }}>
        {[-10, -1, 1, 10].map((k) => (
          <button key={k} className="btn btn-sm" onClick={() => setV((x) => Math.min(s.max, Math.max(s.min, +(x + k * s.step).toFixed(dec))))}>{k > 0 ? '+' : ''}{k * s.step}</button>
        ))}
      </div>
      <Submit onClick={() => onSubmit(v)} />
    </div>
  );
}

function PinInput({ q, media, onSubmit }: Props) {
  const [pt, setPt] = useState<{ x: number; y: number } | null>(null);
  const src = q.mediaKey ? media[q.mediaKey] : undefined;
  const ref = useRef<HTMLDivElement>(null);
  const place = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    setPt({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) });
  };
  if (!src) return <div className="center"><div className="spinner" style={{ margin: 'auto' }} /> Chargement de l’image…</div>;
  return (
    <div className="col">
      <div className="center muted small">Touche l’image pour placer ton point</div>
      <div className="pin-img" ref={ref} onPointerDown={place} onPointerMove={(e) => e.buttons && place(e)}>
        <img src={src} alt="" draggable={false} />
        {pt && <span className="pin-dot" style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%`, background: 'var(--accent)' }} />}
      </div>
      <Submit disabled={!pt} onClick={() => pt && onSubmit(pt)} />
    </div>
  );
}

function MatchInput({ q, onSubmit }: Props) {
  const left = q.left ?? [];
  const right = q.right ?? [];
  const [links, setLinks] = useState<Record<string, string>>({});
  const [selL, setSelL] = useState<string | null>(null);
  const colorOf = (lid: string) => answerColor(left.findIndex((l) => l.id === lid));
  const rightOwner = (rid: string) => Object.keys(links).find((l) => links[l] === rid);
  const link = (lid: string, rid: string) => {
    setLinks((s) => {
      const n = { ...s };
      const owner = Object.keys(n).find((l) => n[l] === rid);
      if (owner) delete n[owner];
      n[lid] = rid;
      return n;
    });
    setSelL(null);
  };
  const tapRight = (rid: string) => {
    if (selL) return link(selL, rid);
    const owner = rightOwner(rid);
    if (owner) setLinks((s) => { const n = { ...s }; delete n[owner]; return n; });
  };
  const dd = useDragTo((lid, rid) => link(lid, rid), (lid) => setSelL((s) => (s === lid ? null : lid)));
  return (
    <div className="col">
      <div className="center muted small">Glisse chaque élément de gauche sur son partenaire à droite (ou touche l’un puis l’autre)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="col" style={{ gap: 8 }}>
          {left.map((l) => {
            const d = dd.drag(l.id);
            return (
              <div key={l.id} {...d} className={`sort-item ${d.className}`} role="button"
                style={{ borderColor: links[l.id] || selL === l.id ? colorOf(l.id) : undefined, borderWidth: 3, background: selL === l.id ? colorOf(l.id) : undefined, color: selL === l.id ? '#fff' : undefined }}>
                <Rich text={l.text} />
              </div>
            );
          })}
        </div>
        <div className="col" style={{ gap: 8 }}>
          {right.map((r) => {
            const owner = rightOwner(r.id);
            const t = dd.drop(r.id);
            return (
              <button key={r.id} {...t} className={`sort-item ${t.className}`} onClick={() => tapRight(r.id)}
                style={{ borderColor: owner ? colorOf(owner) : undefined, borderWidth: 3, background: owner ? colorOf(owner) : undefined, color: owner ? '#fff' : undefined }}>
                <Rich text={r.text} />
              </button>
            );
          })}
        </div>
      </div>
      <Submit disabled={Object.keys(links).length < left.length} onClick={() => onSubmit(links)} />
    </div>
  );
}

function CategorizeInput({ q, onSubmit }: Props) {
  const cats = q.categories ?? [];
  const items = q.catItems ?? [];
  const [val, setVal] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string | null>(null);
  const put = (id: string, cat: string) => {
    setVal((s) => { const n = { ...s }; if (cat === 'pool') delete n[id]; else n[id] = cat; return n; });
    setSel(null);
  };
  const dd = useDragTo(put, (id) => setSel((s) => (s === id ? null : id)));
  const chip = (it: { id: string; text: string }) => {
    const d = dd.drag(it.id);
    const ci = cats.findIndex((c) => c.id === val[it.id]);
    return (
      <div key={it.id} {...d} className={`cat-chip ${d.className} ${sel === it.id ? 'sel' : ''}`} role="button"
        style={ci >= 0 ? { background: answerColor(ci), color: '#fff', borderColor: 'transparent' } : undefined}>
        <Rich text={it.text} />
      </div>
    );
  };
  const pool = items.filter((it) => !val[it.id]);
  const tapZone = (zone: string) => { if (sel) put(sel, zone); };
  return (
    <div className="col">
      <div className="center muted small">Glisse chaque élément dans sa catégorie (ou touche l’élément puis la catégorie)</div>
      {(() => { const t = dd.drop('pool'); return (
        <div {...t} className={`cat-pool ${t.className}`} onClick={() => tapZone('pool')}>
          {pool.length ? pool.map(chip) : <span className="muted small">Tout est rangé 👍 (tu peux encore déplacer les éléments)</span>}
        </div>
      ); })()}
      <div className="cat-buckets">
        {cats.map((c, i) => {
          const t = dd.drop(c.id);
          return (
            <div key={c.id} {...t} className={`cat-bucket ${t.className}`} style={{ borderColor: answerColor(i) }} onClick={() => tapZone(c.id)}>
              <div className="cat-name" style={{ background: answerColor(i) }}><Rich text={c.name} /></div>
              <div className="cat-in">{items.filter((it) => val[it.id] === c.id).map(chip)}</div>
            </div>
          );
        })}
      </div>
      <Submit disabled={Object.keys(val).length < items.length} onClick={() => onSubmit(val)} />
    </div>
  );
}

function BlanksInput({ q, onSubmit }: Props) {
  const parts = q.blankParts ?? [''];
  const n = parts.length - 1;
  const [v, setV] = useState<string[]>(Array(n).fill(''));
  const set = (i: number, x: string) => setV((s) => s.map((y, j) => (j === i ? x : y)));
  return (
    <div className="col">
      <div className="card" style={{ lineHeight: 2.2, fontSize: '1.1em' }}>
        {parts.map((t, i) => (
          <span key={i}>
            {t}
            {i < n && (q.blankMode === 'choice'
              ? <select className="select" style={{ width: 'auto', display: 'inline-block', padding: '4px 8px' }} value={v[i]} onChange={(e) => set(i, e.target.value)}>
                  <option value="">…</option>
                  {(q.blankOptions ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              : <input className="input" style={{ width: 130, display: 'inline-block', padding: '4px 8px' }} value={v[i]} onChange={(e) => set(i, e.target.value)} autoComplete="off" />)}
          </span>
        ))}
      </div>
      <Submit disabled={v.some((x) => !x.trim())} onClick={() => onSubmit(v.map((x) => x.trim()))} />
    </div>
  );
}

function ScaleInput({ q, onSubmit }: Props) {
  const st = q.statements ?? [];
  const max = q.scaleMax ?? 5;
  const [v, setV] = useState<number[]>(Array(st.length).fill(0));
  return (
    <div className="col">
      {st.map((s, i) => (
        <div key={i} className="card" style={{ padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{s}</div>
          <div className="row" style={{ gap: 4, justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            {Array.from({ length: max }, (_, k) => k + 1).map((k) => (
              <button key={k} className="btn btn-sm" style={{ flex: 1, padding: '10px 0', ...(v[i] === k ? { background: 'var(--accent)', color: '#fff' } : {}) }}
                onClick={() => setV((s2) => s2.map((y, j) => (j === i ? k : y)))}>{k}</button>
            ))}
          </div>
          <div className="row small muted"><span>{q.minLabel}</span><span className="spacer" /><span>{q.maxLabel}</span></div>
        </div>
      ))}
      <Submit disabled={v.some((x) => !x)} onClick={() => onSubmit(v)} />
    </div>
  );
}

function PointsInput({ q, onSubmit }: Props) {
  const items = q.items ?? [];
  const [v, setV] = useState<Record<string, number>>({});
  const used = Object.values(v).reduce((a, b) => a + b, 0);
  const left = 100 - used;
  const add = (id: string, k: number) => setV((s) => {
    const cur = s[id] ?? 0;
    const nv = Math.max(0, Math.min(cur + Math.min(k, left), 100));
    return { ...s, [id]: nv };
  });
  return (
    <div className="col">
      <div className="center" style={{ fontWeight: 800, fontSize: '1.3em' }}>Points restants : {left}</div>
      {items.map((it, i) => (
        <div key={it.id} className="card" style={{ padding: 10 }}>
          <div className="row"><b className="grow">{it.text}</b><b style={{ fontSize: '1.4em', color: answerColor(i) }}>{v[it.id] ?? 0}</b></div>
          <div className="row" style={{ gap: 4, marginTop: 6 }}>
            {[-10, -1, 1, 10].map((k) => <button key={k} className="btn btn-sm" style={{ flex: 1 }} onClick={() => add(it.id, k)}>{k > 0 ? '+' : ''}{k}</button>)}
          </div>
        </div>
      ))}
      <Submit disabled={left !== 0} onClick={() => onSubmit(v)} label={left ? `Répartis encore ${left} points` : 'Valider'} />
    </div>
  );
}

function DrawInput({ onSubmit }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#16161d');
  const [size, setSize] = useState(6);
  const last = useRef<{ x: number; y: number } | null>(null);
  const colors = ['#16161d', '#ff6b5b', '#3d8bfd', '#f4b400', '#20b486', '#8b5cf6', '#ec4899', '#ffffff'];
  useEffect(() => {
    const c = ref.current!;
    c.width = 600; c.height = 600;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 600, 600);
  }, []);
  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 600, y: ((e.clientY - r.top) / r.height) * 600 };
  };
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.strokeStyle = color; ctx.lineWidth = size * 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  const clear = () => { const ctx = ref.current!.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 600, 600); };
  const send = () => {
    const small = document.createElement('canvas');
    small.width = 300; small.height = 300;
    small.getContext('2d')!.drawImage(ref.current!, 0, 0, 300, 300);
    onSubmit(small.toDataURL('image/jpeg', 0.7));
  };
  return (
    <div className="col">
      <canvas ref={ref} className="draw-canvas"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); last.current = pos(e); line(last.current, last.current); }}
        onPointerMove={(e) => { if (!last.current) return; const p = pos(e); line(last.current, p); last.current = p; }}
        onPointerUp={() => { last.current = null; }} />
      <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
        {colors.map((c) => (
          <button key={c} onClick={() => setColor(c)} aria-label={c}
            style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--accent)' : '1px solid var(--line)' }} />
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        {[3, 6, 12, 24].map((s) => <button key={s} className="btn btn-sm" style={size === s ? { background: 'var(--accent)', color: '#fff' } : undefined} onClick={() => setSize(s)}>{s === 3 ? 'Fin' : s === 6 ? 'Moyen' : s === 12 ? 'Gros' : 'Énorme'}</button>)}
        <button className="btn btn-sm" onClick={clear}>Effacer</button>
      </div>
      <Submit onClick={send} label="Envoyer mon dessin" />
    </div>
  );
}

function VoteInput({ q, ideas = [], onSubmit }: Props) {
  const max = q.votes ?? 3;
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < max ? [...s, id] : s));
  const list = useMemo(() => ideas, [ideas]);
  return (
    <div className="col">
      <div className="center" style={{ fontWeight: 800 }}>Vote pour tes idées préférées ({sel.length}/{max})</div>
      {list.map((i) => (
        <button key={i.id} className="sort-item" onClick={() => toggle(i.id)} style={sel.includes(i.id) ? { background: 'var(--accent)', color: '#fff' } : undefined}>
          {sel.includes(i.id) ? '★' : '☆'} {i.text}
        </button>
      ))}
      {!list.length && <div className="center muted">Aucune idée proposée…</div>}
      <Submit disabled={!sel.length} onClick={() => onSubmit(sel)} />
    </div>
  );
}
