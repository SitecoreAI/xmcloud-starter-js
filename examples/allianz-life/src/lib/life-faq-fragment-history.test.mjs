import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { after, test } from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const candidate = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const witnesses = JSON.parse(fs.readFileSync(new URL('./life-faq-fragment-baseline.fixture.json', import.meta.url), 'utf8')).cases;
const originalTest = process.env.TEST, originalMode = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
process.env.TEST = 'true'; process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
after(() => { for (const [key, value] of [['TEST', originalTest], ['NEXT_PUBLIC_ALLIANZ_CONTENT_MODE', originalMode]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
const fragments = ['#GeneralLifeInsuranceQuestions', '#about-indexed-universal-life', '#applying-for-life-insurance'];
const normal = { isNormal: true, isEditing: false, isPreview: false };
const field = (value, name) => ({ jsonValue: { value, metadata: { itemId: `synthetic-${name}-owner`, fieldId: `synthetic-${name}-field`, fieldType: 'General Link' } } });
const linkValue = href => ({ href, text: 'Jump ' + href, linktype: 'anchor', anchor: href.slice(1) });
function data(values = fragments.map(linkValue)) { return { children: { results: values.map((value, index) => ({ id: `synthetic-card-${index}`, heading: field(`Heading ${index}`, `heading-${index}`), body: field(`<p>Body ${index}</p>`, `body-${index}`), link: field(value, `link-${index}`) })) } }; }
function render(Component, value, mode = normal) {
 return renderToStaticMarkup(React.createElement(SitecoreProvider, { page: { mode, siteName: 'allianz-life', layout: { sitecore: { context: { itemPath: '/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator/frequently-asked-questions' }, route: { name: 'FAQ', fields: {}, placeholders: {} } } } }, api: {}, componentMap: new Map(), loadImportMap: async () => ({}) }, React.createElement(Component, { params: { RenderingIdentifier: 'native-navigation' }, fields: { data: { datasource: value } } })));
}
const anchors = html => [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]);
const classification = html => anchors(html).map(tag => /data-nextjs-link="true"/.test(tag) ? 'next' : /data-react-link="true"/.test(tag) ? 'react' : 'other');
const removeClassification = html => html.replace(/ data-(?:nextjs-link|react-link)="true"/g, '');
function canonical(html) {
 const python="import json,sys\nfrom html.parser import HTMLParser\nclass P(HTMLParser):\n def __init__(self):super().__init__(convert_charrefs=True);self.tokens=[]\n def handle_starttag(self,t,a):self.tokens.append(['start',t,sorted(a)])\n def handle_startendtag(self,t,a):self.tokens.append(['empty',t,sorted(a)])\n def handle_endtag(self,t):self.tokens.append(['end',t])\n def handle_data(self,d):self.tokens.append(['text',d])\np=P();p.feed(sys.stdin.read());print(json.dumps(p.tokens,separators=(',',':')))";
 const result=spawnSync('python3',['-c',python],{input:removeClassification(html),encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result.stdout.trim();
}
const digest=html=>createHash('sha256').update(canonical(html)).digest('hex');

function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
test('known normal fragments use actual SDK NextLink with literal hashes and unchanged fields/markup', () => {
 const value = freeze(data()), before = JSON.stringify(value), result = render(candidate.LifeFaqNavigation, value);
 assert.deepEqual(classification(result), ['next','next','next']); assert.deepEqual(witnesses.normal3.classification, ['react','react','react']);
 assert.deepEqual(anchors(result).map(tag => /href="([^"]+)"/.exec(tag)[1]), fragments); assert.doesNotMatch(result, /href="(?:%23|\/%23)/);
 assert.equal(digest(result), witnesses.normal3.sha256, 'all source dimensions/layout/attributes except SDK classification stay exact'); assert.equal(JSON.stringify(value), before);
});
test('_self remains source-owned; fragment identifiers are case-sensitive', () => {
 const value = data([{...linkValue(fragments[0]),target:'_self'},linkValue('#generallifeinsurancequestions')]), html=render(candidate.LifeFaqNavigation,value);
 assert.deepEqual(classification(html),['next','react']); assert.equal(digest(html),witnesses.selfCase.sha256);
});
test('editing, Preview and incomplete/contradictory modes retain original SDK behavior and chrome', () => {
 const value=freeze(data()),before=JSON.stringify(value);
 for(const [index, mode] of [{isNormal:false,isEditing:true,isPreview:false},{isNormal:false,isEditing:false,isPreview:true},{isNormal:true,isEditing:true,isPreview:false},{isNormal:true,isEditing:false,isPreview:true},{isNormal:true,isEditing:false},{isNormal:true,isPreview:false},{isEditing:false,isPreview:false},{}].entries()) {
  const result=render(candidate.LifeFaqNavigation,value,mode); assert.equal(digest(result),witnesses['mode'+index].sha256); assert.ok(!classification(result).includes('next'));
 }
 const editing=render(candidate.LifeFaqNavigation,value,{isNormal:false,isEditing:true,isPreview:false}); for(const index of [0,1,2]) assert.ok(editing.includes(`synthetic-link-${index}-field`)); assert.equal(JSON.stringify(value),before);
});
test('bare/unavailable/unknown/malformed and cleared links retain their safe branch', () => {
 const value=freeze(data(['#','#service-unavailable','#demo-unavailable','#other','javascript:alert(1)',' #applying-for-life-insurance','','#applying-for-life-insurance?unsafe=1'].map(href=>({href,text:'Control',linktype:'anchor'}))));
 const result=render(candidate.LifeFaqNavigation,value); assert.equal(digest(result),witnesses.rejected.sha256); assert.deepEqual(classification(result),witnesses.rejected.classification);
});
test('download, disabled, alternate target, authored query/conflicting anchor stay unchanged', () => {
 for(const [index,extra] of [{download:''},{download:undefined},{'aria-disabled':'true'},{'aria-disabled':'false'},{disabled:true},{target:'_blank'},{target:'_parent'},{target:'_top'},{querystring:'author=keep'},{anchor:'different-anchor'},{target:'_SELF'}].entries()) {
  const value=freeze(data([{...linkValue(fragments[2]),...extra}])),result=render(candidate.LifeFaqNavigation,value); assert.equal(digest(result),witnesses['extra'+index].sha256); assert.ok(!classification(result).includes('next'));
 }
});
test('product CTA and every Prompt fragment retain their original branch', () => {
 for(const [index,href] of [fragments[2],'/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator'].entries()) {
  const value=freeze({primaryLink:field({...linkValue(href),linktype:href.startsWith('#')?'anchor':'internal'},'cta'),children:{results:[]}}); assert.equal(digest(render(candidate.LifeFaqPrompt,value)),witnesses['prompt'+index].sha256);
 }
});
test('actual SDK as-string keeps hash syntax and normal current-page query semantics', () => {
 const initial='http://127.0.0.1:4019/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator/frequently-asked-questions?sample=keep&sample=second';
 for(const tag of anchors(render(candidate.LifeFaqNavigation,data()))) {const href=/href="([^"]+)"/.exec(tag)[1],target=new URL(href,initial); assert.equal(target.pathname,new URL(initial).pathname);assert.equal(target.search,'?sample=keep&sample=second');assert.ok(fragments.includes(target.hash));assert.doesNotMatch(href,/%23/);}
});
