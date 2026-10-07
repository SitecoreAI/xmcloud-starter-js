import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, metadata } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot,'components/allianz-card-grid/AllianzCardGrid.tsx'));
const source = JSON.parse(fs.readFileSync(path.join(sourceRoot,'lib/editorial-badge-tags.fixture.json'),'utf8'));
const freeze = value => { if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value; };
const field = (name,value,editing=false) => ({jsonValue:{value,...(editing?{metadata:metadata(`badge-${name}`,['icon','image'].includes(name)?'Image':name==='body'?'Rich Text':'Single-Line Text')}:{})}});
function card(value,editing=false,extra={}) {return {id:'test-badge-card',heading:field('heading','Badge heading',editing),headingLevel:field('headingLevel','h3',editing),body:field('body','<p>Unchanged body</p>',editing),iconTheme:field('iconTheme','primary-brand',editing),alphanumeral:field('alphanumeral',value,editing),...extra};}
const data = c => ({children:{results:[c]}});
const badges = html => [...html.matchAll(/<(em|span)\b[^>]*class="alphaType"[^>]*>(.*?)<\/(?:em|span)>/gs)].map(m=>({tag:m[1],text:m[2]}));
function mode(value,run){const old=process.env.NODE_ENV,previous=process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;process.env.NODE_ENV='test';process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE=value;try{run();}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;if(previous===undefined)delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE=previous;}}

test('source census covers91 numbered non-image EditorialTiles across24 routes',()=>{
 assert.equal(source.items.length,91);assert.equal(new Set(source.items.map(x=>x.route)).size,24);assert.equal(source.sourceMappedEditorialTiles,143);
 for(const item of source.items){assert.equal(item.sourceTag,'em');assert.equal(item.sourceHasImage,false);assert.ok(!['image-left','image-right'].includes(item.params.layout));assert.match(item.sourceFileSha256,/^[a-f0-9]{64}$/);}
});
for(const contentMode of ['fixture','connected']) for(const [index,item] of source.items.entries()) test(`${contentMode} source badge ${index+1}: ${item.route.split('/').pop()} ${item.alphanumeral}`,()=>mode(contentMode,()=>{
 for(const editing of [false,true]){
  const c=card(item.alphanumeral,editing,{heading:field('heading',item.heading,editing),headingLevel:field('headingLevel',item.headingLevel,editing)});const input=freeze(data(c)),before=JSON.stringify(input);const html=render(Cards.EditorialTiles,input,editing,item.params);
  assert.deepEqual(badges(html),[{tag:item.expectedTag,text:item.alphanumeral}]);assert.match(html,/tile--alphaNumeric -is--split/);assert.ok(!html.includes('tileIcon -is--wide'));
  if(editing)assert.match(html,/test-badge-alphanumeral-field/);assert.equal(JSON.stringify(input),before);
 }
}));

for(const contentMode of ['fixture','connected']) {
 test(`${contentMode}: cleared and missing editor fields keep existing span placeholders without new visitor badges`,()=>mode(contentMode,()=>{
  for(const value of ['',undefined]){
   const c=card(value,true),input=freeze(data(c));assert.equal(badges(render(Cards.EditorialTiles,input,false,{})).length,0);
   const editor=render(Cards.EditorialTiles,input,true,{});assert.match(editor,/test-badge-alphanumeral-field/);assert.equal(badges(editor)[0]?.tag,'span');
  }
  const c=card('unused',true);delete c.alphanumeral;assert.equal(badges(render(Cards.EditorialTiles,freeze(data(c)),true,{})).length,0);
 }));
 test(`${contentMode}: numbered image tiles, Intro and ordinary Callout remain span`,()=>mode(contentMode,()=>{
  for(const editing of [false,true]) for(const [variant,params] of [['EditorialTiles',{layout:'image-left'}],['EditorialTiles',{layout:'image-right'}],['EditorialIntro',{}],['EditorialCallout',{}]]){
   const c=card('7',editing,{image:field('image',{src:'/test-only/picture.svg',alt:'Synthetic'},editing)}),input=freeze(data(c)),before=JSON.stringify(input);assert.deepEqual(badges(render(Cards[variant],input,editing,params)),[{tag:'span',text:'7'}]);assert.equal(JSON.stringify(input),before);
  }
 }));
 test(`${contentMode}: existing wide statistic Callout stays em with its width and stacked semantics`,()=>mode(contentMode,()=>{
  for(const editing of [false,true]){const html=render(Cards.EditorialCallout,freeze(data(card('27%',editing))),editing,{statisticStyle:'wide'});assert.deepEqual(badges(html),[{tag:'em',text:'27%'}]);assert.match(html,/tileIcon -is--wide/);assert.match(html,/tile--alphaNumeric -is--stacked/);}
 }));
 test(`${contentMode}: native fieldCollection and named data retain identical editing metadata and output`,()=>mode(contentMode,()=>{
  for(const editing of [false,true]){const c=card('3',editing),named=freeze(data(c));const projection=freeze({children:{results:[{id:c.id,fieldCollection:Object.entries(c).filter(([key])=>key!=='id').map(([name,value])=>({name,jsonValue:value.jsonValue}))}]}});assert.equal(render(Cards.EditorialTiles,projection,editing,{}),render(Cards.EditorialTiles,named,editing,{}));}
 }));
 test(`${contentMode}: changing or clearing only the badge preserves other native fields and original input`,()=>mode(contentMode,()=>{
  for(const value of ['1','2','', '0']){const input=freeze(data(card(value,true))),before=JSON.stringify(input),html=render(Cards.EditorialTiles,input,true,{});assert.match(html,/test-badge-heading-field/);assert.match(html,/test-badge-body-field/);assert.match(html,/Unchanged body/);assert.equal(badges(html)[0]?.tag,value?'em':'span');assert.equal(JSON.stringify(input),before);}
 }));
}
