import type { Field } from '@sitecore-content-sdk/nextjs';
import { safeLink } from './allianz-fields';

/** Finite editorial options; never interpolate arbitrary CMS class strings. */
export const editorialBodyClass = (size?: string) =>
  `tileBody${size === 'medium' ? ' u-font-size-md' : size === 'large' ? ' u-font-size-lg' : size === 'extra-large' ? ' u-font-size-xl' : ''}`;

export const editorialColumnClass = (params: Record<string, string | undefined>) =>
  params.sourceWidth === 'centered-eight'
    ? 'l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12'
    : params.columns === '2' ? 'l-grid__column-medium-6'
    : params.columns === '3' ? 'l-grid__column-medium-4' : 'l-grid__column-medium-12';

export const editorialHeadingTag = (level?: string): 'h2' | 'h3' | 'h4' =>
  level === 'h4' ? 'h4' : level === 'h3' ? 'h3' : 'h2';

export const hasEditorialBlockMarkup = (value?: string) =>
  /<(?:address|article|aside|blockquote|div|dl|fieldset|figure|footer|form|h[1-6]|header|hr|main|nav|ol|p|pre|section|table|ul)\b/i.test(value ?? '');

const escapeAttribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const decodeAttribute = (value: string) => value.replace(/&#(?:x([\da-f]+)|(\d+));/gi, (entity, hex, decimal) => {
  const point = Number.parseInt(hex || decimal, hex ? 16 : 10);
  return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
}).replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>')
  .replaceAll('&colon;', ':').replaceAll('&Tab;', '\t').replaceAll('&NewLine;', '\n').replaceAll('&amp;', '&');

/** Visitor-only link policy. Original content and SDK editing metadata stay intact.
 * Internal page targets follow safeLink; document and external targets remain authored. */
export function safeEditorialRichText(field: Field<string> | undefined, isEditing: boolean, internalPagesOnly = false,
  retainHref?: (href: string) => boolean): Field<string> | undefined {
  if (!field || isEditing || !field.value) return field;
  const value = field.value.replace(/<a\b(?:[^'">]|"[^"]*"|'[^']*')*>/gi, (tag) => {
    const attrs = [...tag.matchAll(/(\s+)([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)];
    const attr = (name: string) => attrs.find((item) => item[2].toLowerCase() === name);
    const contents = (item: RegExpMatchArray | undefined) => decodeAttribute(item?.[3] ?? item?.[4] ?? item?.[5] ?? '');
    const href = attr('href');
    if (!href || retainHref?.(contents(href))) return tag;
    const target = attr('target');
    const rel = attr('rel');
    const link = safeLink({ value: { href: contents(href), target: contents(target),
      ...(attr('download') ? { download: contents(attr('download')) } : {}) } }).value;
    const destination = `${link.href ?? ''}${link.querystring ? `?${link.querystring}` : ''}${link.anchor ? `#${link.anchor}` : ''}`;
    // Native bodies retain their existing asset/external anchors byte-for-byte.
    // This mode only normalizes supported internal page navigation.
    if (internalPagesOnly && (!/^(?:\/(?!\/)|#|\?)/.test(destination)
      || destination === '#service-unavailable' || destination === '#demo-unavailable'
      || /\.(?:pdf|docx?|xlsx?|pptx?|csv|zip|mp4|mp3)(?:[?#]|$)/i.test(destination)
      || attr('download'))) return tag;
    // Already-local same-tab markup remains byte-for-byte unchanged. An official
    // absolute page URL still needs local rebasing even when its target is _self.
    if (internalPagesOnly && destination === contents(href) && (!target || contents(target) === (link.target ?? ''))) return tag;
    const changes = [{ index: href.index ?? 0, length: href[0].length, value: `${href[1]}href="${escapeAttribute(destination)}"` }];
    if (target && contents(target) !== link.target) changes.push({ index: target.index ?? 0, length: target[0].length, value: `${target[1]}target="${escapeAttribute(link.target ?? '')}"` });
    let append = '';
    if (link.target?.toLowerCase() === '_blank') {
      const tokens = contents(rel).split(/\s+/).filter(Boolean);
      const existing = new Set(tokens.map((token) => token.toLowerCase()));
      const safeRel = [...tokens, ...['noopener', 'noreferrer'].filter((token) => !existing.has(token))].join(' ');
      if (rel) changes.push({ index: rel.index ?? 0, length: rel[0].length, value: `${rel[1]}rel="${escapeAttribute(safeRel)}"` });
      else append = ` rel="${escapeAttribute(safeRel)}"`;
    }
    const result = changes.sort((a, b) => b.index - a.index).reduce((text, change) =>
      text.slice(0, change.index) + change.value + text.slice(change.index + change.length), tag);
    return append ? result.replace(/\s*\/?>$/, `${append}>`) : result;
  });
  return value === field.value ? field : { ...field, value };
}
