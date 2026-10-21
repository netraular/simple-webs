import {readFileSync, existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildCatalogue, identifyGPU} from './build-gpus.mjs';

const html = readFileSync(new URL('../../pages/gpus-cex.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
new vm.Script(script);
const context = vm.createContext({});
vm.runInContext(script.slice(0, script.indexOf('const ui =')) + ';globalThis.rankOffers = rankOffers;', context);
const {rankOffers} = context;
const fixture = [
  {id:'a', name:'MSI RTX 3060 12GB', price:200, vram:12, score:16000, gpuKey:'3060-12'},
  {id:'b', name:'Asus RTX 3060 12GB', price:240, vram:12, score:16000, gpuKey:'3060-12'},
  {id:'c', name:'RTX 3060 8GB', price:180, vram:8, score:13000, gpuKey:'3060-8'},
  {id:'d', name:'Unknown', price:10, vram:4, score:null, gpuKey:null},
  {id:'e', name:'GTX 970 4GB', price:50, vram:4, score:9000, gpuKey:'970-4'},
  {id:'f', name:'GTX 960 4GB', price:50, vram:4, score:6000, gpuKey:'960-4'}
];
const ids = rows => Array.from(rows, row => row.id);
assert.deepEqual(ids(rankOffers(fixture)), ['e','f','a','c','d']);
assert.equal(rankOffers(fixture).find(row => row.id === 'a').value, 80);
assert.deepEqual(ids(rankOffers(fixture, {query:'asus 3060'})), ['b']);
assert.deepEqual(ids(rankOffers(fixture, {budget:180, vram:8})), ['c']);
assert.deepEqual(ids(rankOffers(fixture, {minimum:10000})), ['a','c']);
assert.deepEqual(ids(rankOffers(fixture, {frontier:true})), ['e','a','c']);
assert.equal(rankOffers(fixture, {group:false}).length, 6);
assert.deepEqual(ids(rankOffers(fixture, {sort:'price'})), ['d','e','f','c','a']);
assert.deepEqual(ids(rankOffers(fixture, {sort:'score'})), ['a','c','e','f','d']);
assert.equal(rankOffers(fixture, {budget:0}).length, 0);
assert.throws(() => rankOffers(fixture, {budget:NaN}), {name:'RangeError'});
assert.throws(() => rankOffers(fixture, {minimum:-1}), {name:'RangeError'});
assert.equal(fixture[0].value, undefined);
for (const tag of ['html','head','body','style','script']) {
  assert.equal((html.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'g')) || []).length, 1, `single ${tag}`);
  assert.equal((html.match(new RegExp(`</${tag}>`, 'g')) || []).length, 1);
}
const idsInHTML = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(idsInHTML).size, idsInHTML.length);
for (const [name, expected] of [
  ['RTX 3060 Ti Ventus 8GB', 'RTX 3060 Ti'], ['GTX 1660 Super 6GB', 'GTX 1660 SUPER'],
  ['Gigabyte GeForce RTX 4070Ti EAGLE OC 12GB', 'RTX 4070 Ti'],
  ['RX 6500 XT 4GB', 'RX 6500 XT'], ['RX Vega 56 8GB HBM2', 'RX Vega 56'],
  ['ATI Radeon R9 380X 4GB', 'R9 380X'], ['GTX 760Ti 2GB', 'GTX 760 Ti'],
  ['Asus ROG XG Mobile eGPU RTX 4090 16GB', null], ['RTX 5070 Ti Laptop GPU', null],
  ['Unknown 8GB', null]
]) assert.equal(identifyGPU(name), expected);
const snapshot = JSON.parse(readFileSync(new URL('cex-snapshot.json', import.meta.url), 'utf8'));
const benchmarks = JSON.parse(readFileSync(new URL('benchmarks.json', import.meta.url), 'utf8'));
const rebuilt = buildCatalogue(snapshot, benchmarks);
assert.equal(rebuilt.offers.length, 102);
assert.equal(rebuilt.offers.filter(offer => offer.score !== null).length, 87);
assert.deepEqual([...new Set(rebuilt.offers.map(offer => offer.sourcePage))], [1,2,3,4,5,6]);
const byID = id => rebuilt.offers.find(offer => offer.id === id);
assert.equal(byID('STARATI3650512A').vram, 0.5);
assert.equal(byID('SGRANVI1060GTX3GBA').score, 9859);
assert.equal(byID('SGRANVI1060GTX6GBA').score, 10016);
assert.equal(byID('SGRAMSI30608G01').score, 15211);
assert.equal(byID('SGRAMSI306012G05').score, 16699);
assert.equal(byID('SGRAPNY3050VERD6G01').score, 10740);
assert.equal(byID('SGRAASUROGXGGC33Y').score, null);
assert.equal(byID('SGRAASUROGXGGC34R').score, null);
assert.notEqual(byID('SGRANVI1650GTX4GBG6').gpuKey, byID('SGRANVI1650GTX4GB').gpuKey);
assert.match(byID('SGRAAMDRX5808GB').matchNote, /agrupada/);
assert.equal(rankOffers(rebuilt.offers)[0].id, 'SGRAATIR92904GB');
assert.equal(rankOffers(rebuilt.offers, {minimum:20000})[0].id, 'SGRAKFA23060TI02');
assert.throws(() => buildCatalogue({...snapshot, totalResults:103}, benchmarks));
assert.throws(() => buildCatalogue({...snapshot, offers:[...snapshot.offers.slice(0,-1), snapshot.offers[0]]}, benchmarks));
assert.throws(() => buildCatalogue(snapshot, {...benchmarks, rows:[...benchmarks.rows, benchmarks.rows[0]]}));
const dataURL = new URL('../../pages/data/gpus-cex.json', import.meta.url);
assert.ok(existsSync(dataURL), 'Run build-gpus.mjs before the tests');
const data = JSON.parse(readFileSync(dataURL, 'utf8'));
{
  assert.deepEqual(data.offers, rebuilt.offers, 'Published data matches its sources');
  assert.ok(data.offers.length > 0);
  assert.equal(new Set(data.offers.map(offer => offer.id)).size, data.offers.length);
  assert.ok(Number.isFinite(Date.parse(data.capturedAt)));
  for (const offer of data.offers) {
    assert.ok(offer.name && offer.price > 0 && Number.isFinite(offer.price));
    assert.ok(offer.score === null || Number.isFinite(offer.score) && offer.score > 0);
    assert.ok(offer.vram === null || offer.vram > 0);
    if (offer.score !== null) assert.equal(new URL(offer.benchmarkUrl).hostname, 'www.videocardbenchmark.net');
    if (offer.image) assert.equal(new URL(offer.image).hostname, 'es.static.webuy.com');
  }
  console.log(`Data contract: ${data.offers.length} offers, ${data.offers.filter(offer => offer.score !== null).length} matched`);
}

function element(id) {
  return {id, value:'', checked:false, hidden:false, innerHTML:'', textContent:'', listeners:{},
    get valueAsNumber(){return this.value === '' ? NaN : Number(this.value);},
    addEventListener(type, listener){this.listeners[type] = listener;},
    classList:{add(){}}
  };
}
async function page(response = {ok:true, json:async () => data}) {
  const elements = Object.fromEntries(idsInHTML.map(id => [id, element(id)]));
  elements.vram.value = '0'; elements.sort.value = 'value'; elements.group.checked = true;
  const document = {getElementById(id){assert.ok(elements[id], `DOM ID ${id}`); return elements[id];}};
  const context = vm.createContext({document, Intl, fetch:async url => {
    assert.equal(url, 'data/gpus-cex.json');
    if (response instanceof Error) throw response;
    return response;
  }});
  vm.runInContext(script.replace(/\nload\(\);\s*$/, '\nglobalThis.ready = load();'), context);
  await context.ready;
  return elements;
}
const elements = await page();
const visibleCount = () => (elements.rows.innerHTML.match(/<tr>/g) || []).length;
assert.equal(elements.status.hidden, true);
assert.equal(elements.table.hidden, false);
assert.match(elements.snapshot.textContent, /102 ofertas/);
assert.match(elements.winner.innerHTML, /R9 290/);
assert.match(elements.coverage.textContent, /87 de 102/);
elements.group.checked = false;
elements.group.listeners.change();
assert.equal(visibleCount(), 102);
elements.search.value = 'rtx 3060';
elements.filters.listeners.input();
assert.ok(visibleCount() > 0 && visibleCount() < 102);
elements.budget.value = '0';
elements.filters.listeners.input();
assert.equal(elements.table.hidden, true);
assert.equal(elements.winner.hidden, true);
assert.equal(elements.status.hidden, false);
elements.budget.value = '-1';
elements.filters.listeners.input();
assert.match(elements.status.textContent, /válidos/);
elements.budget.value = ''; elements.search.value = ''; elements.minimum.value = '20000';
elements.filters.listeners.input();
assert.match(elements.winner.innerHTML, /KFA2/);
elements.minimum.value = '';
for (const id of data.offers.slice(0,4).map(offer => offer.id)) elements.rows.listeners.change({target:{dataset:{id}}});
assert.equal(elements.selectedCount.textContent, '3 / 3');
assert.equal(elements.comparison.hidden, false);
assert.match(elements.rows.innerHTML, /disabled/);
elements.clear.listeners.click();
assert.equal(elements.comparison.hidden, true);
elements.frontier.checked = true;
elements.frontier.listeners.change();
assert.ok(visibleCount() < 87);
assert.doesNotMatch(elements.rows.innerHTML, /Sin referencia/);
for (const failure of [new Error('Network error'), {ok:false,status:404}, {ok:true,json:async () => {throw new SyntaxError();}}, {ok:true,json:async () => ({...data, offers:[]})}, {ok:true,json:async () => ({...data, offers:[{...data.offers[0],price:0}]})}, {ok:true,json:async () => ({...data, offers:[{...data.offers[0],benchmarkUrl:'javascript:alert(1)'}]})}]) {
  const failedPage = await page(failure);
  assert.match(failedPage.status.textContent, /No se han podido cargar/);
  assert.equal(failedPage.status.hidden, false);
  failedPage.filters.listeners.input();
  assert.match(failedPage.status.textContent, /No se han podido cargar/);
}
const unsafeName = await page({ok:true, json:async () => ({...data,offers:[{...data.offers[0],name:'<img src=x onerror=alert(1)>'}]})});
assert.match(unsafeName.rows.innerHTML, /&lt;img/);
assert.doesNotMatch(unsafeName.rows.innerHTML, /<img src=x/);
console.log('GPU ranking, filters, grouping, frontier and page syntax: OK');
console.log('Source matching, DOM controls, three-GPU comparison, escaping and loading failures: OK');