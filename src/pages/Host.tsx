// Grand écran de l'animateur : préparation, salle d'attente (QR code), questions, résultats, podium.
import { speak, stopSpeaking } from '../speech';
import { Rich } from '../components/Rich';
import { useEffect, useMemo, useRef, useState } from 'react';
import { appUrl, Confetti, go, QR, ReactionsLayer, Timer, type FloatingReaction } from '../components/common';
import { qlookOf, resolveLook, Styled } from '../style';
import { Results, StageAnswers, StageMedia } from '../components/results';
import { MediaView } from '../components/MediaPlayer';
import { clearSavedGame, HostGame, loadSavedGame, newPin, type HostSnapshot } from '../game/host';
import { openTransport } from '../net/transport';
import { isScored, QT, questionProblems } from '../qtypes';
import { play, playPodiumJingle, setMusicEnabled, setSoundEnabled, setSoundPack, startMusic, startQuestionMusic, stopMusic } from '../sfx';
import { getQuiz, saveQuiz, saveReport } from '../storage';
import { themeStyle } from '../themes';
import { DEFAULT_SETTINGS, type GameSettings, type Quiz } from '../types';
import { download, uid } from '../util';

export function HostPage({ quizId, preview }: { quizId: string; preview?: { pin: string; q: number } }) {
  const [quiz, setQuiz] = useState<Quiz | null | undefined>(undefined);
  const [game, setGame] = useState<HostGame | null>(null);
  useEffect(() => { getQuiz(quizId).then((q) => setQuiz(q ?? null)); }, [quizId]);
  useEffect(() => () => { game?.destroy(); stopMusic(); }, [game]);
  // aperçu (éditeur) : mode test, son coupé, ordre d'origine, ouverture directe sur la question demandée
  useEffect(() => {
    if (!preview || !quiz || game || !quiz.questions.length) return;
    const settings: GameSettings = { ...DEFAULT_SETTINGS, ...quiz.settings, shuffleQuestions: false, sounds: false, music: false };
    setSoundEnabled(false);
    setMusicEnabled(false);
    setSoundPack(quiz.style?.soundPack);
    const g = new HostGame(quiz, settings, openTransport(preview.pin, true), { pin: preview.pin, local: true, preview: true });
    g.start();
    const q = Math.max(0, Math.min(quiz.questions.length - 1, preview.q));
    if (q > 0) g.goTo(q);
    setGame(g);
  }, [preview, quiz, game]);

  if (quiz === undefined) return <div className="app"><div className="page">Chargement…</div></div>;
  if (quiz === null) return <div className="app" style={themeStyle()}><div className="page">Quiz introuvable. <a href="#/host">Retour</a></div></div>;
  if (!game && preview) return <div className="app" style={themeStyle(quiz.theme)}><div className="page">Préparation de l’aperçu…</div></div>;
  if (!game) {
    return <Setup quiz={quiz} onStart={(settings, local, resume) => {
      const pin = resume?.pin ?? newPin();
      const t = openTransport(pin, resume?.local ?? local);
      void saveQuiz({ ...quiz, settings });
      setSoundEnabled(settings.sounds);
      setMusicEnabled(settings.music);
      setSoundPack(quiz.style?.soundPack);
      setGame(new HostGame(quiz, settings, t, { pin, local: resume?.local ?? local, resume }));
    }} />;
  }
  return <GameScreen game={game} onQuit={() => { game.destroy(); stopMusic(); go('/host'); }} />;
}

// ---------------- Préparation ----------------
function Setup({ quiz, onStart }: { quiz: Quiz; onStart: (s: GameSettings, local: boolean, resume?: HostSnapshot) => void }) {
  const [s, setS] = useState<GameSettings>({ ...DEFAULT_SETTINGS, ...quiz.settings });
  const [local, setLocal] = useState(false);
  const saved = useMemo(() => loadSavedGame(quiz.id), [quiz.id]);
  const problems = quiz.questions.map((q, i) => ({ i, p: questionProblems(q) })).filter((x) => x.p.length);
  const set = <K extends keyof GameSettings>(k: K, v: GameSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const Check = ({ k, label, help }: { k: keyof GameSettings; label: string; help?: string }) => (
    <label className="check"><input type="checkbox" checked={!!s[k]} onChange={(e) => set(k, e.target.checked as never)} /> <span>{label}{help && <span className="muted small"> — {help}</span>}</span></label>
  );
  return (
    <Styled look={resolveLook(quiz.theme, quiz.style)}>
      <div className="page" style={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
        <div className="row" style={{ marginBottom: 16 }}>
          <button className="btn btn-ghost" onClick={() => go('/host')}>← Mes quiz</button>
          <span className="spacer" />
          <button className="btn" onClick={() => go(`/edit/${quiz.id}`)}>Modifier le quiz</button>
        </div>
        <div className="card col anim-pop">
          <h1>{quiz.title || 'Quiz sans titre'}</h1>
          <div className="muted">{quiz.questions.length} question{quiz.questions.length > 1 ? 's' : ''}</div>
          {saved && (
            <div className="card" style={{ background: 'var(--bg2)' }}>
              <b>Une partie est en cours</b> (code {saved.pin}, {Object.keys(saved.players).length} joueurs, question {saved.idx + 1}).
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => onStart(saved.settings, saved.local, saved)}>Reprendre cette partie</button>
                <button className="btn" onClick={() => { clearSavedGame(quiz.id); location.reload(); }}>L’abandonner</button>
              </div>
            </div>
          )}
          {problems.length > 0 && (
            <div className="problems">⚠ À corriger : {problems.map((x) => `question ${x.i + 1} (${x.p[0]})`).join(' ; ')}</div>
          )}
          <h3 style={{ marginTop: 8 }}>Options de la partie</h3>
          <Check k="showOnPhones" label="Questions et réponses affichées sur les téléphones" help="sinon seulement les lettres, il faut regarder l’écran" />
          <Check k="speedBonus" label="Bonus de rapidité" help="répondre vite rapporte plus" />
          <Check k="streakBonus" label="Bonus de série" help="+100 par bonne réponse d’affilée" />
          <Check k="autoReveal" label="Révéler dès que tout le monde a répondu" />
          <Check k="leaderboard" label="Classement après chaque question" />
          <Check k="shuffleQuestions" label="Mélanger l’ordre des questions" />
          <Check k="shuffleAnswers" label="Mélanger l’ordre des réponses" />
          <Check k="sounds" label="Sons" />
          <Check k="music" label="Musique d’attente" />
          <div className="row">
            <label className="field" style={{ width: 200 }}>Temps de lecture avant les réponses
              <select className="select" value={s.readTime} onChange={(e) => set('readTime', Number(e.target.value))}>
                {[0, 2, 3, 5, 8].map((v) => <option key={v} value={v}>{v ? `${v} s` : 'aucun'}</option>)}
              </select>
            </label>
            <label className="field" style={{ width: 200 }}>Équipes
              <select className="select" value={s.teams} onChange={(e) => set('teams', Number(e.target.value))}>
                <option value={0}>Chacun pour soi</option>
                {[2, 3, 4].map((v) => <option key={v} value={v}>{v} équipes (réparties automatiquement)</option>)}
              </select>
            </label>
          </div>
          <label className="check small muted"><input type="checkbox" checked={local} onChange={(e) => setLocal(e.target.checked)} /> Mode test sans Internet (les « joueurs » sont d’autres onglets de ce navigateur)</label>
          <button className="btn btn-primary btn-big" disabled={!quiz.questions.length} onClick={() => onStart(s, local)}>Ouvrir la salle d’attente</button>
        </div>
      </div>
    </Styled>
  );
}

// ---------------- Partie ----------------
/** Re-rendu à chaque changement de la partie (et toutes les 4 s : statut en ligne des joueurs). */
function useGame(game: HostGame) {
  const [, setTick] = useState(0);
  useEffect(() => game.subscribe(() => setTick((x) => x + 1)), [game]);
}

function GameScreen({ game, onQuit }: { game: HostGame; onQuit: () => void }) {
  useGame(game);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sound, setSound] = useState(game.s.settings.sounds);
  const reportSaved = useRef(false);
  const s = game.s;
  const q = game.question;
  const pq = q ? game.pubQuestion(q) : undefined;
  const joinUrl = `${appUrl()}#/j/${s.pin}${s.local ? '?l=1' : ''}`;

  useEffect(() => {
    game.onReact = (pid, e) => {
      const id = Math.random();
      setReactions((r) => [...r.slice(-30), { id, e, left: 5 + Math.random() * 90 }]);
      setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2700);
      void pid;
    };
    game.onEvent = (e) => {
      if (e === 'join') play('join');
      else if (e === 'answer') play('answer');
      else if (e === 'tick') play('tick');
      else if (e === 'reveal') play('reveal');
      else if (e === 'start') play('start');
      else if (e === 'buzz') play('buzz');
    };
  }, [game]);

  useEffect(() => {
    const qq = game.question;
    const st = resolveLook(game.quiz.theme, game.quiz.style).style;
    if (s.phase === 'lobby') startMusic(st.music ?? 'calm');
    else if (s.phase === 'question' && qq && qq.type !== 'slide' && qq.type !== 'buzzer' && qq.media?.kind !== 'video' && st.questionMusic !== 'none') startQuestionMusic();
    else if (s.phase !== 'podium') stopMusic();
    if (s.phase === 'podium') {
      playPodiumJingle();
      if (!reportSaved.current) {
        reportSaved.current = true;
        const table = game.resultsTable();
        void saveReport({
          id: uid(), quizId: game.quiz.id, quizTitle: game.quiz.title, date: Date.now(),
          players: table.map(({ name, avatar, score, correct, team }) => ({ name, avatar, score, correct, team })),
          questions: s.order.map((qid) => {
            const qq = game.qs[qid];
            const recs = Object.values(s.answers[qid] ?? {});
            return { title: qq.title, type: qq.type, scored: isScored(qq), answers: recs.length, successRate: isScored(qq) && recs.length ? recs.filter((r) => (r.f ?? 0) >= 0.999).length / recs.length : null };
          }),
          table: table.map((r) => ({ name: r.name, perQ: r.perQ })),
        });
      }
    }
  }, [s.phase, s.idx, game, s.order, s.answers]);

  useEffect(() => { setShowAnswer(false); }, [s.idx]);

  // ---- lecture des vidéos / blind test ----
  const [userPaused, setUserPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => { setUserPaused(false); setShowVideo(false); }, [s.idx]);

  // ---- lecture à voix haute : une fois quand la question s'affiche ----
  const spokenIdx = useRef(-1);
  useEffect(() => {
    if ((s.phase === 'ready' || s.phase === 'question') && q?.speech && spokenIdx.current !== s.idx && sound) {
      spokenIdx.current = s.idx;
      speak(q.speech.text, q.speech.lang);
    }
    if (s.phase !== 'ready' && s.phase !== 'question') stopSpeaking();
  }, [s.phase, s.idx, q, sound]);
  useEffect(() => () => stopSpeaking(), []);
  const hasVideo = q?.media?.kind === 'video';
  const buzzing = q?.type === 'buzzer' && (s.buzz.queue.length > 0 || !!s.buzz.winner);
  // pause : bouton de l'animateur, pause de la partie, ou quelqu'un a buzzé (reprend si sa réponse est fausse)
  const mediaPaused = hasVideo ? userPaused || s.pausedLeft !== undefined || buzzing : undefined;
  const mediaControl = { paused: mediaPaused, restartKey, reveal: showVideo };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); game.next(); }
      if (e.key === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game]);

  const players = game.ranking();
  const online = players.filter((p) => game.isOnline(p));
  const total = q ? (s.sub === 'vote' ? Math.max(20, Math.round(q.time / 2)) : s.phase === 'ready' ? s.settings.readTime : q.time) * 1000 : 0;

  const nextLabel: Record<string, string> = {
    lobby: 'Commencer', ready: 'Afficher les réponses', question: q?.type === 'slide' ? 'Suivant' : s.sub === 'ideas' ? 'Passer au vote' : 'Révéler',
    reveal: 'Suivant', leaderboard: 'Question suivante', podium: '',
  };

  const controls = (
    <div className="stage-bottom">
      <span className="chip" title="Connexion">{game.status === 'online' ? '🟢' : '🟠'} {s.local ? 'mode test' : 'en ligne'}</span>
      <span className="chip">Code {s.pin}</span>
      <button className="btn btn-sm" onClick={toggleFullscreen} title="Plein écran (F)">⛶</button>
      <button className="btn btn-sm" onClick={() => { setSoundEnabled(!sound); setSound(!sound); }}>{sound ? '🔊' : '🔇'}</button>
      {s.phase === 'question' && hasVideo && (
        <>
          <button className="btn btn-sm" onClick={() => setUserPaused((x) => !x)}>{mediaPaused ? '▶ Son' : '⏸ Son'}</button>
          <button className="btn btn-sm" onClick={() => { setUserPaused(false); setRestartKey((k) => k + 1); }}>↺ Rejouer l’extrait</button>
          {q?.media?.audioOnly && <button className="btn btn-sm" onClick={() => setShowVideo((x) => !x)}>{showVideo ? '🙈 Cacher la vidéo' : '👁 Montrer la vidéo'}</button>}
        </>
      )}
      {(s.phase === 'question' || s.phase === 'ready') && q?.speech && <button className="btn btn-sm" onClick={() => speak(q.speech!.text, q.speech!.lang)}>🗣 Réécouter</button>}
      {(s.phase === 'question' || s.phase === 'ready') && q?.type !== 'slide' && (
        <>
          {(s.endsAt > 0 || s.pausedLeft !== undefined) && <button className="btn btn-sm" onClick={() => game.togglePause()}>{s.pausedLeft !== undefined ? '▶ Reprendre' : '⏸ Pause'}</button>}
          <button className="btn btn-sm" onClick={() => game.addTime(10)}>+10 s</button>
        </>
      )}
      <span className="spacer" />
      {s.phase !== 'podium' && s.phase !== 'lobby' && <button className="btn btn-sm btn-ghost" onClick={() => { if (confirm('Terminer la partie maintenant et afficher le podium ?')) game.endGame(); }}>Terminer</button>}
      {s.phase !== 'podium' && (
        <button className="btn btn-primary btn-big" onClick={() => game.next()} disabled={s.phase === 'lobby' && !players.length}>
          {nextLabel[s.phase]} →
        </button>
      )}
    </div>
  );

  const inQuestion = s.phase === 'ready' || s.phase === 'question' || s.phase === 'reveal';
  const look = resolveLook(game.quiz.theme, game.quiz.style, inQuestion && q ? qlookOf(q) : undefined);
  const logo = look.logo ? <img src={look.logo} alt="" className="stage-logo" /> : null;

  return (
    <Styled look={look} attrs={{ 'data-phase': s.phase, 'data-qtype': q?.type }}>
      <ReactionsLayer items={reactions} />
      <div key={`${s.phase}:${s.idx}:${s.sub ?? ''}`} className={`stage tr-${look.transition}`}>
        {s.phase === 'lobby' && (
          <>
            <div className="stage-top">
              {logo ?? <span className="logo">Ou<b>izz</b></span>}
              <span className="spacer" />
              <button className="btn btn-sm btn-ghost" onClick={onQuit}>Quitter</button>
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 30 }}>
              <div className="pin-box anim-pop">
                <div>
                  <div className="muted">Va sur <b>{appUrl().replace(/^https?:\/\//, '')}</b> ou scanne le QR code</div>
                  <div className="muted">Code de la partie :</div>
                  <div className="pin">{s.pin.slice(0, 3)} {s.pin.slice(3)}</div>
                </div>
                <QR text={joinUrl} size={210} />
              </div>
            </div>
            <h1 className="center">{game.quiz.title}</h1>
            {look.style.lobbyMessage && <div className="center anim-fade" style={{ fontSize: '1.3em', whiteSpace: 'pre-wrap' }}>{look.style.lobbyMessage}</div>}
            <div className="center" style={{ fontSize: '1.4em', fontWeight: 800 }}>{players.length} joueur{players.length > 1 ? 's' : ''} {players.length === 0 && <span className="muted">— en attente…</span>}</div>
            <div className="players">
              {players.map((p) => (
                <div key={p.pid} className={`player-chip anim-pop ${game.isOnline(p) ? '' : 'off'}`} title="Cliquer pour retirer ce joueur"
                  style={p.team !== undefined ? { borderColor: game.teamScores().find((t) => t.id === p.team)?.color, borderWidth: 3 } : undefined}
                  onClick={() => { if (confirm(`Retirer ${p.name} de la partie ?`)) game.kick(p.pid); }}>
                  <span className="av">{p.avatar}</span>{p.name}
                </div>
              ))}
            </div>
            <div className="spacer" />
            {s.local && <div className="center small muted">Mode test : ouvre <a href={joinUrl} target="_blank" rel="noreferrer">ce lien</a> dans d’autres onglets pour simuler des joueurs.</div>}
            {controls}
          </>
        )}

        {s.phase === 'ready' && q && (
          <>
            <div className="stage-top">{logo}<span className="chip">Question {s.idx + 1}/{s.order.length}</span><span className="spacer" />{q.points === 2 && <span className="badge">Points doublés ×2</span>}</div>
            <div className="stage-body col" style={{ flexDirection: 'column' }}>
              <div className="anim-pop" style={{ fontSize: '4em' }}>{QT[q.type].icon}</div>
              <div className="chip anim-slide" style={{ fontSize: '1.2em' }}>{QT[q.type].label}</div>
              <div className="stage-title anim-slide d2" style={{ maxWidth: 1100 }}><Rich text={q.title} /></div>
              <Timer endsAt={s.endsAt} total={total} paused={s.pausedLeft} size={80} />
            </div>
            {controls}
          </>
        )}

        {s.phase === 'question' && q && pq && (
          <>
            <div className="stage-top">
              {logo}
              <span className="chip">{q.type === 'slide' ? 'Diapositive' : `Question ${s.idx + 1}/${s.order.length}`}</span>
              {q.type !== 'slide' && <span className="chip">{QT[q.type].icon} {QT[q.type].label}{s.sub === 'vote' ? ' — vote' : ''}</span>}
              {q.points === 2 && <span className="badge">×2</span>}
              <span className="spacer" />
              {q.type !== 'slide' && q.type !== 'buzzer' && <div className="counter"><b>{Object.keys(game.currentAnswers).length}</b>réponse{Object.keys(game.currentAnswers).length > 1 ? 's' : ''} / {online.length}</div>}
              {(s.endsAt > 0 || s.pausedLeft !== undefined) && <Timer endsAt={s.endsAt} total={total} paused={s.pausedLeft} />}
            </div>
            {(q.title || q.type !== 'slide') && <div className="stage-title anim-down"><Rich text={q.title} /></div>}
            <div className={`stage-body layout-${look.layout}`}>
              <StageMedia q={q} control={mediaControl} />
              {q.type === 'slide' && q.body && <div className="card anim-slide" style={{ fontSize: '1.5em', whiteSpace: 'pre-wrap', maxWidth: 1100 }}><Rich text={q.body} /></div>}
              {q.type === 'buzzer' ? (
                <BuzzPanel game={game} showAnswer={showAnswer} onToggle={() => setShowAnswer((x) => !x)} />
              ) : ['poll', 'wordcloud', 'open', 'scale', 'ranking', 'points100'].includes(q.type) && Object.keys(game.currentAnswers).length > 0 ? (
                <Results game={game} q={q} pq={pq} reveal={false} />
              ) : q.type === 'brainstorm' ? (
                s.sub === 'vote' ? <Results game={game} q={q} pq={pq} reveal={false} /> : <div className="big-emoji">💡 {Object.keys(game.currentAnswers).length}</div>
              ) : q.type === 'draw' ? (
                <div className="big-emoji anim-pulse">🎨</div>
              ) : (
                <StageAnswers q={q} pq={pq} />
              )}
            </div>
            {controls}
          </>
        )}

        {s.phase === 'reveal' && q && pq && (
          <>
            <div className="stage-top">
              {logo}
              <span className="chip">Question {s.idx + 1}/{s.order.length}</span>
              <span className="chip">{QT[q.type].icon} {QT[q.type].label}</span>
              <span className="spacer" />
              <div className="counter"><b>{Object.keys(game.answersFor(q.id)).length}</b>réponses</div>
            </div>
            <div className="stage-title"><Rich text={q.title} /></div>
            <div className="stage-body" style={{ flexDirection: 'column' }}>
              {q.media?.kind === 'video' && q.media.audioOnly && q.media.revealVideo && <MediaView media={{ ...q.media, audioOnly: false }} />}
              <Results game={game} q={q} pq={pq} reveal />
              {q.note && <div className="card anim-slide" style={{ maxWidth: 900 }}>💡 {q.note}</div>}
            </div>
            {controls}
          </>
        )}

        {s.phase === 'leaderboard' && (
          <>
            <div className="stage-top"><h1>Classement</h1><span className="spacer" /><span className="chip">après {s.idx + 1} question{s.idx ? 's' : ''}</span></div>
            <div className="stage-body" style={{ flexDirection: 'column', justifyContent: 'flex-start' }}>
              {s.settings.teams > 0 && <TeamBoard game={game} />}
              <Leaderboard game={game} />
            </div>
            {controls}
          </>
        )}

        {s.phase === 'podium' && <Podium game={game} onQuit={onQuit} />}
      </div>
    </Styled>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

function BuzzPanel({ game, showAnswer, onToggle }: { game: HostGame; showAnswer: boolean; onToggle: () => void }) {
  const b = game.s.buzz;
  const q = game.question!;
  const first = b.queue[0] ? game.s.players[b.queue[0]] : null;
  return (
    <div className="col" style={{ alignItems: 'center', gap: 16 }}>
      {first ? (
        <div className="card center anim-pop" style={{ minWidth: 340 }}>
          <div style={{ fontSize: '4em' }}>{first.avatar}</div>
          <h2>{first.name} a buzzé !</h2>
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <button className="btn btn-big" style={{ background: '#20b486', color: '#fff' }} onClick={() => { play('correct'); game.judgeBuzz(true); }}>✔ Bonne réponse</button>
            <button className="btn btn-big" style={{ background: '#e03131', color: '#fff' }} onClick={() => { play('wrong'); game.judgeBuzz(false); }}>✘ Mauvaise</button>
          </div>
        </div>
      ) : <div className="big-emoji anim-pulse">🔔</div>}
      {b.queue.length > 1 && <div className="muted">Ensuite : {b.queue.slice(1).map((pid) => game.s.players[pid]?.name).join(', ')}</div>}
      {b.locked.length > 0 && <div className="muted small">Éliminés : {b.locked.map((pid) => game.s.players[pid]?.name).join(', ')}</div>}
      {q.buzzAnswer && <button className="btn btn-sm btn-ghost" onClick={onToggle}>{showAnswer ? `Réponse : ${q.buzzAnswer}` : '👁 Voir la réponse (pour toi)'}</button>}
    </div>
  );
}

function Leaderboard({ game }: { game: HostGame }) {
  const list = game.ranking().slice(0, 10);
  return (
    <div className="lb">
      {list.map((p, i) => (
        <div key={p.pid} className="lb-row anim-slide" style={{ animationDelay: `${i * 0.07}s`, background: i === 0 ? 'var(--accent)' : undefined, color: i === 0 ? '#fff' : undefined }}>
          <span className="rank" style={i === 0 ? { color: '#fff' } : undefined}>{i + 1}</span>
          <span style={{ fontSize: '1.3em' }}>{p.avatar}</span>
          <span className="grow">{p.name} {p.streak >= 2 && <span className="small">🔥{p.streak}</span>}</span>
          {p.lastGain > 0 && <span className="gain" style={i === 0 ? { color: '#fff' } : undefined}>+{p.lastGain}</span>}
          {p.prevRank > i + 1 && <span className="small">▲{p.prevRank - (i + 1)}</span>}
          <span>{p.score}</span>
        </div>
      ))}
    </div>
  );
}

function TeamBoard({ game }: { game: HostGame }) {
  const teams = game.teamScores();
  return (
    <div className="row" style={{ justifyContent: 'center', marginBottom: 10 }}>
      {teams.map((t, i) => (
        <div key={t.id} className="card center anim-pop" style={{ borderTop: `6px solid ${t.color}`, minWidth: 160 }}>
          <div className="muted small">{i + 1}{i ? 'e' : 're'} · {t.members} joueur{t.members > 1 ? 's' : ''}</div>
          <div style={{ fontWeight: 900, fontSize: '1.4em', color: t.color }}>{t.name}</div>
          <div style={{ fontWeight: 800 }}>{t.score} pts</div>
        </div>
      ))}
    </div>
  );
}

function Podium({ game, onQuit }: { game: HostGame; onQuit: () => void }) {
  const [table, setTable] = useState(false);
  const r = game.ranking();
  const order = [r[1], r[0], r[2]];
  const heights = ['32vh', '42vh', '24vh'];
  const exportCsv = () => {
    const rows = game.resultsTable();
    const head = ['Rang', 'Joueur', 'Score', 'Bonnes réponses', ...game.s.order.map((qid, i) => `Q${i + 1} ${game.qs[qid].title.replace(/[;\n]/g, ' ')}`)];
    const lines = rows.map((x, i) => [i + 1, x.name, x.score, x.correct, ...x.perQ.map((v) => (v === null ? '' : v))].join(';'));
    download(`resultats-${game.quiz.title || 'quiz'}.csv`, '﻿' + [head.join(';'), ...lines].join('\n'), 'text/csv');
  };
  return (
    <>
      {game.quiz.style?.confettiOnPodium !== false && <Confetti />}
      <div className="stage-top"><h1>🏆 {game.quiz.title}</h1><span className="spacer" />
        <button className="btn btn-sm" onClick={() => setTable((x) => !x)}>{table ? 'Podium' : 'Tous les résultats'}</button>
        <button className="btn btn-sm" onClick={exportCsv}>Exporter (Excel/CSV)</button>
        <button className="btn btn-sm" onClick={onQuit}>Terminer</button>
      </div>
      {game.s.settings.teams > 0 && <TeamBoard game={game} />}
      {game.quiz.style?.endMessage && <div className="center anim-slide" style={{ fontSize: '1.4em', fontWeight: 700, whiteSpace: 'pre-wrap' }}>{game.quiz.style.endMessage}</div>}
      {!table ? (
        <div className="stage-body" style={{ alignItems: 'flex-end' }}>
          <div className="podium">
            {order.map((p, i) => p ? (
              <div key={p.pid} className="step anim-rise" style={{ height: heights[i], animationDelay: `${[0.8, 1.6, 0][i]}s`, borderTop: `8px solid ${['#adb5bd', '#f4b400', '#cd7f32'][i]}` }}>
                <div className="av anim-pop" style={{ animationDelay: `${[1.2, 2, 0.4][i]}s` }}>{p.avatar}</div>
                <div style={{ fontSize: '1.4em' }}>{p.name}</div>
                <div className="muted">{p.score} pts</div>
                <div style={{ fontSize: '2.5em', marginTop: 'auto' }}>{['🥈', '🥇', '🥉'][i]}</div>
              </div>
            ) : <div key={i} style={{ width: 'min(200px, 28vw)' }} />)}
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="results">
            <thead><tr><th>#</th><th>Joueur</th><th>Score</th><th>Bonnes</th>{game.s.order.map((qid, i) => <th key={qid} title={game.qs[qid].title}>Q{i + 1}</th>)}</tr></thead>
            <tbody>
              {game.resultsTable().map((x, i) => (
                <tr key={x.pid}><td>{i + 1}</td><td>{x.avatar} {x.name}</td><td><b>{x.score}</b></td><td>{x.correct}</td>{x.perQ.map((v, k) => <td key={k}>{v === null ? '–' : v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
