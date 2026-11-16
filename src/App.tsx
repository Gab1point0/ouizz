import { useHashRoute } from './components/common';
import { EditorPage } from './pages/Editor';
import { HostPage } from './pages/Host';
import { LibraryPage } from './pages/Library';
import { PlayerPage } from './pages/Player';

// Adresses :
//   #/            -> rejoindre une partie (téléphones)
//   #/j/123456    -> rejoindre directement (lien du QR code) ; ?l=1 = mode test local
//   #/host        -> mes quiz (animateur)
//   #/edit/<id>   -> éditeur
//   #/run/<id>    -> lancer une partie
export function App() {
  const { path, query } = useHashRoute();
  const [page, arg] = path;
  const local = query.get('l') === '1';
  switch (page) {
    case 'host': return <LibraryPage />;
    case 'edit': return <EditorPage key={arg} quizId={arg} />;
    case 'run': return <HostPage key={arg} quizId={arg} />;
    case 'j': return <PlayerPage key={arg} pin={arg} local={local} />;
    default: return <PlayerPage local={local} />;
  }
}
