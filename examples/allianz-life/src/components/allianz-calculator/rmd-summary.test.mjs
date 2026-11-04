import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const widget = fs.readFileSync(path.resolve(here, '../../../public/allianz-assets/rmd/source-widget.js'), 'utf8');
const helperStart = widget.indexOf('function Gc(e)');
const helperEnd = widget.indexOf('function Zc(e)', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'exact source summary helper exists');
const helper = vm.runInNewContext('(' + widget.slice(helperStart, helperEnd) + ')');
const formatterSources = [...widget.matchAll(/seriesDescriptionFormatter:(e=>\{const t=Gc\(e\);return[^}]+\})/g)].map((match) => match[1]);
assert.equal(formatterSources.length, 2, 'both actual source chart formatters are exercised');
const formatters = formatterSources.map((source) => vm.runInNewContext('(' + source + ')', { Gc: helper }));
const series = (ages, amounts, name = 'RMD') => ({ xAxis: { categories: ages }, processedYData: amounts, name });
const plain = (value) => value === null ? null : JSON.parse(JSON.stringify(value));
const allDescriptions = (input) => formatters.map((formatter) => formatter(input));

test('actual chart helper and both formatters announce first displayed nominal amount, maximum and last', () => {
  const values = [3774,3970,4159,4358,4545,4761,4987,5222,5440,5696,5929,6207,6455,6710,6971,7184,7454,7665,7872,8072,8264,8355,8426,8371,8392,8266,8102,7772,7410,7013,6581,5990,5398,4808,4122,3493,2922,2408,1895,1476];
  const input = series(values.map((_, index) => index + 73), values);
  assert.deepEqual(plain(helper(input)), { firstRMD: '$3774', firstRMDAge: 73, maximumRMD: '$8426', maximumRMDAge: 95, lastRMD: '$1476', lastRMDAge: 112 });
  for (const description of allDescriptions(input)) {
    assert.equal(description, 'The first displayed RMD is $3774 at age 73, the largest displayed RMD is $8426 at age 95, and the last displayed RMD is $1476 at age 112.');
  }
});

test('leading and trailing zero amounts remain paired with their displayed ages', () => {
  const input = series([73,74,75], [0,500,0]);
  assert.deepEqual(plain(helper(input)), { firstRMD: '$0', firstRMDAge: 73, maximumRMD: '$500', maximumRMDAge: 74, lastRMD: '$0', lastRMDAge: 75 });
  for (const description of allDescriptions(input)) {
    assert.match(description, /first displayed RMD is \$0 at age 73/);
    assert.match(description, /last displayed RMD is \$0 at age 75/);
  }
});

test('display order is retained rather than sorted by age, with first maximum tie selected', () => {
  const input = series([99,73,120,82], [15,0,15,7]);
  assert.deepEqual(plain(helper(input)), { firstRMD: '$15', firstRMDAge: 99, maximumRMD: '$15', maximumRMDAge: 99, lastRMD: '$7', lastRMDAge: 82 });
  assert.ok(allDescriptions(input).every((value) => value.includes('first displayed RMD is $15 at age 99')));
});

test('later displayed start is described without a statutory-age claim', () => {
  const input = series([85,86], [500,900]);
  for (const description of allDescriptions(input)) {
    assert.equal(description, 'The first displayed RMD is $500 at age 85, the largest displayed RMD is $900 at age 86, and the last displayed RMD is $900 at age 86.');
    assert.doesNotMatch(description, /starts at|seventy|half|statutor/i);
  }
});

test('null and nonfinite amounts are skipped by original index without losing valid zero alignment', () => {
  const input = series([72,73,74,75,76], [null,NaN,0,Infinity,20]);
  assert.deepEqual(plain(helper(input)), { firstRMD: '$0', firstRMDAge: 74, maximumRMD: '$20', maximumRMDAge: 76, lastRMD: '$20', lastRMDAge: 76 });
  assert.ok(allDescriptions(input).every((value) => value.includes('first displayed RMD is $0 at age 74')));
});

test('empty, missing and invalid series get a neutral summary without numeric artifacts', () => {
  const inputs = [undefined, null, {}, {xAxis:{}}, series([],[]), series([73],[null]), series([73],[NaN]), series([73],['3774'])];
  for (const input of inputs) assert.equal(helper(input), null);
  for (const input of inputs.filter((value) => value && value.name)) {
    for (const description of allDescriptions(input)) assert.equal(description, 'No RMD values are displayed on this graph.');
  }
  for (const formatter of formatters) assert.equal(formatter({ name: 'RMD' }), 'No RMD values are displayed on this graph.');
});

test('all-zero series remains meaningful and retains correct first and last ages', () => {
  const input = series([73,74,75], [0,0,0]);
  assert.deepEqual(plain(helper(input)), { firstRMD: '$0', firstRMDAge: 73, maximumRMD: '$0', maximumRMDAge: 73, lastRMD: '$0', lastRMDAge: 75 });
  assert.ok(allDescriptions(input).every((value) => !/Infinity|NaN|undefined/.test(value)));
});

test('unpaired values or missing age categories cannot produce mismatched announcements', () => {
  const input = series([73,null,75], [10,100,20,500]);
  assert.deepEqual(plain(helper(input)), { firstRMD: '$10', firstRMDAge: 73, maximumRMD: '$20', maximumRMDAge: 75, lastRMD: '$20', lastRMDAge: 75 });
  assert.ok(allDescriptions(input).every((value) => !/undefined|null|\$500|\$100/.test(value)));
});

test('actual summaries do not mutate category, chart amount or source series arrays', () => {
  const ages = Object.freeze([73,74,75]);
  const values = Object.freeze([0,100,0]);
  const input = Object.freeze({ xAxis: Object.freeze({categories: ages}), processedYData: values, name: 'RMD' });
  const before = JSON.stringify(input);
  helper(input); allDescriptions(input);
  assert.equal(JSON.stringify(input), before);
  assert.strictEqual(input.xAxis.categories, ages);
  assert.strictEqual(input.processedYData, values);
});

test('IRA value series retains its original suppressed summary in both chart states', () => {
  const input = series([73,74], [100000,90000], 'IRA or qualified plan value');
  assert.deepEqual(allDescriptions(input), ['', ' ']);
});
