import fs from 'node:fs';
import { field } from './runtime.mjs';

export const evidence = JSON.parse(fs.readFileSync(new URL('./release-source-manifest.json', import.meta.url), 'utf8'));
export const release = (row) => ({
  id: row.articleId ?? row.nativeIds.articleId,
  title: field(`${row.articleId ?? row.nativeIds.articleId}-title`, 'Single-Line Text', row.title),
  summary: field(`${row.articleId ?? row.nativeIds.articleId}-summary`, 'Rich Text', row.snippet ?? ''),
  releaseDate: field(`${row.articleId ?? row.nativeIds.articleId}-date`, 'Date', `${row.dateIso}T00:00:00Z`),
  parent: { parent: { id: row.pageId ?? row.nativeIds.pageId, url: { path: row.route } } },
});
export const archive = (year) => ({
  id: `archive-${year.year}`,
  heading: field('archive-heading', 'Single-Line Text', year.heading),
  releases: { targetItems: year.rows.map(release), total: year.count, pageInfo: { hasNext: false } },
});
export const collected = (item) => ({
  ...Object.fromEntries(Object.entries(item).filter(([name]) => ['id', 'parent', 'releases', 'release'].includes(name))),
  fieldCollection: Object.entries(item).filter(([, value]) => value && Object.hasOwn(value, 'jsonValue'))
    .map(([name, value]) => ({ name, jsonValue: value.jsonValue })),
});
export const normalize = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|nbsp|rsquo|lsquo|rdquo|ldquo|ndash|mdash|reg|trade|#174|#8482|#39|#x27);/g, (entity) => ({
  '&amp;': '&', '&nbsp;': ' ', '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“', '&ndash;': '–', '&mdash;': '—', '&reg;': '®', '&trade;': '™', '&#174;': '®', '&#8482;': '™', '&#39;': "'", '&#x27;': "'",
})[entity]).replace(/\s+/g, ' ').trim();
