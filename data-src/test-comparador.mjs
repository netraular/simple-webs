import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html = readFileSync(new URL('../pages/comparador-paises-v2.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'inline application script exists');
for (const tag of ['html','head','body','style','script']) {
  assert.equal((html.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'g')) || []).length, 1, `single ${tag}`);
  assert.equal((html.match(new RegExp(`</${tag}>`, 'g')) || []).length, 1, `single closing ${tag}`);
}
assert.ok(html.indexOf('</body>') < html.indexOf('</html>'));
assert.ok(!html.match(/<style>[\s\S]*?<\/html>[\s\S]*?<\/style>/));
const markup = html.replace(/<script>[\s\S]*?<\/script>/, '');
const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'unique static IDs');
const pureEnd = script.indexOf('const ui =');
assert.ok(pureEnd > 0);
new vm.Script(script);
const context = vm.createContext({});
vm.runInContext(script.slice(0, pureEnd) + ';globalThis.api = {calculateRetirement, calculateWork, progressiveTax, RETIREMENT_COUNTRIES, RETIREMENT_DEFAULTS};', context);
const {calculateRetirement, calculateWork, progressiveTax, RETIREMENT_COUNTRIES, RETIREMENT_DEFAULTS} = context.api;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
const country = (id, settings = {}) => calculateRetirement(settings).find(row => row.id === id);

const baseline = calculateRetirement();
assert.equal(baseline.length, 9);
assert.equal(new Set(baseline.map(row => row.id)).size, 9);
assert.equal(baseline[0].id, 'gr');
assert.equal(baseline[0].withdrawal, 35000);
assert.equal(baseline[0].gain, 28000);
close(baseline[0].monthlyCost, (428.57 + 839.60) * 1.15 + 250);
close(baseline[0].monthlyMargin, 1208.2711666666664);
assert.equal(country('pt').tax, 5488);
assert.equal(country('es').tax, 5760);
close(country('es').wealthTax, 1747.5830295);
for (const id of ['gr','hr','si','sk','cy']) assert.equal(country(id).tax, 0);
for (const id of ['bg','cz']) {
  assert.equal(country(id).status, 'needs-review');
  assert.equal(country(id).tax, null);
  assert.equal(country(id).monthlyNet, null);
  assert.equal(country(id).monthlyMargin, null);
}
assert.equal(country('bg', {bulgariaEligible:true}).tax, 0);
assert.equal(country('cz', {czechEligible:true}).tax, 0);
assert.equal(country('cz', {vehicle:'etf'}).tax, 0);
assert.equal(country('sk', {vehicle:'etf'}).tax, null);
assert.equal(country('sk', {vehicle:'etf',slovakiaEligible:true}).tax, 0);
assert.equal(country('sk', {vehicle:'etf',slovakiaEligible:true,holdingYears:1}).tax, null);
assert.equal(country('sk', {holdingYears:22}).tax, null);
assert.equal(country('sk', {holdingYears:23}).tax, 0);
assert.equal(country('cz', {holdingYears:3,vehicle:'etf'}).tax, null);
assert.equal(country('cz', {holdingYears:4,vehicle:'etf'}).tax, 0);
assert.equal(country('hr', {holdingYears:2}).tax, 3360);
assert.equal(country('hr', {holdingYears:3}).tax, 0);
for (const [years, rate] of [[0,.25],[4,.25],[5,.20],[9,.20],[10,.15],[14,.15],[15,0]]) {
  close(country('si', {holdingYears:years}).tax, 28000 * rate);
}
assert.equal(country('pt', {holdingYears:0}).tax, null);
for (const [years, rate] of [[1,.28],[2,.28],[3,.252],[4,.252],[5,.224],[7,.224],[8,.196],[30,.196]]) {
  close(country('pt', {holdingYears:years}).tax, 28000 * rate);
}
assert.equal(country('es', {capital:500000}).wealthTax, 0);
close(country('es', {capital:667129.45}).wealthTax, 167129.45 * .0021);
assert.equal(country('es', {capital:3000001}).status, 'needs-review');
assert.equal(country('es', {capital:3000001}).monthlyMargin, null);
for (const [amount, tax] of [[0,0],[6000,1140],[50000,10380],[200000,44880],[300000,71880],[400000,101880]]) {
  close(progressiveTax(amount, [[6000,.19],[50000,.21],[200000,.23],[300000,.27],[Infinity,.30]]), tax);
}
for (const row of calculateRetirement({costBasis:1000000})) {
  assert.equal(row.gain, 0);
  if (row.status === 'estimated') assert.equal(row.tax, 0);
}
for (const row of calculateRetirement({withdrawalRate:0})) {
  assert.equal(row.withdrawal, 0);
  assert.equal(row.gain, 0);
  if (row.status === 'estimated') {
    assert.equal(row.tax, 0);
    close(row.monthlyMargin, -row.monthlyCost - row.wealthTax / 12);
  }
}
close(country('gr', {costBuffer:0,monthlyExtras:0}).monthlyCost, 1268.17);
close(country('gr', {monthlyExtras:350}).monthlyMargin, country('gr').monthlyMargin - 100);
assert.equal(country('pt', {costBasis:0}).gain, 35000);
assert.ok(country('pt', {costBasis:100000}).tax > country('pt').tax);
for (const settings of [{capital:0},{capital:Infinity},{costBasis:-1},{costBasis:1000001},{withdrawalRate:NaN},{withdrawalRate:11},{withdrawalRate:-1},{holdingYears:1.5},{holdingYears:-1},{holdingYears:101},{costBuffer:-1},{costBuffer:101},{monthlyExtras:-1},{monthlyExtras:10001},{vehicle:'unknown'},{bulgariaEligible:'true'}]) {
  assert.throws(() => calculateRetirement(settings), {name:'RangeError'});
}
for (const vehicle of ['fund','etf']) {
  for (const holdingYears of [0,1,2,3,4,5,8,10,15,22,23,30,100]) {
    for (const withdrawalRate of [0,3.5,10]) {
      const rows = calculateRetirement({vehicle,holdingYears,withdrawalRate});
      const estimates = rows.filter(row => row.status === 'estimated');
      estimates.forEach((row,index) => {
        assert.ok([row.tax,row.wealthTax,row.monthlyCost,row.monthlyNet,row.monthlyMargin].every(Number.isFinite));
        assert.ok(row.tax >= 0 && row.tax <= row.gain);
        close(row.monthlyMargin, (row.withdrawal - row.tax - row.wealthTax) / 12 - row.monthlyCost);
        if (index) assert.ok(estimates[index - 1].monthlyMargin >= row.monthlyMargin);
      });
      assert.ok(rows.slice(estimates.length).every(row => row.status === 'needs-review'));
    }
  }
}
for (const row of RETIREMENT_COUNTRIES) {
  assert.equal(new URL(row.taxSource).protocol, 'https:');
  if (row.id !== 'es') assert.equal(new URL(row.costSource).hostname, 'www.numbeo.com');
}
for (const salary of [20000,40000,60000,75000,200000]) {
  const rows = calculateWork(salary);
  assert.equal(rows.length, 16);
  rows.forEach((row,index) => {
    assert.ok(Number.isFinite(row.monthlyMargin));
    close(row.monthlyMargin, row.monthlyNet - row.monthlyCost);
    if (index) assert.ok(rows[index - 1].monthlyMargin >= row.monthlyMargin);
  });
}
assert.equal(calculateWork(60000).find(row => row.id === 'bcn').monthlyMargin, 1390);
assert.ok(calculateWork(20000).find(row => row.id === 'bcn').monthlyMargin < 0);
assert.throws(() => calculateWork(NaN), {name:'RangeError'});

function element(id) {
  return {id,value:'',checked:false,hidden:false,textContent:'',innerHTML:'',listeners:{},attributes:{},
    get valueAsNumber(){return this.value === '' ? NaN : Number(this.value);},
    addEventListener(type, handler){this.listeners[type] = handler;},
    setAttribute(name, value){this.attributes[name] = value;},
    querySelectorAll(){return [];}
  };
}
const elements = Object.fromEntries(ids.map(id => [id,element(id)]));
for (const match of html.matchAll(/<input\b[^>]*\bid="([^"]+)"[^>]*\bvalue="([^"]+)"[^>]*>/g)) elements[match[1]].value = match[2];
elements.vehicle.value = 'fund';
for (const [key,value] of Object.entries(RETIREMENT_DEFAULTS)) {
  if (typeof value === 'number') assert.equal(elements[key].valueAsNumber, value, `markup default ${key}`);
}
const document = {getElementById(id){assert.ok(elements[id], `DOM id ${id} exists`);return elements[id];}};
vm.runInNewContext(script, {document,Intl});
const visibleCount = () => (elements.results.innerHTML.match(/class="destination"/g) || []).length;
assert.equal(visibleCount(), 5);
assert.match(elements.results.innerHTML, /Grecia/);
assert.equal(elements.retireControls.hidden, false);
assert.equal(elements.workControls.hidden, true);
assert.equal(elements.retireMode.attributes['aria-pressed'], 'true');
elements.showMore.listeners.click();
assert.equal(visibleCount(), 9);
assert.equal(elements.showMore.attributes['aria-expanded'], 'true');
assert.match(elements.results.innerHTML, /Pendiente/);
assert.match(elements.results.innerHTML, /Fiscalidad/);
elements.bulgariaEligible.checked = true;
elements.retireControls.listeners.input();
assert.equal((elements.results.innerHTML.match(/<strong>Pendiente<\/strong>/g) || []).length, 1);
elements.vehicle.value = 'etf';
elements.vehicle.listeners.change();
assert.equal(elements.bulgariaEligible.checked, false);
assert.equal(elements.czechCheck.hidden, true);
assert.equal(elements.slovakiaCheck.hidden, false);
elements.capital.value = '';
elements.retireControls.listeners.input();
assert.equal(elements.error.hidden, false);
assert.equal(elements.resultsSection.hidden, true);
assert.equal(elements.results.innerHTML, '');
elements.capital.value = '1000000';
elements.retireControls.listeners.input();
assert.equal(elements.error.hidden, true);
assert.equal(elements.resultsSection.hidden, false);
elements.costBasis.value = '1000001';
elements.retireControls.listeners.input();
assert.equal(elements.error.hidden, false);
elements.workMode.listeners.click();
assert.equal(elements.workControls.hidden, false);
assert.equal(elements.retireControls.hidden, true);
assert.equal(elements.error.hidden, true);
assert.equal(visibleCount(), 5);
assert.match(elements.resultsTitle.textContent, /trabajando/);
elements.showMore.listeners.click();
assert.equal(visibleCount(), 16);
elements.salary.value = '';
elements.workControls.listeners.input();
assert.equal(elements.error.hidden, false);
elements.salary.value = '75000';
elements.workControls.listeners.input();
assert.equal(elements.error.hidden, true);
elements.costBasis.value = '200000';
elements.retireMode.listeners.click();
assert.equal(visibleCount(), 5);
assert.equal(elements.retireMode.attributes['aria-pressed'], 'true');
assert.ok(!elements.results.innerHTML.includes('NaN'));
console.log('PASS: HTML structure, 78 retirement scenarios, fiscal boundaries, 16 work destinations, and simulated DOM interactions.');