const fs = require('node:fs');
const path = require('node:path');
const { INITIAL_EXERCISES } = require('../dist-electron/database/seeds/exercise-seeds.js');

const output = path.join(__dirname, '../src/database/seeds/exercise-youtube-links.json');
const ignoredWords = new Set(['com', 'de', 'do', 'da', 'na', 'no', 'para', 'e', 'a', 'o', 'os', 'as', 'em', 'execucao', 'correta', 'como', 'fazer', 'exercicio']);
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreTitle(exerciseName, title) {
  const expected = normalize(exerciseName).split(' ').filter(word => word.length > 2 && !ignoredWords.has(word));
  const available = new Set(normalize(title).split(' '));
  if (expected.length === 0) return 0;
  const matches = expected.filter(word => available.has(word)).length;
  return matches / expected.length;
}

function parseVideoResults(html) {
  const matches = [...html.matchAll(/"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"((?:\\.|[^"])*)"/gs)];
  const seen = new Set();
  return matches.flatMap(match => {
    const id = match[1];
    if (seen.has(id)) return [];
    seen.add(id);
    let title = match[2];
    try { title = JSON.parse(`"${title}"`); } catch { /* conserva o texto escapado recebido */ }
    return [{ id, title }];
  });
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SantoMarombaCatalog/1.0)' },
        signal: AbortSignal.timeout(20000)
      });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error;
    }
    await wait(500 * (attempt + 1));
  }
  throw lastError || new Error('Falha de rede sem detalhes.');
}

async function findEmbeddableVideo(exercise, usedIds) {
  const query = `${exercise.name} execução correta`;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const searchResponse = await fetchWithRetry(searchUrl);
  const candidates = parseVideoResults(await searchResponse.text())
    .map(video => ({ ...video, score: scoreTitle(exercise.name, video.title) }))
    .filter(video => video.score >= 0.34 && !usedIds.has(video.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  for (const candidate of candidates) {
    const watchUrl = `https://www.youtube.com/watch?v=${candidate.id}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    try {
      const response = await fetchWithRetry(oembedUrl, 2);
      const metadata = await response.json();
      if (metadata.title && scoreTitle(exercise.name, metadata.title) >= 0.34) {
        return { id: candidate.id, url: watchUrl, title: metadata.title, score: scoreTitle(exercise.name, metadata.title) };
      }
    } catch {
      // Vídeos privados, removidos ou sem permissão de incorporação são ignorados.
    }
  }
  return null;
}

async function main() {
  const overrides = {
    'ex-supino-reto': 'https://www.youtube.com/watch?v=72UUJVBuT7o'
  };
  const usedIds = new Set(['72UUJVBuT7o']);
  const pending = INITIAL_EXERCISES.filter(exercise => exercise.id !== 'ex-supino-reto');
  let cursor = 0;
  let checked = 1;
  let found = 1;
  const worker = async () => {
    while (cursor < pending.length) {
      const exercise = pending[cursor++];
      try {
        const result = await findEmbeddableVideo(exercise, usedIds);
        if (result) {
          overrides[exercise.id] = result.url;
          usedIds.add(result.id);
          found += 1;
          console.log(`OK ${exercise.name} → ${result.title}`);
        } else {
          console.log(`Sem vídeo direto compatível: ${exercise.name}`);
        }
      } catch (error) {
        console.log(`Busca indisponível para ${exercise.name}: ${error.message}`);
      }
      checked += 1;
      await wait(150);
    }
  };

  await Promise.all(Array.from({ length: 3 }, worker));
  fs.writeFileSync(output, `${JSON.stringify(overrides, null, 2)}\n`, 'utf8');
  console.log(`Links diretos validados: ${found}/${checked}. Mapeamento salvo em ${path.relative(process.cwd(), output)}.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
