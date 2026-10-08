import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fixtures, tree, runtime, sourceRoot } from './editorial-section-containers.test-helper.mjs';
const app=runtime();
const copy = value => JSON.parse(JSON.stringify(value));
function section(params, children=[]) { return {componentName:'AllianzEditorialSection',uid:'test-only-unit-section',params:{FieldNames:'Default',DynamicPlaceholderId:'91',...params},placeholders:{'allianz-editorial-section-{*}':children}}; }
function fields(rendering) { return [rendering.fields,...Object.values(rendering.placeholders??{}).flat().flatMap(fields)].filter(Boolean); }
for(const fixture of fixtures) for(const editing of [false,true]) for(const resolved of [false,true]) test(`${fixture.name}: real SDK nested ${editing?'editing':'visitor'} ${resolved?'resolved':'wildcard'}`,()=>{
 const input=tree(fixture,resolved),values=JSON.stringify(fields(input)),html=app.render(input,editing);
 assert.equal(JSON.stringify(fields(input)),values);
 assert.equal((html.match(/class="l-container--full-width/g)||[]).length,1);
 assert.equal((html.match(/class="l-grid l-grid--max-width/g)||[]).length,1);
 assert.equal((html.match(/class="l-grid__row /g)||[]).length,2);
 assert.ok(!html.includes('No data source'));
 if(!editing)assert.ok(!html.includes('[No text in field]'));
 if(fixture.tail&&!editing)assert.match(html,/<div class="l-grid__row "><div class="l-grid__column-medium-12"><\/div><\/div><\/div><\/div>$/);
 if(fixture.anchor){assert.equal((html.match(/<a name="application"><\/a>/g)||[]).length,1);assert.ok(html.indexOf('<a name="application">')<html.indexOf('class="l-grid__row '));assert.ok(!html.includes('id="application"'));}
 if(fixture.contentCards.length){assert.match(html,/class="l-grid__row u-margin-bottom-xl"/);assert.equal((html.match(/tile--6633/g)||[]).length,2);assert.equal((html.match(/-is--flipped/g)||[]).length,1);assert.ok(html.indexOf('Financial stability')<html.indexOf('Financial sustainability and financial security'));}
 if(editing){assert.match(html,/chrometype="placeholder"/);for(const block of [fixture.intro,...fixture.contentCards])assert.ok(html.includes(`test-only-${block.card.sourceJobKey}-heading`)||block.card.heading==='');assert.ok(!html.includes('test-only-tail-body'));}
});
test('row mode is structural and uses existing column/spacing choices',()=>{
 assert.doesNotMatch(app.render(section({container:'row',layout:'column'}),true),/No text in field|fieldId|o-richTextEditor/);
 assert.equal(app.render(section({container:'row',layout:'column'})),'<div class="l-grid__row "><div class="l-grid__column-medium-12"></div></div>');
 assert.equal(app.render(section({container:'row',layout:'grid',marginBottom:'xl',RenderingIdentifier:'row-anchor'})),'<div class="l-grid__row u-margin-bottom-xl" id="row-anchor"></div>');
});
test('content mode creates only a named anchor and existing children, never a content datasource',()=>{
 assert.equal(app.render(section({container:'content',RenderingIdentifier:'application'})),'<a name="application"></a>');
 assert.equal(app.render(section({container:'content'})),'');
 assert.equal(app.render(section({container:'content',RenderingIdentifier:''})),'');
 assert.equal(app.render(section({container:'content',RenderingIdentifier:'a"<&'})),'<a name="a&quot;&lt;&amp;"></a>');
});
test('content mode preserves an authored child and its editing metadata after the anchor',()=>{
 const child={componentName:'AllianzArticle',uid:'test-only-authored-child',params:{FieldNames:'EditorialBody',container:'content',scaffold:'rich-text'},fields:{data:{datasource:{body:{jsonValue:{value:'<p>Source body</p>',metadata:{itemId:'test-only-content-item',fieldId:'test-only-content-body',fieldType:'Rich Text'}}}}}}};
 const original=copy(child),parent=section({container:'content',RenderingIdentifier:'application'},[child]);
 assert.equal(app.render(parent),'<a name="application"></a>'+app.render(child));
 const editing=app.render(section({container:'content',RenderingIdentifier:'application'},[copy(child)]),true);
 assert.ok(editing.includes('test-only-content-body'));assert.ok(editing.includes('Source body'));assert.match(editing,/chrometype="placeholder"/);assert.deepEqual(child,original);
});
test('default outer identifiers and legacy variants keep their host semantics',()=>{
 for(const value of [undefined,'','invalid','ROW']) {const result=app.render(section({container:value,layout:'column',RenderingIdentifier:'keypoint2',theme:'blue-soft'}));assert.match(result,/^<div class="l-container--full-width t-bg-blue-soft axlTileCollection" id="keypoint2">/);assert.doesNotMatch(result,/<a name=/);}
 for(const variant of ['LegacyDocumentContent','LegacyDocumentPreContent','LegacyProductDocument']){const r=section({FieldNames:variant,container:'content',RenderingIdentifier:'legacy-id'});const out=app.render(r);assert.doesNotMatch(out,/<a name="legacy-id"/);}
});
test('all structural modes still require the native numeric DynamicPlaceholderId',()=>{
 for(const container of [undefined,'row','content'])for(const id of [undefined,'','test-only',1]) {const r=section({container,DynamicPlaceholderId:id});assert.throws(()=>app.render(r),/numeric native SXA DynamicPlaceholderId/);}
});
test('row/content params and source fixture values are not mutated',()=>{
 for(const fixture of fixtures){const r=tree(fixture,true),before=copy(r);app.render(r);assert.deepEqual(r,before);}
});
test('one production file uses structural options without invented page content or prose parsing',()=>{
 const s=fs.readFileSync(path.join(sourceRoot,'components/allianz-editorial-section/AllianzEditorialSection.tsx'),'utf8');assert.ok(s.includes("params.container === 'row'"));assert.ok(s.includes("params.container === 'content'"));assert.ok(!s.includes('application'));assert.ok(!s.includes('dangerouslySetInnerHTML'));assert.ok(!s.includes('params.introSpacer'));
});
