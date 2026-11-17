// Accueil de l'animateur : mes quiz, import/export, historique des parties.
import { plain } from '../components/Rich';
import { useEffect, useState } from 'react';
import { cloudState, disableCloud, enableCloud, getCloudKey, newCloudKey, onCloudChange, pull } from '../cloud';
import { go, Modal } from '../components/common';
import { parseQuizText, TEXT_FORMAT_HELP } from '../importText';
import { QT } from '../qtypes';
import { makeSampleQuiz } from '../sampleQuiz';
import { deleteQuiz, deleteReport, duplicateQuiz, exportQuizzes, importQuizzes, listQuizzes, listReports, saveQuiz, type Report } from '../storage';
import { themeStyle } from '../themes';
import { resolveLook } from '../style';
import type { Quiz } from '../types';
import { download, pickFile, uid } from '../util';

export function newQuiz(): Quiz {
  return { id: uid(), title: '', theme: 'craie', questions: [], createdAt: Date.now(), updatedAt: Date.now() };
}

export function LibraryPage() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [textOpen, setTextOpen] = useState(false);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [cloudOpen, setCloudOpen] = useState(false);
  const cloud = useCloud();
  const reload = () => listQuizzes().then(setQuizzes);
  useEffect(() => {
    void reload();
    // récupère ce qui a été modifié sur un autre appareil
    if (getCloudKey()) void pull().then((n) => { if (n) void reload(); });
  }, []);

  const create = async () => {
    const q = newQuiz();
    await saveQuiz(q);
    go(`/edit/${q.id}`);
  };
  const addSample = async () => {
    const q = makeSampleQuiz();
    await saveQuiz(q);
    await reload();
  };
  const importFile = async () => {
    const f = await pickFile('.json,application/json');
    if (!f) return;
    try {
      const list = await importQuizzes(await f.text());
      alert(`${list.length} quiz importé${list.length > 1 ? 's' : ''}.`);
      await reload();
    } catch { alert('Ce fichier n’est pas un quiz Ouizz valide.'); }
  };

  return (
    <div className="app" style={themeStyle('craie')}>
      <div className="toolbar">
        <span className="logo">Ou<b>izz</b></span>
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={() => go('/')}>Rejoindre une partie</button>
        <button className="btn btn-ghost" onClick={() => listReports().then(setReports)}>Historique</button>
        <button className="btn" onClick={() => setCloudOpen(true)} title={cloud.error ?? ''}>{CLOUD_LABEL[cloud.status]}</button>
        <button className="btn" onClick={importFile} title="Fichier .ouizz.json, ou un Kahoot converti en JSON">Importer</button>
        <button className="btn" onClick={() => setTextOpen(true)}>Créer depuis du texte</button>
        <button className="btn btn-primary" onClick={create}>+ Nouveau quiz</button>
      </div>
      <div className="page">
        <div className="row" style={{ marginBottom: 14 }}>
          <h2>Mes quiz</h2>
          <span className="spacer" />
          {quizzes && quizzes.length > 0 && <button className="btn btn-sm btn-ghost" onClick={() => download('mes-quiz.ouizz.json', exportQuizzes(quizzes))}>Tout exporter (sauvegarde)</button>}
        </div>
        {quizzes === null && <div className="spinner" />}
        {quizzes?.length === 0 && (
          <div className="card center col" style={{ alignItems: 'center', padding: 40 }}>
            <div style={{ fontSize: '3em' }}>🎲</div>
            <h3>Aucun quiz pour l’instant</h3>
            <div className="muted">Crée ton premier quiz, ou essaie le quiz de démonstration qui montre tous les types de questions.</div>
            <div className="row"><button className="btn btn-primary" onClick={create}>Créer un quiz</button><button className="btn" onClick={addSample}>Ajouter le quiz de démonstration</button></div>
          </div>
        )}
        <div className="quiz-grid">
          {quizzes?.map((q) => {
            const cover = q.cover?.src ?? q.questions.find((x) => x.media?.kind === 'image')?.media?.src;
            const types = [...new Set(q.questions.map((x) => QT[x.type]?.icon))].slice(0, 8).join(' ');
            return (
              <div key={q.id} className="card quiz-card anim-pop" style={{ ...resolveLook(q.theme, q.style).vars, fontFamily: 'var(--font)' }}>
                <div className="quiz-cover" style={{ background: 'var(--bg)' }}>{cover ? <img src={cover} alt="" /> : '❓'}</div>
                <b style={{ color: 'var(--fg)' }}>{plain(q.title) || 'Sans titre'}</b>
                <div className="small muted">{q.questions.length} question{q.questions.length > 1 ? 's' : ''} · {types}</div>
                <div className="row">
                  <button className="btn btn-primary grow" onClick={() => go(`/run/${q.id}`)} disabled={!q.questions.length}>▶ Jouer</button>
                  <button className="btn" onClick={() => go(`/edit/${q.id}`)}>Modifier</button>
                  <button className="btn icon-btn" onClick={() => setMenu(menu === q.id ? null : q.id)}>⋯</button>
                </div>
                {menu === q.id && (
                  <div className="row anim-fade">
                    <button className="btn btn-sm" onClick={async () => { await duplicateQuiz(q); setMenu(null); await reload(); }}>Dupliquer</button>
                    <button className="btn btn-sm" onClick={() => download(`${(q.title || 'quiz').replace(/[^\w\- ]+/g, '')}.ouizz.json`, exportQuizzes([q]))}>Exporter</button>
                    <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm(`Supprimer « ${q.title || 'Sans titre'} » ? (définitif)`)) { await deleteQuiz(q.id); await reload(); } }}>Supprimer</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {quizzes && quizzes.length > 0 && !quizzes.some((q) => q.title === makeSampleQuiz().title) && (
          <div className="center" style={{ marginTop: 20 }}><button className="btn btn-sm btn-ghost" onClick={addSample}>+ Ajouter le quiz de démonstration</button></div>
        )}
        <p className="small muted center" style={{ marginTop: 30 }}>
          {cloud.status === 'off'
            ? <>Les quiz sont enregistrés dans ce navigateur seulement. <a href="#" onClick={(e) => { e.preventDefault(); setCloudOpen(true); }}>Active la sauvegarde en ligne</a> pour ne rien perdre et les retrouver sur un autre appareil.</>
            : 'Les quiz sont enregistrés dans ce navigateur et sauvegardés en ligne automatiquement.'}
        </p>
      </div>
      {textOpen && <TextImport onClose={() => setTextOpen(false)} />}
      {cloudOpen && <CloudPanel onClose={() => setCloudOpen(false)} onSynced={reload} />}
      {reports && <Reports reports={reports} onClose={() => setReports(null)} onDelete={async (id) => { await deleteReport(id); setReports(await listReports()); }} />}
    </div>
  );
}

function TextImport({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const parsed = parseQuizText(text);
  const create = async () => {
    const q = { ...newQuiz(), title: title || 'Quiz importé', questions: parsed };
    await saveQuiz(q);
    go(`/edit/${q.id}`);
  };
  return (
    <Modal onClose={onClose}>
      <h2>Créer un quiz depuis du texte</h2>
      <p className="small muted">Une question par bloc (ligne vide entre deux questions). <b>*</b> bonne réponse, <b>-</b> mauvaise réponse, <b>= </b> réponse à taper (ou vrai/faux), <b>&gt;</b> éléments dans l’ordre, <b>?</b> options de sondage, <b>t: 30</b> pour la durée.</p>
      <div className="col">
        <input className="input" placeholder="Titre du quiz" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="textarea" style={{ minHeight: 260, fontFamily: 'ui-monospace, monospace', fontSize: '.9em' }} value={text} placeholder={TEXT_FORMAT_HELP} onChange={(e) => setText(e.target.value)} />
        <div className="small muted">{parsed.length} question{parsed.length > 1 ? 's' : ''} reconnue{parsed.length > 1 ? 's' : ''} : {parsed.map((q) => QT[q.type].icon).join(' ')}</div>
        <div className="row"><button className="btn" onClick={() => setText(TEXT_FORMAT_HELP)}>Voir un exemple</button><span className="spacer" /><button className="btn" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={!parsed.length} onClick={create}>Créer et modifier</button></div>
      </div>
    </Modal>
  );
}

function Reports({ reports, onClose, onDelete }: { reports: Report[]; onClose: () => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Modal onClose={onClose}>
      <div className="row"><h2>Historique des parties</h2><span className="spacer" /><button className="btn btn-sm" onClick={onClose}>Fermer</button></div>
      {!reports.length && <p className="muted">Aucune partie terminée pour l’instant.</p>}
      <div className="col" style={{ marginTop: 10 }}>
        {reports.map((r) => (
          <div key={r.id} className="card" style={{ padding: 10 }}>
            <div className="row" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === r.id ? null : r.id)}>
              <b className="grow">{r.quizTitle || 'Sans titre'}</b>
              <span className="small muted">{new Date(r.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} · {r.players.length} joueurs</span>
            </div>
            {open === r.id && (
              <div className="col small" style={{ marginTop: 8 }}>
                <div>🏆 {r.players.slice(0, 3).map((p, i) => `${i + 1}. ${p.avatar} ${p.name} (${p.score})`).join('   ')}</div>
                <table className="results"><thead><tr><th>Question</th><th>Réponses</th><th>Réussite</th></tr></thead>
                  <tbody>{r.questions.map((q, i) => <tr key={i}><td>{QT[q.type as keyof typeof QT]?.icon} {plain(q.title)}</td><td>{q.answers}</td><td>{q.successRate === null ? '–' : `${Math.round(q.successRate * 100)} %`}</td></tr>)}</tbody></table>
                <div className="row"><span className="spacer" /><button className="btn btn-sm btn-danger" onClick={() => onDelete(r.id)}>Supprimer</button></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

const CLOUD_LABEL = { off: '☁ Sauvegarde', syncing: '☁ Envoi…', ok: '☁ Sauvegardé ✓', error: '☁ ⚠ Erreur' } as const;

function useCloud() {
  const [, set] = useState(0);
  useEffect(() => onCloudChange(() => set((x) => x + 1)), []);
  return cloudState();
}

function CloudPanel({ onClose, onSynced }: { onClose: () => void; onSynced: () => void }) {
  const cloud = useCloud();
  const key = getCloudKey();
  const [mode, setMode] = useState<'menu' | 'enter'>('menu');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const run = async (k: string, label: string) => {
    setBusy(true); setMsg('');
    try {
      const n = await enableCloud(k);
      onSynced();
      setMsg(`${label}${n ? ` ${n} quiz récupéré${n > 1 ? 's' : ''} depuis la sauvegarde.` : ''}`);
      setMode('menu');
    } catch (e) {
      setMsg(`Impossible : ${e instanceof Error ? e.message : e}`);
    } finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(key ?? ''); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <Modal onClose={onClose}>
      <div className="row"><h2>☁ Sauvegarde en ligne</h2><span className="spacer" /><button className="btn btn-sm" onClick={onClose}>Fermer</button></div>
      {!key ? (
        mode === 'menu' ? (
          <div className="col" style={{ marginTop: 10 }}>
            <p>Tes quiz sont copiés en ligne automatiquement à chaque modification. Tu les retrouves sur n’importe quel ordinateur avec ton <b>code de sauvegarde</b>.</p>
            <button className="btn btn-primary btn-big" disabled={busy} onClick={() => run(newCloudKey(), 'Sauvegarde activée.')}>Activer (première fois)</button>
            <button className="btn" disabled={busy} onClick={() => setMode('enter')}>J’ai déjà un code de sauvegarde</button>
          </div>
        ) : (
          <form className="col" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); void run(typed, 'Code reconnu.'); }}>
            <label className="field">Ton code de sauvegarde
              <input className="input" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="ouizz-xxxx-xxxx-xxxx-xxxx-xxxx" style={{ fontFamily: 'ui-monospace, monospace' }} />
            </label>
            <div className="row"><button type="button" className="btn" onClick={() => setMode('menu')}>Retour</button><span className="spacer" /><button className="btn btn-primary" disabled={busy || typed.trim().length < 20}>Récupérer mes quiz</button></div>
          </form>
        )
      ) : (
        <div className="col" style={{ marginTop: 10 }}>
          <div>État : <b>{cloud.status === 'ok' ? 'tout est sauvegardé' : cloud.status === 'syncing' ? 'envoi en cours…' : cloud.status === 'error' ? 'problème' : ''}</b>
            {cloud.lastSync && <span className="muted small"> · dernière synchro à {new Date(cloud.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}</div>
          {cloud.error && <div className="problems">{cloud.error}</div>}
          <label className="field">Ton code de sauvegarde
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input className="input" readOnly value={key} onFocus={(e) => e.target.select()} style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }} />
              <button className="btn" onClick={copy}>{copied ? 'Copié ✓' : 'Copier'}</button>
            </div>
          </label>
          <div className="card small" style={{ background: 'var(--bg2)' }}>
            🔑 <b>Note ce code quelque part</b> (carnet, gestionnaire de mots de passe, e-mail à toi-même). C’est la seule clé pour retrouver tes quiz sur un autre appareil ou si ce navigateur est effacé. Ne le donne pas : il permet de modifier tes quiz.
          </div>
          <div className="row">
            <button className="btn" disabled={busy || cloud.status === 'syncing'} onClick={async () => { setBusy(true); const n = await pull(); onSynced(); setBusy(false); setMsg(n ? `${n} quiz mis à jour depuis la sauvegarde.` : 'Tout est à jour.'); }}>Synchroniser maintenant</button>
            <span className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={() => { if (confirm('Arrêter la sauvegarde en ligne sur cet appareil ? (Les quiz déjà sauvegardés restent en ligne ; tu pourras les récupérer avec ton code.)')) disableCloud(); }}>Désactiver sur cet appareil</button>
          </div>
        </div>
      )}
      {msg && <div className="anim-fade" style={{ marginTop: 10, fontWeight: 600 }}>{msg}</div>}
    </Modal>
  );
}
