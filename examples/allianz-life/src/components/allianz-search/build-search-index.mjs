/** Regenerate after editorial extraction; only public title/intro metadata is bundled. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = JSON.parse(readFileSync(new URL('../../../content/native-content.json', import.meta.url), 'utf8'));
const text = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16))).replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number))).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (entity) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[entity]).replace(/\s+/g, ' ').trim();
const index = Object.values(source.routes).filter((route) => {
  const url = new URL(route.sourceUrl);
  return url.hostname === 'www.allianzlife.com' && !/^\/(?:new-york\/)?(?:login|registration|spa|api|secured)(?:\/|$)/i.test(route.path);
}).map((route) => {
  const bodies = route.components.map((component) => component.fields?.data?.datasource?.body?.jsonValue?.value).filter(Boolean);
  return { path: route.path, title: text(route.title).replace(/\s*\|\s*Allianz Life$/, ''), description: text(route.description || bodies.join(' ')).slice(0, 260) };
}).sort((a, b) => a.path.localeCompare(b.path));
const destination = new URL('./search-index.json', import.meta.url);
writeFileSync(destination, JSON.stringify(index, null, 2) + '\n');
console.log(`${index.length} public routes indexed in ${fileURLToPath(destination)}`);
