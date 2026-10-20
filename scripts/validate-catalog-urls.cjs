const fs = require('node:fs');
const path = require('node:path');
const { INITIAL_EXERCISES } = require('../dist-electron/database/seeds/exercise-seeds.js');
const { INITIAL_FOODS, INITIAL_RECIPES } = require('../dist-electron/database/seeds/nutrition-seeds.js');

const imageUrls = [...new Set([
  ...INITIAL_EXERCISES.map(item => item.imageUrl),
  ...INITIAL_FOODS.map(item => item.imageUrl),
  ...INITIAL_RECIPES.map(item => item.imageUrl)
].filter(Boolean))];
const offlineFallbackFiles = [
  'exercise-peitoral.png', 'exercise-costas.png', 'exercise-ombros.png', 'exercise-biceps.png',
  'exercise-antebracos.png', 'exercise-triceps.png', 'exercise-quadriceps.jpeg', 'exercise-posteriores.png',
  'exercise-gluteos.webp', 'exercise-panturrilhas.png', 'exercise-abdomen.png', 'food-bowl.jpg', 'food-rice-bowl.jpg'
];

function ensureHttps(url, label) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error(`${label}: link não usa HTTPS (${url})`);
  return parsed;
}

async function checkImage(url) {
  const response = await fetch(url, {
    method: 'HEAD',
    headers: { 'User-Agent': 'SantoMaromba-catalog-link-check/1.0' },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`Imagem respondeu HTTP ${response.status}: ${url}`);
  if (!response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`Link de imagem não retornou imagem: ${url}`);
  }
}

async function checkDirectVideo(url) {
  const endpoint = new URL('https://www.youtube.com/oembed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('format', 'json');
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Vídeo não está disponível para incorporação (HTTP ${response.status}): ${url}`);
}

async function main() {
  const allVideos = [...new Set(INITIAL_EXERCISES.map(item => item.youtubeUrl).filter(Boolean))];
  const directVideos = [];
  for (const file of offlineFallbackFiles) {
    const fullPath = path.join(__dirname, '../public/catalog-assets', file);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size < 1000) {
      throw new Error(`Imagem de fallback ausente ou vazia: ${fullPath}`);
    }
  }
  for (const url of imageUrls) ensureHttps(url, 'Imagem');
  for (const url of allVideos) {
    const parsed = ensureHttps(url, 'YouTube');
    if (parsed.hostname !== 'www.youtube.com') throw new Error(`Host de vídeo inesperado: ${url}`);
    if (parsed.pathname === '/results' && !parsed.searchParams.get('search_query')) {
      throw new Error(`Busca do YouTube sem termo: ${url}`);
    }
    if (parsed.pathname === '/watch') directVideos.push(url);
    else if (parsed.pathname !== '/results') throw new Error(`Caminho do YouTube inválido: ${url}`);
  }

  for (let index = 0; index < directVideos.length; index += 3) {
    await Promise.all(directVideos.slice(index, index + 3).map(checkDirectVideo));
  }

  const results = await Promise.allSettled(imageUrls.map(checkImage));
  const failures = results.flatMap((result, index) => result.status === 'rejected'
    ? [`${imageUrls[index]} — ${result.reason.message}`]
    : []);
  if (failures.length) throw new Error(`Links de imagem inválidos:\n${failures.join('\n')}`);

  console.log(`Links verificados: ${imageUrls.length} imagens remotas; ${offlineFallbackFiles.length} imagens locais; ${allVideos.length} URLs do YouTube (${directVideos.length} vídeos diretos).`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
