# Ouizz — notes pour Claude

Quiz en direct entre amis (≤ 15 joueurs) façon Kahoot / Wayground / Mentimeter, mais libre et gratuit.
Un **grand écran** (animateur, PC/TV) + les **téléphones** des joueurs (QR code → `#/j/<PIN>`). Interface en français.
Propriétaire non-développeur → explications simples en français.

## Stack
Vite + React 19 + TypeScript, pas de routeur (hash maison dans `components/common.tsx`), pas de framework CSS.
Temps réel : **Supabase Realtime, canal broadcast `ouizz:<PIN>`** (aucune table, aucune donnée stockée côté serveur).
Projet Supabase utilisé : celui de Road2Fit (`vvsmienmspftdzqykhnt`, toujours actif donc jamais en pause) — URL + clé publishable dans `src/config.ts`.
Quiz stockés dans le navigateur de l'animateur (IndexedDB via idb-keyval, `src/storage.ts`) + export/import `.ouizz.json`.
**Sauvegarde en ligne** (`src/cloud.ts`) : table `public.ouizz_quizzes` du même projet, fermée (RLS sans politique) ; accès seulement par les fonctions `ouizz_list/get/put/delete(secret, …)` avec un « code de sauvegarde » `ouizz-xxxx-…` (seule son empreinte SHA-256 est stockée). SQL : `supabase/ouizz-cloud.sql`. Chaque `saveQuiz`/`deleteQuiz` part en ligne 2,5 s après (le plus récent `updatedAt` gagne, suppressions = pierres tombales) ; « Mes quiz » fait un `pull()` à l'ouverture. Les rapports de parties ne sont pas synchronisés.

## Architecture
- `src/types.ts` : modèle `Quiz` / `Question` (un seul type avec champs optionnels par type de question) + `GameSettings`.
- `src/qtypes.ts` : **registre des 19 types** (label, icône, groupe, valeurs par défaut, validation). Ajouter un type = une entrée ici + `grade()` dans `scoring.ts` + saisie téléphone dans `components/answers.tsx` + résultats dans `components/results.tsx` + éditeur dans `pages/Editor.tsx` (TypeEditor) + `pubQuestion()`/`pubReveal()` dans `game/host.ts`.
- `src/scoring.ts` : `grade(q, réponse)` → fraction 0..1 (null = non noté) ; `computePoints` (1000 × multiplicateur × fraction × bonus rapidité jusqu'à −50 %, + série).
- `src/game/host.ts` : **moteur autoritaire** côté animateur (`HostGame`). Phases `lobby → ready → question → reveal → leaderboard → … → podium`. Diffuse un état public (`PubState`, sans les bonnes réponses avant la révélation) à chaque changement + toutes les 4 s. Images envoyées à part (`media`, réduites < 200 ko, limite Supabase ~256 ko/message). Sauvegarde dans localStorage → reprise si la page de l'animateur est rechargée.
- `src/net/protocol.ts` (messages), `src/net/transport.ts` (Supabase ou BroadcastChannel « mode test » entre onglets).
- `src/pages/Player.tsx` (téléphone, identité gardée par PIN → reconnexion automatique), `Host.tsx` (grand écran), `Editor.tsx`, `Library.tsx`.
- Style : `src/styles/base.css` + `animations.css` (classes `.anim-*`, décors `.deco-*`). Thèmes = variables CSS dans `src/themes.ts`. Attributs `data-phase` / `data-qtype` sur `.app` pour styler par phase ou type.
- **Apparence** : `src/style.tsx` (`resolveLook(thème, quiz.style, question.look)` → variables CSS, classes, fond, décor, transition, chrono, étiquettes ; polices Google chargées à la demande ; composant `Styled`). Modèle `QuizStyle` / `QuestionLook` dans `types.ts`. 16 thèmes prêts dans `themes.ts` (vars + réglages). Éditeur : `components/Appearance.tsx` (onglets + aperçu en direct, thèmes perso en localStorage) et `QuestionLookEditor` dans `Editor.tsx`. Les téléphones reçoivent `PubState.style` et `PubQuestion.look` (images → « media:clé », envoyées par messages `media`). L'interface de l'éditeur garde une police système (`--q-font` pour la question).
- **Vidéos / blind test** : `components/MediaPlayer.tsx`. `Media.audioOnly` = vidéo jouée cachée (lecteur 220 px quasi transparent, exigence YouTube) + égaliseur animé ; `revealVideo`, `start`/`end`. Contrôle YouTube par postMessage (`enablejsapi=1`). Sur le grand écran : ⏸ Son, ↺ Rejouer l’extrait, 👁 Montrer la vidéo ; pause automatique dès qu'un joueur buzze, reprise si réponse fausse. Test : `node .tmp/blind-test.mjs` (non versionné).
- Sons : `src/sfx.ts`. Musiques = vrais MP3 créés avec Gemini dans `public/music/` (attente-calme/festive/retro/suspense/lounge, podium ; « réflexion » pendant les questions réutilise attente-suspense en attendant un morceau dédié), lus en boucle avec fondu ; repli sur les boucles synthétisées si un fichier manque. Bruitages synthétisés (packs). Skill perso `gemini-media-auto` pour en générer d'autres.

## Vérifier
- `npm test` (notation, import texte), `npx tsc --noEmit`, `npm run build`.
- Partie complète automatisée : serveur de dev lancé (entrée `ouizz` de `Claude dump/.claude/launch.json`, port 5200) puis
  `node tests/e2e.mjs http://localhost:5200/ 4` (Supabase réel) ou `... 3 --local` (sans réseau). Captures dans `.tmp/shots/`.
  Sauvegarde entre deux navigateurs : `node tests/cloud-e2e.mjs` (supprimer ensuite les lignes de test dans `ouizz_quizzes`).
  Les joueurs répondent l'un après l'autre (bringToFront) : les clics CDP bloquent sur les onglets en arrière-plan.

## Déploiement
Dépôt public `Gab1point0/ouizz` ; un push sur `main` redéploie https://gab1point0.github.io/ouizz/ (`.github/workflows/deploy.yml`, tests + build).
Commits avec l'identité noreply `178399332+Gab1point0@users.noreply.github.com`.
