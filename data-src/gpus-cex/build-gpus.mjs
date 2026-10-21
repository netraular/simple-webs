import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

export function identifyGPU(name) {
  if (/\b(?:egpu|mobile|laptop|max-q)\b/i.test(name)) return null;
  const nvidia = name.match(/\b(RTX|GTX|GTS|GT)\s*(\d{3,4})\s*(TI)?\s*(SUPER)?\b/i);
  if (nvidia) return `${nvidia[1].toUpperCase()} ${nvidia[2]}${nvidia[3] ? ' Ti' : ''}${nvidia[4] ? ' SUPER' : ''}`;
  const vega = name.match(/\bRX\s+Vega\s+(\d+)\b/i);
  if (vega) return `RX Vega ${vega[1]}`;
  const amd = name.match(/\b(RX|R[579]|HD)\s*(\d{3,4})\s*(XT|X)?\b/i);
  return amd ? `${amd[1].toUpperCase()} ${amd[2]}${amd[3] ? amd[3].toUpperCase() === 'XT' ? ' XT' : 'X' : ''}` : null;
}

export async function checkImageHeaders(snapshot, fetchImage = fetch) {
  const images = {};
  for (let offset = 0; offset < snapshot.offers.length; offset += 4) {
    await Promise.all(snapshot.offers.slice(offset, offset + 4).map(async ([id]) => {
      assert.ok(/^[A-Z0-9]+$/.test(id));
      const url = snapshot.images?.[id] || `https://es.static.webuy.com/product_images/Inform%C3%A1tica/Tarjetas%20Graficas%20-%20PCi-E/${encodeURIComponent(id)}_l.jpg`;
      assert.equal(new URL(url).origin, 'https://es.static.webuy.com');
      try {
        const response = await fetchImage(url, {method:'HEAD', signal:AbortSignal.timeout(12000)});
        if (response.ok && /^image\//i.test(response.headers.get('content-type') || '') && new URL(response.url || url).origin === 'https://es.static.webuy.com') images[id] = url;
      } catch (error) {
        console.warn(`Image header check failed: ${id}`);
      }
    }));
  }
  assert.ok(Object.keys(images).length, 'No remote images verified; source capture unchanged');
  return {...snapshot, imagesCheckedAt:new Date().toISOString(), images:Object.fromEntries(snapshot.offers.filter(([id]) => images[id]).map(([id]) => [id, images[id]]))};
}

export function buildCatalogue(snapshot, benchmarks) {
  assert.equal(snapshot.offers.length, snapshot.totalResults, 'Incomplete CeX capture');
  assert.ok(Number.isFinite(Date.parse(snapshot.capturedAt)));
  assert.equal(new Set(snapshot.offers.map(offer => offer[0])).size, snapshot.offers.length, 'Repeated CeX IDs');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(benchmarks.checkedAt));
  for (const [gpu, memory, name, id, score] of benchmarks.rows) {
    assert.ok(gpu && name && Number.isInteger(id) && id > 0 && Number.isFinite(score) && score > 0);
    assert.ok(memory === null || Number.isFinite(memory) && memory > 0);
  }
  const offers = snapshot.offers.map(([id, name, price], index) => {
    assert.ok(typeof id === 'string' && /^[A-Z0-9]+$/.test(id) && typeof name === 'string' && Number.isFinite(price) && price > 0);
    const memory = name.match(/\b(\d+(?:\.\d+)?)\s*(GB|MB)\b/i);
    const vram = memory ? Number(memory[1]) / (memory[2].toUpperCase() === 'MB' ? 1024 : 1) : null;
    const gpu = identifyGPU(name);
    const candidates = benchmarks.rows.filter(row => row[0] === gpu && (row[1] === null || row[1] === vram));
    assert.ok(candidates.length <= 1, `Ambiguous benchmark: ${name}`);
    const match = candidates[0];
    const gpuKey = gpu && vram !== null ? `${gpu}|${vram}|${name.match(/\b(?:GDDR\dX?|HBM\d)\b/i)?.[0].toUpperCase() || ''}` : id;
    const matchNote = !gpu && /\b(?:egpu|mobile|laptop)\b/i.test(name) ? 'GPU externa o móvil: sin referencia comparable de sobremesa.'
      : !match ? 'Sin correspondencia verificada en la captura de PassMark.'
      : match[1] === null ? `Referencia agrupada: ${match[2]}; no separa memorias o revisiones.`
      : `Referencia: ${match[2]}; resultado de la GPU, no del ensamblador.`;
    return {id, name, price, vram, gpuKey, image:snapshot.images?.[id] || null, sourcePage:Math.floor(index / snapshot.pageSize) + 1, score:match?.[4] ?? null, benchmarkName:match?.[2] ?? null, benchmarkUrl:match ? `https://www.videocardbenchmark.net/gpu.php?gpu=${encodeURIComponent(match[2])}&id=${match[3]}` : null, matchNote};
  });
  return {capturedAt:snapshot.capturedAt, benchmarkCheckedAt:benchmarks.checkedAt, generatedAt:new Date().toISOString(), currency:'EUR', metric:benchmarks.metric, totalResults:snapshot.totalResults, source:snapshot.source, catalogueNote:'Captura de las seis páginas del catálogo con productos agotados ocultos. No se verificó el envío ni el stock individual de todas las ofertas.', offers};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], `file://${process.cwd()}/`))) {
  const snapshotURL = new URL('cex-snapshot.json', import.meta.url);
  let snapshot = JSON.parse(readFileSync(snapshotURL, 'utf8'));
  if (process.argv.includes('--check-images')) {
    snapshot = await checkImageHeaders(snapshot);
    writeFileSync(snapshotURL, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(`${Object.keys(snapshot.images).length} remote images verified using HEAD; no image bodies downloaded`);
  }
  const benchmarks = JSON.parse(readFileSync(new URL('benchmarks.json', import.meta.url), 'utf8'));
  const data = buildCatalogue(snapshot, benchmarks);
  const destination = new URL('../../pages/data/gpus-cex.json', import.meta.url);
  mkdirSync(new URL('.', destination), {recursive:true});
  writeFileSync(destination, JSON.stringify(data, null, 2) + '\n');
  console.log(`${data.offers.length} CeX offers; ${data.offers.filter(offer => offer.score !== null).length} matched; captured ${data.capturedAt}`);
}