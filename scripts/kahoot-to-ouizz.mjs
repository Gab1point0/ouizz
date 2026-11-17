// Convertit un Kahoot (JSON) en fichier .ouizz.json à importer dans Ouizz (« Importer »).
// usage : node scripts/kahoot-to-ouizz.mjs <kahoot.json> <sortie.ouizz.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const [, , input, output] = process.argv;
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { kahootToQuiz } = await server.ssrLoadModule('/src/kahoot.ts');
  const { exportQuizzes } = await server.ssrLoadModule('/src/storage.ts');
  const { quiz, skipped } = kahootToQuiz(JSON.parse(readFileSync(input, 'utf8')));
  writeFileSync(output, exportQuizzes([quiz]));
  const count = {};
  for (const q of quiz.questions) count[q.type] = (count[q.type] ?? 0) + 1;
  console.log(`${quiz.title} : ${quiz.questions.length} questions`, count, skipped.length ? `ignorées : ${skipped.join(', ')}` : '');
} finally {
  await server.close();
}
