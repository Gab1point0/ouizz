// Écran du téléphone d'un joueur.
import { Rich } from '../components/Rich';
import { useEffect, useRef, useState } from 'react';
import { AnswerInput } from '../components/answers';
import { Confetti, go, useCountdown } from '../components/common';
import { resolveLook, Styled } from '../style';
import { AVATARS, REACTIONS, TEAM_COLORS, TEAM_NAMES, type Msg, type PubState } from '../net/protocol';
import { openTransport, type NetStatus, type Transport } from '../net/transport';
import { QT } from '../qtypes';
import { play } from '../sfx';
import { themeStyle } from '../themes';
import type { AnswerPayload } from '../types';
import { uid } from '../util';

interface Me { pid: string; name: string; avatar: string }

const meKey = (pin: string) => `ouizz.me.${pin}`;
// En mode test local, chaque onglet est un joueur différent : identité gardée par onglet.
const idStore = (local: boolean): Storage => (local ? sessionStorage : localStorage);
const lastName = () => { try { return JSON.parse(localStorage.getItem('ouizz.lastme') ?? 'null') as { name: string; avatar: string } | null; } catch { return null; } };

export function PlayerPage({ pin: initialPin, local, autoJoin }: { pin?: string; local: boolean; autoJoin?: string }) {
  const [pin, setPin] = useState(initialPin ?? '');
  const saved = (() => { try { return initialPin ? (JSON.parse(idStore(local).getItem(meKey(initialPin)) ?? 'null') as Me | null) : null; } catch { return null; } })();
  // aperçu depuis l'éditeur : on rejoint tout de suite, sans formulaire ni mémorisation du pseudo
  const [me, setMe] = useState<Me | null>(saved ?? (autoJoin && initialPin ? { pid: uid(10), name: autoJoin, avatar: AVATARS[0] } : null));

  if (!me || !pin) {
    return <JoinForm pin={pin} onJoin={(p, name, avatar) => {
      const m: Me = { pid: uid(10), name, avatar };
      try {
        idStore(local).setItem(meKey(p), JSON.stringify(m));
        localStorage.setItem('ouizz.lastme', JSON.stringify({ name, avatar }));
      } catch { /* ignore */ }
      setPin(p);
      setMe(m);
      if (p !== initialPin) history.replaceState(null, '', `#/j/${p}${local ? '?l=1' : ''}`);
    }} />;
  }
  return <PlayerGame pin={pin} me={me} local={local} onLeave={() => { try { idStore(local).removeItem(meKey(pin)); } catch { /* ignore */ } setMe(null); }} />;
}

function JoinForm({ pin: p0, onJoin }: { pin: string; onJoin: (pin: string, name: string, avatar: string) => void }) {
  const last = lastName();
  const [pin, setPin] = useState(p0);
  const [name, setName] = useState(last?.name ?? '');
  const [avatar, setAvatar] = useState(last?.avatar ?? AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const step = /^\d{6}$/.test(pin) ? 2 : 1;
  return (
    <div className="app" style={themeStyle('craie')}>
      <div className="phone" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="center" style={{ marginTop: 24 }}><span className="logo" style={{ fontSize: '2.6em' }}>Ou<b>izz</b></span></div>
        <form className="col card anim-pop" onSubmit={(e) => { e.preventDefault(); if (step === 2 && name.trim()) onJoin(pin, name.trim(), avatar); }}>
          <label className="field">Code de la partie
            <input className="input" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="123456" style={{ fontSize: '2em', textAlign: 'center', letterSpacing: '.15em', fontWeight: 800 }} autoFocus={!p0} />
          </label>
          {step === 2 && (
            <>
              <label className="field">Ton pseudo
                <input className="input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Pseudo" autoFocus={!!p0} style={{ fontSize: '1.4em', textAlign: 'center', fontWeight: 700 }} />
              </label>
              <div className="field">Ton avatar</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {AVATARS.map((a) => (
                  <button type="button" key={a} onClick={() => setAvatar(a)} style={{ fontSize: '1.7em', padding: 4, borderRadius: 10, border: avatar === a ? '3px solid var(--accent)' : '1px solid transparent', background: avatar === a ? 'var(--bg2)' : 'transparent', cursor: 'pointer' }}>{a}</button>
                ))}
              </div>
              <button className="btn btn-primary btn-big" disabled={!name.trim()}>C’est parti !</button>
            </>
          )}
        </form>
        <div className="center small"><a href="#/host" className="muted">Créer ou animer un quiz →</a></div>
      </div>
    </div>
  );
}

function PlayerGame({ pin, me, local, onLeave }: { pin: string; me: Me; local: boolean; onLeave: () => void }) {
  const [st, setSt] = useState<PubState | null>(null);
  const [status, setStatus] = useState<NetStatus>('connecting');
  const [media, setMedia] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [kicked, setKicked] = useState(false);
  const [ended, setEnded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [endsAt, setEndsAt] = useState(0);
  const tRef = useRef<Transport | null>(null);
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const lastPhase = useRef('');

  useEffect(() => {
    const t = openTransport(pin, local);
    tRef.current = t;
    const hello = () => t.send({ t: 'hello', pid: me.pid, name: me.name, avatar: me.avatar });
    t.onStatus((s) => { setStatus(s); if (s === 'online') hello(); });
    t.onMessage((m: Msg) => {
      if (m.from !== 'host') return;
      if (m.t === 'state') {
        setNotFound(false);
        const s = m.s;
        if (s.endsIn !== undefined) setEndsAt(Date.now() + s.endsIn);
        else setEndsAt(0);
        // pas encore inscrit (l'animateur a redémarré) : on se représente
        if (s.phase !== 'podium' && !s.players.some((p) => p.pid === me.pid)) hello();
        setSt(s);
        const fromStyle = [s.style?.bgImage, s.style?.logo, s.q?.look?.bgImage].filter((x) => x?.startsWith('media:')).map((x) => x!.slice(6));
        const keys = [s.q?.mediaKey, ...(s.q?.answers ?? []).map((a) => a.imageKey), ...fromStyle].filter(Boolean) as string[];
        const missing = keys.filter((k) => !mediaRef.current[k]);
        if (missing.length) t.send({ t: 'need', pid: me.pid, keys: missing });
      } else if (m.t === 'media') {
        setMedia((x) => ({ ...x, [m.key]: m.src }));
      } else if (m.t === 'kick' && m.pid === me.pid) {
        setKicked(true);
        t.close();
      } else if (m.t === 'end') {
        setEnded(true);
      }
    });
    const ping = setInterval(() => t.send({ t: 'ping', pid: me.pid }), 4000);
    const nf = setTimeout(() => setNotFound(true), 9000);
    // garder l'écran allumé
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    const vis = () => { if (document.visibilityState === 'visible') { hello(); nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {}); } };
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(ping);
      clearTimeout(nf);
      document.removeEventListener('visibilitychange', vis);
      lock?.release().catch(() => {});
      t.close();
    };
  }, [pin, me, local]);

  // sons / vibrations sur le téléphone
  useEffect(() => {
    if (!st) return;
    const key = `${st.phase}:${st.qNum}:${st.sub ?? ''}`;
    if (key === lastPhase.current) return;
    lastPhase.current = key;
    if (st.phase === 'reveal') {
      const r = st.res[me.pid];
      if (r?.f !== undefined && st.q && QT[st.q.type].scored && st.q.points > 0) {
        if (r.f >= 0.999) { navigator.vibrate?.(80); play('correct'); }
        else { navigator.vibrate?.([60, 60, 60]); }
      }
    }
    if (st.phase === 'question') navigator.vibrate?.(30);
  }, [st, me.pid]);

  const submit = (a: AnswerPayload) => {
    if (!st?.q) return;
    const key = `${st.q.id}:${st.sub ?? ''}`;
    setSent((s) => ({ ...s, [key]: true }));
    tRef.current?.send({ t: 'answer', pid: me.pid, qid: st.q.id, a });
  };
  const react = (e: string) => tRef.current?.send({ t: 'react', pid: me.pid, e });

  const img = (src: string) => (src.startsWith('media:') ? media[src.slice(6)] : src);
  const look = resolveLook(st?.theme ?? 'craie', st?.style, st && st.phase !== 'lobby' && st.phase !== 'podium' && st.phase !== 'leaderboard' ? st.q?.look : undefined, img);
  const screenKey = `${st?.phase}:${st?.qNum}:${st?.sub ?? ''}`;
  const wrap = (children: React.ReactNode) => (
    <Styled look={look} attrs={{ 'data-phase': st?.phase, 'data-qtype': st?.q?.type }}>
      <div key={screenKey} className={`phone tr-${look.transition}`} style={{ maxWidth: 560, margin: '0 auto' }}>
        {look.logo && <img src={look.logo} alt="" className="stage-logo" style={{ alignSelf: 'center', maxHeight: 40 }} />}
        {children}
      </div>
    </Styled>
  );

  if (kicked) return wrap(<div className="phone-main center"><div className="big-emoji">🚪</div><h2>Tu as été retiré de la partie.</h2><button className="btn" onClick={onLeave}>Revenir</button></div>);
  if (!st) {
    return wrap(
      <div className="phone-main center col" style={{ alignItems: 'center' }}>
        <div className="spinner" />
        <div>{status === 'online' ? 'Recherche de la partie…' : 'Connexion…'}</div>
        {notFound && <div className="card anim-pop">Aucune partie trouvée avec le code <b>{pin}</b>. Vérifie le code, ou attends que l’animateur ouvre la partie.
          <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}><button className="btn" onClick={onLeave}>Changer de code</button></div></div>}
      </div>,
    );
  }

  const meP = st.players.find((p) => p.pid === me.pid);
  const res = st.res[me.pid];
  const q = st.q;
  const team = meP?.team !== undefined ? { name: TEAM_NAMES[meP.team], color: TEAM_COLORS[meP.team] } : null;

  const top = (
    <div className="phone-top">
      <span style={{ fontSize: '1.6em' }}>{meP?.avatar ?? me.avatar}</span>
      <span className="grow">{meP?.name ?? me.name}{team && <span className="chip" style={{ marginLeft: 6, background: team.color, color: '#fff' }}>{team.name}</span>}</span>
      {status !== 'online' && <span className="chip">⚠ reconnexion…</span>}
      {st.phase !== 'lobby' && <span className="chip">{meP?.score ?? 0} pts</span>}
    </div>
  );

  if (ended && st.phase !== 'podium') return wrap(<>{top}<div className="phone-main center"><div className="big-emoji">👋</div><h2>L’animateur a fermé la partie.</h2><button className="btn" onClick={() => go('/')}>Accueil</button></div></>);

  const reactBar = (
    <div className="react-bar">{REACTIONS.map((e) => <button key={e} onClick={() => react(e)}>{e}</button>)}</div>
  );

  switch (st.phase) {
    case 'lobby':
      return wrap(<>
        {top}
        <div className="phone-main center col" style={{ alignItems: 'center' }}>
          <div className="big-emoji anim-pop">{meP?.avatar ?? me.avatar}</div>
          <h2 className="anim-slide">Tu es dans la partie !</h2>
          <div className="muted">Regarde le grand écran, ça va commencer.</div>
          <div className="chip">{st.players.length} joueur{st.players.length > 1 ? 's' : ''}</div>
        </div>
        {reactBar}
      </>);

    case 'ready':
      return wrap(<>
        {top}
        <div className="phone-main center col" style={{ alignItems: 'center' }}>
          <div className="chip">Question {st.qNum}/{st.qTotal}</div>
          <div style={{ fontSize: '3em' }} className="anim-pop">{q ? QT[q.type].icon : ''}</div>
          <h2>{q ? QT[q.type].label : ''}</h2>
          {q?.title && <div className="card anim-slide" style={{ fontWeight: 700, fontSize: '1.2em' }}><Rich text={q.title} /></div>}
          <ReadyCount endsAt={endsAt} />
        </div>
      </>);

    case 'question': {
      if (!q) return wrap(top);
      const key = `${q.id}:${st.sub ?? ''}`;
      const answered = sent[key] || !!res?.a;
      if (q.type === 'slide') {
        return wrap(<>{top}<div className="phone-main center col">
          {q.title ? <><h2><Rich text={q.title} /></h2>{q.body && <p style={{ whiteSpace: 'pre-wrap' }}><Rich text={q.body} /></p>}</> : <><div className="big-emoji">👀</div><h2>Regarde l’écran</h2></>}
          {q.mediaKey && media[q.mediaKey] && <img src={media[q.mediaKey]} alt="" style={{ maxWidth: '100%', borderRadius: 12 }} />}
        </div>{reactBar}</>);
      }
      if (q.type === 'buzzer') return wrap(<>{top}<BuzzerView st={st} pid={me.pid} onBuzz={() => { play('buzz'); navigator.vibrate?.(120); tRef.current?.send({ t: 'buzz', pid: me.pid, qid: q.id }); }} /></>);
      return wrap(<>
        {top}
        <PhoneTimer endsAt={endsAt} total={(st.sub === 'vote' ? Math.max(20, Math.round(q.time / 2)) : q.time) * 1000} paused={st.paused} />
        {q.title && <div className="card center" style={{ fontWeight: 800, fontSize: '1.15em', padding: 12 }}><Rich text={q.title} /></div>}
        {q.mediaKey && media[q.mediaKey] && q.type !== 'pin' && <img src={media[q.mediaKey]} alt="" style={{ maxWidth: '100%', maxHeight: '28vh', objectFit: 'contain', borderRadius: 12, alignSelf: 'center' }} />}
        <div className="phone-main">
          {answered
            ? <div className="center col anim-pop" style={{ alignItems: 'center' }}><div className="big-emoji">⏳</div><h2>Réponse envoyée !</h2><div className="muted">On attend les autres… ({st.answered}/{st.players.filter((p) => p.on).length})</div></div>
            : st.paused ? <div className="center"><div className="big-emoji">⏸</div><h2>Pause</h2></div>
              : <AnswerInput key={key} q={q} media={media} showText={st.showOnPhones} sub={st.sub} ideas={st.ideas} onSubmit={submit} />}
        </div>
        {answered && reactBar}
      </>);
    }

    case 'reveal':
    case 'leaderboard': {
      const scored = q && QT[q.type].scored && q.points > 0;
      let fb: React.ReactNode;
      if (q?.type === 'buzzer') {
        const winner = st.players.find((p) => p.pid === st.buzz?.winner);
        fb = st.buzz?.winner === me.pid
          ? <Feedback color="#20b486" title="Bonne réponse !" sub={`+${res?.g ?? 0} points`} emoji="🎉" />
          : <Feedback color="var(--card)" dark title={winner ? `${winner.avatar} ${winner.name} a trouvé !` : 'Personne n’a trouvé'} sub={st.reveal?.buzzAnswer ? `Réponse : ${st.reveal.buzzAnswer}` : ''} emoji="🔔" />;
      } else if (!scored) {
        fb = <Feedback color="var(--card)" dark title={res?.a ? 'Merci pour ta réponse !' : 'Regarde les résultats'} emoji={res?.a ? '🙌' : '👀'} />;
      } else if (!res?.a) {
        fb = <Feedback color="#868e96" title="Pas de réponse" sub="Trop tard !" emoji="⌛" />;
      } else if ((res.f ?? 0) >= 0.999) {
        fb = <>{look.style.phoneCelebrate !== false && <Confetti count={50} />}<Feedback color="#20b486" title="Bonne réponse !" sub={`+${res.g} points${(res.s ?? 0) >= 2 ? ` · série 🔥${res.s}` : ''}`} emoji="✅" /></>;
      } else if ((res.f ?? 0) > 0) {
        fb = <Feedback color="#f08c00" title="Presque !" sub={`${Math.round((res.f ?? 0) * 100)} % juste · +${res.g} points`} emoji="🤏" />;
      } else {
        fb = <Feedback color="#e03131" title="Raté !" sub="La prochaine sera la bonne" emoji="❌" shake />;
      }
      return wrap(<>
        {top}
        <div className="phone-main col">
          {fb}
          {st.reveal?.note && <div className="card small">💡 {st.reveal.note}</div>}
          {scored && meP && <div className="center" style={{ fontWeight: 800, fontSize: '1.2em' }}>{rankText(meP.rank, st.players)}</div>}
        </div>
        {reactBar}
      </>);
    }

    case 'podium': {
      const rank = meP?.rank ?? 0;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏁';
      const myTeam = st.teams?.findIndex((t) => t.id === meP?.team);
      return wrap(<>
        {top}
        <div className="phone-main center col" style={{ alignItems: 'center' }}>
          <div className="big-emoji anim-pop" style={{ fontSize: '6em' }}>{medal}</div>
          <h1 className="anim-slide">{rank ? `${rank}${rank === 1 ? 'er' : 'e'} sur ${st.players.length}` : 'Fin de la partie'}</h1>
          <div style={{ fontSize: '1.6em', fontWeight: 800 }}>{meP?.score ?? 0} points</div>
          {myTeam !== undefined && myTeam >= 0 && st.teams && <div className="chip" style={{ background: st.teams[myTeam].color, color: '#fff' }}>Équipe {st.teams[myTeam].name} : {myTeam + 1}{myTeam === 0 ? 're' : 'e'}</div>}
          {look.style.endMessage && <div className="card" style={{ whiteSpace: 'pre-wrap' }}>{look.style.endMessage}</div>}
          <button className="btn" onClick={() => { onLeave(); go('/'); }}>Rejouer avec un autre code</button>
        </div>
        {reactBar}
      </>);
    }
  }
}

function rankText(rank: number, players: PubState['players']) {
  if (rank === 1) return '🏆 Tu es en tête !';
  const above = players.find((p) => p.rank === rank - 1);
  const me = players.find((p) => p.rank === rank);
  const gap = above && me ? above.score - me.score : 0;
  return `${rank}e place${above ? ` · ${gap} pts derrière ${above.name}` : ''}`;
}

function Feedback({ color, title, sub, emoji, dark, shake }: { color: string; title: string; sub?: string; emoji: string; dark?: boolean; shake?: boolean }) {
  return (
    <div className={`feedback ${shake ? 'anim-shake' : 'anim-pop'}`} style={{ background: color, color: dark ? 'var(--fg)' : '#fff' }}>
      <div style={{ fontSize: '3.5em' }}>{emoji}</div>
      <div className="big">{title}</div>
      {sub && <div style={{ marginTop: 6, opacity: 0.9 }}>{sub}</div>}
    </div>
  );
}

function ReadyCount({ endsAt }: { endsAt: number }) {
  const s = useCountdown(endsAt);
  return <div className="anim-pulse" style={{ fontSize: '3em', fontWeight: 900 }}>{s || '…'}</div>;
}

function PhoneTimer({ endsAt, total, paused }: { endsAt: number; total: number; paused?: boolean }) {
  const s = useCountdown(endsAt);
  if (!endsAt || !total) return null;
  const frac = Math.min(1, (s * 1000) / total);
  return (
    <div style={{ height: 8, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }} title={`${s} s`}>
      <div style={{ height: '100%', width: `${frac * 100}%`, background: s <= 5 ? 'var(--a1)' : 'var(--accent)', transition: paused ? 'none' : 'width .3s linear' }} />
    </div>
  );
}

function BuzzerView({ st, pid, onBuzz }: { st: PubState; pid: string; onBuzz: () => void }) {
  const b = st.buzz ?? { queue: [], locked: [] };
  const pos = b.queue.indexOf(pid);
  const locked = b.locked.includes(pid);
  const first = b.queue[0] ? st.players.find((p) => p.pid === b.queue[0]) : null;
  return (
    <div className="phone-main center col" style={{ alignItems: 'center', gap: 20 }}>
      {st.q?.title && <div className="card" style={{ fontWeight: 800 }}><Rich text={st.q.title} /></div>}
      {pos === 0 ? <><div className="big-emoji anim-pop">🎤</div><h2>À toi ! Réponds à voix haute</h2></>
        : pos > 0 ? <><div className="big-emoji">✋</div><h2>Tu es {pos + 1}e dans la file</h2><div className="muted">{first?.name} répond…</div></>
          : locked ? <><div className="big-emoji">🚫</div><h2>Mauvaise réponse, tu ne peux plus buzzer</h2></>
            : <>
              <button className="buzzer anim-pop" onClick={onBuzz}>BUZZ</button>
              {first && <div className="muted">{first.avatar} {first.name} répond…</div>}
            </>}
    </div>
  );
}
