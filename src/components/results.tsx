// Affichage des résultats d'une question sur le grand écran, un rendu par type.
import { ShrinkTitle } from '../minigames/Title';
import { minigameOf } from '../minigames';
import { Rich } from './Rich';
import { useMemo } from 'react';
import type { HostGame } from '../game/host';
import type { PubQuestion } from '../net/protocol';
import type { Question } from '../types';
import { normalize, parseBlanks } from '../util';
import { labelFor, tile, TileLabel, useLook } from '../style';
import { answerColor } from './common';
import { ZoneShapes } from './ZoneShapes';
import { zonesOf } from '../zones';
import { MediaView, type PlayerControl } from './MediaPlayer';

interface Props { game: HostGame; q: Question; pq: PubQuestion; reveal: boolean }

export function Results(p: Props) {
  switch (p.q.type) {
    case 'choice': case 'poll': return <ChoiceBars {...p} />;
    case 'truefalse': return <TrueFalseBars {...p} />;
    case 'type': case 'wordcloud': return <Cloud {...p} />;
    case 'open': return <Wall {...p} />;
    case 'slider': return <SliderDots {...p} />;
    case 'pin': return <PinDots {...p} />;
    case 'order': case 'match': case 'categorize': case 'blanks': return <Solution {...p} />;
    case 'scale': return <ScaleResults {...p} />;
    case 'ranking': return <RankingResults {...p} />;
    case 'points100': return <PointsResults {...p} />;
    case 'draw': return <Gallery {...p} />;
    case 'brainstorm': return <Ideas {...p} />;
    case 'buzzer': return <BuzzResult {...p} />;
    case 'minigame': return <MinigameScores {...p} />;
    default: return null;
  }
}

const answers = (g: HostGame, q: Question) => Object.entries(g.answersFor(q.id));
const nameOf = (g: HostGame, pid: string) => g.s.players[pid]?.name ?? '?';

function ChoiceBars({ game, q, pq, reveal }: Props) {
  const look = useLook();
  const list = pq.answers ?? [];
  const counts = Object.fromEntries(list.map((a) => [a.id, 0]));
  for (const [, r] of answers(game, q)) for (const id of (r.a as string[]) ?? []) if (id in counts) counts[id]++;
  const max = Math.max(1, ...Object.values(counts));
  const correct = new Set((q.answers ?? []).filter((a) => a.correct).map((a) => a.id));
  return (
    <div className="bars">
      {list.map((a, i) => {
        const ok = q.type === 'choice' && correct.has(a.id);
        const dim = reveal && q.type === 'choice' && !ok;
        return (
          <div key={a.id} className="bar" style={{ opacity: dim ? 0.35 : 1 }}>
            <div className="n">{counts[a.id]}{ok && ' ✔'}</div>
            <div className="fill anim-rise" style={{ height: `${(counts[a.id] / max) * 80}%`, background: answerColor(i) }} />
            <div className="center small" style={{ fontWeight: 700 }}>{labelFor(i, look)}{labelFor(i, look) && a.text ? ' · ' : ''}<Rich text={a.text} /></div>
          </div>
        );
      })}
    </div>
  );
}

function TrueFalseBars({ game, q, reveal }: Props) {
  let t = 0, f = 0;
  for (const [, r] of answers(game, q)) (r.a === true ? t++ : f++);
  const max = Math.max(1, t, f);
  const rows = [{ label: 'Vrai', n: t, ok: q.correctBool === true, c: 'var(--a2)' }, { label: 'Faux', n: f, ok: q.correctBool === false, c: 'var(--a1)' }];
  return (
    <div className="bars" style={{ width: 'min(500px, 100%)' }}>
      {rows.map((r) => (
        <div key={r.label} className="bar" style={{ opacity: reveal && !r.ok ? 0.35 : 1 }}>
          <div className="n">{r.n}{r.ok && ' ✔'}</div>
          <div className="fill anim-rise" style={{ height: `${(r.n / max) * 80}%`, background: r.c }} />
          <div style={{ fontWeight: 800, fontSize: '1.3em' }}>{r.label}</div>
        </div>
      ))}
    </div>
  );
}

function Cloud({ game, q, reveal }: Props) {
  const words = useMemo(() => {
    const m = new Map<string, { text: string; n: number; ok: boolean; pids: string[] }>();
    for (const [pid, r] of answers(game, q)) {
      const arr = Array.isArray(r.a) ? (r.a as string[]) : [String(r.a)];
      for (const w of arr) {
        const k = normalize(w);
        if (!k) continue;
        const e = m.get(k) ?? { text: w.trim(), n: 0, ok: q.type === 'type' && (r.f ?? 0) >= 0.999, pids: [] };
        e.n++;
        e.pids.push(pid);
        m.set(k, e);
      }
    }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [game, q, game.s.v]);
  const max = Math.max(1, ...words.map((w) => w.n));
  return (
    <div className="col" style={{ alignItems: 'center', width: '100%' }}>
      {q.type === 'type' && reveal && <div className="chip" style={{ background: '#20b486', color: '#fff', fontSize: '1.2em' }}>Réponse : {(q.accepted ?? []).join(' / ')}</div>}
      <div className="cloud">
        {words.map((w, i) => (
          <span key={w.text} className={`anim-pop`} style={{ animationDelay: `${i * 0.03}s`, fontSize: `${1 + (w.n / max) * 2.6}em`, fontWeight: 800, color: q.type === 'type' && reveal ? (w.ok ? '#20b486' : 'var(--muted)') : answerColor(i) }}>
            {w.text}
            {q.type === 'type' && reveal && !w.ok && (
              <button className="btn btn-sm btn-ghost" title="Accepter cette réponse" onClick={() => w.pids.forEach((pid) => game.overrideAnswer(pid, true))}>✔?</button>
            )}
          </span>
        ))}
        {!words.length && <div className="muted">Aucune réponse</div>}
      </div>
    </div>
  );
}

function Wall({ game, q }: Props) {
  return (
    <div className="wall">
      {answers(game, q).map(([pid, r], i) => {
        const key = `${q.id}:${pid}`;
        const hidden = game.s.hidden[key];
        return (
          <div key={pid} className="postit anim-pop" style={{ animationDelay: `${i * 0.05}s`, opacity: hidden ? 0.3 : 1, borderTop: `5px solid ${answerColor(i)}` }}>
            <div>{hidden ? '(masquée)' : String(r.a)}</div>
            <div className="row small muted" style={{ marginTop: 6 }}>
              <span>{nameOf(game, pid)}</span><span className="spacer" />
              <button className="btn btn-sm btn-ghost" onClick={() => game.toggleHidden(key)}>{hidden ? 'Afficher' : 'Masquer'}</button>
            </div>
          </div>
        );
      })}
      {!answers(game, q).length && <div className="muted">Aucune réponse</div>}
    </div>
  );
}

function SliderDots({ game, q, reveal }: Props) {
  const s = q.slider!;
  const pos = (v: number) => `${((v - s.min) / (s.max - s.min || 1)) * 100}%`;
  const list = answers(game, q).map(([pid, r]) => ({ pid, v: Number(r.a) }));
  const avg = list.length ? list.reduce((a, b) => a + b.v, 0) / list.length : null;
  return (
    <div className="col" style={{ width: 'min(1000px, 100%)', gap: 30 }}>
      {reveal && <div className="center" style={{ fontSize: '2.4em', fontWeight: 900 }}>{s.correct}{s.unit ? ` ${s.unit}` : ''}</div>}
      <div style={{ position: 'relative', height: 120, margin: '0 30px' }}>
        <div style={{ position: 'absolute', top: 60, left: 0, right: 0, height: 8, background: 'var(--line)', borderRadius: 4 }} />
        {reveal && s.margin > 0 && <div style={{ position: 'absolute', top: 52, height: 24, left: pos(s.correct - s.margin), width: `calc(${pos(s.correct + s.margin)} - ${pos(s.correct - s.margin)})`, background: 'rgba(32,180,134,.3)', borderRadius: 6 }} />}
        {list.map((x, i) => (
          <div key={x.pid} className="anim-pop" title={nameOf(game, x.pid)} style={{ position: 'absolute', left: pos(x.v), top: 20 + (i % 3) * 14, transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6em' }}>{game.s.players[x.pid]?.avatar}</div>
          </div>
        ))}
        {reveal && <div style={{ position: 'absolute', left: pos(s.correct), top: 40, width: 4, height: 50, background: '#20b486', transform: 'translateX(-50%)' }} />}
        <div style={{ position: 'absolute', top: 80, left: 0 }} className="muted">{s.min}</div>
        <div style={{ position: 'absolute', top: 80, right: 0 }} className="muted">{s.max}</div>
      </div>
      {avg !== null && <div className="center muted">Moyenne des réponses : {Math.round(avg * 100) / 100}</div>}
    </div>
  );
}

function PinDots({ game, q, reveal }: Props) {
  const zs = zonesOf(q);
  return (
    <div className="pin-img" style={{ width: 'fit-content', maxWidth: 'min(900px, 100%)', margin: '0 auto' }}>
      <img src={q.media?.src} alt="" style={{ maxHeight: '60vh', width: 'auto', maxWidth: '100%', display: 'block' }} />
      {reveal && zs.length > 0 && <ZoneShapes zones={zs} className="anim-pop" />}
      {answers(game, q).map(([pid, r], i) => {
        const p = r.a as { x: number; y: number };
        return <span key={pid} className="pin-dot anim-pop" title={nameOf(game, pid)} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, background: answerColor(i) }} />;
      })}
    </div>
  );
}

function Solution({ game, q }: Props) {
  const list = answers(game, q);
  const full = list.filter(([, r]) => (r.f ?? 0) >= 0.999).length;
  const avg = list.length ? Math.round((list.reduce((a, [, r]) => a + (r.f ?? 0), 0) / list.length) * 100) : 0;
  let body: React.ReactNode = null;
  if (q.type === 'order') body = <ol style={{ fontSize: '1.4em', fontWeight: 700 }}>{(q.items ?? []).map((x) => <li key={x.id} className="anim-slide"><Rich text={x.text} /></li>)}</ol>;
  if (q.type === 'match') body = <div className="col">{(q.pairs ?? []).map((p, i) => <div key={p.id} className="row anim-slide" style={{ fontSize: '1.3em', fontWeight: 700 }}><span className="chip" style={{ background: answerColor(i), color: '#fff' }}>{p.left}</span> ⟷ <span>{p.right}</span></div>)}</div>;
  if (q.type === 'categorize') body = (
    <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'center' }}>
      {(q.categories ?? []).map((c, i) => (
        <div key={c.id} className="card" style={{ minWidth: 180 }}>
          <div style={{ fontWeight: 800, color: answerColor(i), marginBottom: 6 }}>{c.name}</div>
          {(q.catItems ?? []).filter((x) => x.cat === c.id).map((x) => <div key={x.id}>• {x.text}</div>)}
        </div>
      ))}
    </div>
  );
  if (q.type === 'blanks') {
    const { parts, blanks } = parseBlanks(q.blankText ?? '');
    body = <div className="card" style={{ fontSize: '1.5em', lineHeight: 1.8 }}>{parts.map((t, i) => <span key={i}>{t}{i < blanks.length && <b style={{ color: '#20b486', textDecoration: 'underline' }}>{blanks[i][0]}</b>}</span>)}</div>;
  }
  return (
    <div className="col" style={{ alignItems: 'center' }}>
      {body}
      <div className="chip" style={{ fontSize: '1.1em' }}>{full}/{list.length} parfaitement juste · réussite moyenne {avg} %</div>
    </div>
  );
}

function ScaleResults({ game, q }: Props) {
  const st = q.statements ?? [];
  const max = q.scaleMax ?? 5;
  const list = answers(game, q).map(([, r]) => r.a as number[]);
  return (
    <div className="col" style={{ width: 'min(900px, 100%)' }}>
      {st.map((s, i) => {
        const vals = list.map((v) => v[i]).filter((x) => x > 0);
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return (
          <div key={i} className="card">
            <div className="row"><b className="grow" style={{ fontSize: '1.2em' }}>{s}</b><b style={{ fontSize: '1.6em', color: answerColor(i) }}>{avg ? avg.toFixed(1) : '–'}</b><span className="muted">/ {max}</span></div>
            <div style={{ height: 14, background: 'var(--bg2)', borderRadius: 7, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((avg - 1) / (max - 1 || 1)) * 100}%`, background: answerColor(i), transition: 'width .8s' }} />
            </div>
            <div className="row small muted"><span>{q.minLabel}</span><span className="spacer" /><span>{q.maxLabel}</span></div>
          </div>
        );
      })}
    </div>
  );
}

function RankingResults({ game, q }: Props) {
  const items = q.items ?? [];
  const list = answers(game, q).map(([, r]) => r.a as string[]);
  const score = items.map((it) => {
    const ranks = list.map((l) => l.indexOf(it.id)).filter((x) => x >= 0);
    return { it, avg: ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length + 1 : 99 };
  }).sort((a, b) => a.avg - b.avg);
  return (
    <div className="lb">
      {score.map((s, i) => (
        <div key={s.it.id} className="lb-row anim-slide" style={{ animationDelay: `${i * 0.08}s` }}>
          <span className="rank">{i + 1}</span><span className="grow">{s.it.text}</span>
          <span className="muted small">rang moyen {s.avg === 99 ? '–' : s.avg.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

function PointsResults({ game, q }: Props) {
  const items = q.items ?? [];
  const list = answers(game, q).map(([, r]) => r.a as Record<string, number>);
  const tot = items.map((it) => list.reduce((a, l) => a + (l[it.id] ?? 0), 0));
  const max = Math.max(1, ...tot);
  return (
    <div className="col" style={{ width: 'min(900px, 100%)' }}>
      {items.map((it, i) => (
        <div key={it.id} className="row" style={{ flexWrap: 'nowrap' }}>
          <b style={{ width: 200 }}>{it.text}</b>
          <div className="grow" style={{ background: 'var(--bg2)', borderRadius: 8, height: 34, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(tot[i] / max) * 100}%`, background: answerColor(i), transition: 'width .8s' }} />
          </div>
          <b style={{ width: 90, textAlign: 'right' }}>{list.length ? Math.round(tot[i] / list.length) : 0} pts</b>
        </div>
      ))}
      <div className="center muted small">Moyenne par personne</div>
    </div>
  );
}

function Gallery({ game, q }: Props) {
  return (
    <div className="wall">
      {answers(game, q).map(([pid, r], i) => {
        const key = `${q.id}:${pid}`;
        const hidden = game.s.hidden[key];
        return (
          <div key={pid} className="postit anim-pop" style={{ animationDelay: `${i * 0.06}s`, padding: 8 }}>
            {hidden ? <div style={{ width: 200, height: 200, display: 'grid', placeItems: 'center' }} className="muted">(masqué)</div> : <img src={String(r.a)} alt="" style={{ width: 200, height: 200, borderRadius: 8, display: 'block' }} />}
            <div className="row small muted" style={{ marginTop: 4 }}><span>{nameOf(game, pid)}</span><span className="spacer" /><button className="btn btn-sm btn-ghost" onClick={() => game.toggleHidden(key)}>{hidden ? 'Afficher' : 'Masquer'}</button></div>
          </div>
        );
      })}
      {!answers(game, q).length && <div className="muted">Aucun dessin</div>}
    </div>
  );
}

function Ideas({ game, q, reveal }: Props) {
  const ideas = game.s.ideas[q.id] ?? [];
  if (!reveal) {
    // pendant le vote : les idées sans les votes
    return <div className="wall">{ideas.map((i, k) => <div key={i.id} className="postit anim-pop" style={{ borderTop: `5px solid ${answerColor(k)}` }}>{i.text}</div>)}</div>;
  }
  return (
    <div className="lb">
      {ideas.map((i, k) => (
        <div key={i.id} className="lb-row anim-slide" style={{ animationDelay: `${k * 0.06}s` }}>
          <span className="rank">{k + 1}</span><span className="grow">{i.text}</span><span className="muted small">{nameOf(game, i.pid)}</span><b>{i.votes} ★</b>
        </div>
      ))}
    </div>
  );
}

function BuzzResult({ game, q }: Props) {
  const w = game.s.buzz.winner ? game.s.players[game.s.buzz.winner] : null;
  return (
    <div className="col center" style={{ alignItems: 'center' }}>
      {w ? <><div className="big-emoji anim-pop">{w.avatar}</div><h2>{w.name} a trouvé ! +{game.answersFor(q.id)[w.pid]?.g ?? 0}</h2></> : <h2>Personne n’a trouvé</h2>}
      {q.buzzAnswer && <div className="chip" style={{ fontSize: '1.3em' }}>Réponse : {q.buzzAnswer}</div>}
    </div>
  );
}

/** Pendant la question : les réponses à choisir (grand écran) */
function MinigameScores({ game, q }: Props) {
  const def = minigameOf(q.minigame);
  const list = answers(game, q).map(([pid, r]) => ({ pid, score: Number(r.a) || 0, g: r.g ?? 0 })).sort((a, b) => b.score - a.score);
  const best = Math.max(1, ...list.map((x) => x.score));
  if (!list.length) return <div className="center muted" style={{ fontSize: '1.4em' }}>Personne n’a joué…</div>;
  return (
    <div className="col mg-scores" style={{ width: 'min(900px, 100%)', gap: 8 }}>
      {list.map((x, i) => (
        <div key={x.pid} className={`mg-score-row anim-slide d${Math.min(i + 1, 8)}`}>
          <span className="rank">{i === 0 ? '👑' : i + 1}</span>
          <b className="mg-score-name">{game.s.players[x.pid]?.avatar} {nameOf(game, x.pid)}</b>
          <span className="mg-score-bar"><i style={{ width: `${(x.score / best) * 100}%`, background: answerColor(i) }} /></span>
          <b className="mg-score-val">{x.score} {def.unit}</b>
          {x.g > 0 && <span className="muted small">+{x.g}</span>}
        </div>
      ))}
    </div>
  );
}

/** Grand écran pendant un mini-jeu : consignes + joueurs qui ont fini. */
export function MinigameStage({ game, q }: { game: HostGame; q: Question }) {
  const def = minigameOf(q.minigame);
  const done = Object.keys(game.currentAnswers).length;
  const total = game.activePlayers.length;
  return (
    <div className="card center col mg-stage anim-pop" style={{ alignItems: 'center', gap: 10, maxWidth: 900 }}>
      <div style={{ fontSize: '4em', lineHeight: 1 }}>{def.icon}</div>
      <div style={{ fontSize: '2em', fontWeight: 900 }}>{def.titleParts ? <ShrinkTitle parts={def.titleParts} /> : def.name}</div>
      <div style={{ fontSize: '1.4em' }}>{def.howTo}</div>
      <div className="muted">🎮 À vous de jouer sur vos téléphones ! · {done}/{total} ont terminé</div>
    </div>
  );
}

export function StageAnswers({ q, pq }: { q: Question; pq: PubQuestion }) {
  if (q.type === 'truefalse') {
    return (
      <div className="ans-grid">
        <div className="ans anim-pop" style={{ ...tile(1), justifyContent: 'center' }}>✔ Vrai</div>
        <div className="ans anim-pop d1" style={{ ...tile(0), justifyContent: 'center' }}>✘ Faux</div>
      </div>
    );
  }
  if (pq.answers) {
    return (
      <div className="ans-grid">
        {pq.answers.map((a, i) => {
          const full = q.answers?.find((x) => x.id === a.id);
          return (
            <div key={a.id} className={`ans anim-pop d${i + 1}`} style={tile(i)}>
              <TileLabel i={i} />
              {full?.image && <img src={full.image} alt="" />}
              <span><Rich text={a.text} /></span>
            </div>
          );
        })}
      </div>
    );
  }
  if ((q.type === 'order' || q.type === 'ranking' || q.type === 'points100') && pq.items) {
    return <div className="wall">{pq.items.map((x, i) => <div key={x.id} className="postit anim-pop" style={{ borderTop: `5px solid ${answerColor(i)}`, fontSize: '1.3em' }}>{x.text}</div>)}</div>;
  }
  if (q.type === 'match') {
    return (
      <div className="row" style={{ alignItems: 'flex-start', gap: 40, fontSize: '1.3em' }}>
        <div className="col">{pq.left?.map((x, i) => <div key={x.id} className="postit" style={{ borderLeft: `6px solid ${answerColor(i)}` }}>{x.text}</div>)}</div>
        <div className="col">{pq.right?.map((x) => <div key={x.id} className="postit">{x.text}</div>)}</div>
      </div>
    );
  }
  if (q.type === 'categorize') {
    return (
      <div className="col" style={{ alignItems: 'center' }}>
        <div className="row">{q.categories?.map((c, i) => <span key={c.id} className="chip" style={{ background: answerColor(i), color: '#fff', fontSize: '1.3em' }}>{c.name}</span>)}</div>
        <div className="wall">{pq.catItems?.map((x) => <div key={x.id} className="postit">{x.text}</div>)}</div>
      </div>
    );
  }
  if (q.type === 'blanks') {
    const parts = pq.blankParts ?? [];
    return <div className="card" style={{ fontSize: '1.6em', lineHeight: 1.8 }}>{parts.map((t, i) => <span key={i}>{t}{i < parts.length - 1 && <b style={{ borderBottom: '3px solid var(--accent)', padding: '0 30px' }}>{' '}</b>}</span>)}</div>;
  }
  if (q.type === 'scale') {
    return <div className="col">{q.statements?.map((s, i) => <div key={i} className="postit" style={{ fontSize: '1.3em' }}>{s}</div>)}</div>;
  }
  if (q.type === 'slider' && q.slider) {
    return <div className="card center" style={{ fontSize: '1.4em' }}>Entre <b>{q.slider.min}</b> et <b>{q.slider.max}</b> {q.slider.unit}</div>;
  }
  return null;
}

export function StageMedia({ q, control }: { q: Question; control?: PlayerControl }) {
  if (!q.media) return q.speech ? <div className="speech-badge anim-pop" title="Lecture à voix haute"><span>🗣️</span><span className="eq"><i /><i /><i /><i /></span></div> : null;
  return <MediaView media={q.media} control={control} />;
}
