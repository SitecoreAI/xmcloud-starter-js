import type { Field } from '@sitecore-content-sdk/nextjs';
import { safeLink } from 'lib/allianz-fields';

const escapeAttribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const decodeAttribute = (value: string) => value.replace(/&#(?:x([\da-f]+)|(\d+));/gi, (entity, hex, decimal) => {
  const point = Number.parseInt(hex || decimal, hex ? 16 : 10);
  return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
}).replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>')
  .replaceAll('&colon;', ':').replaceAll('&Tab;', '\t').replaceAll('&NewLine;', '\n').replaceAll('&amp;', '&');

/** Reconcile visitor anchors with existing mock behavior, never native storage.
 * Editing receives the exact original Field, including empty value and metadata. */
export function safeNewsroomRichText(field: Field<string> | undefined, isEditing: boolean): Field<string> | undefined {
  if (!field || isEditing || !field.value) return field;
  const value = field.value.replace(/<a\b(?:[^'">]|"[^"]*"|'[^']*')*>/gi, (tag) => {
    // Consume each complete attribute, including quoted values, so a title or
    // data-href containing the word href cannot mask the actual destination.
    const attributes = [...tag.matchAll(/(\s+)([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)];
    const href = attributes.find((attribute) => attribute[2].toLowerCase() === 'href');
    if (!href) return tag;
    const link = safeLink({ value: { href: decodeAttribute(href[3] ?? href[4] ?? href[5] ?? '') } }).value;
    const destination = `${link.href ?? ''}${link.querystring ? `?${link.querystring}` : ''}${link.anchor ? `#${link.anchor}` : ''}`;
    const target = attributes.find((attribute) => attribute[2].toLowerCase() === 'target');
    const replacements = [{ index: href.index ?? 0, original: href[0], value: `${href[1]}href="${escapeAttribute(destination)}"` }];
    if (target) replacements.push({ index: target.index ?? 0, original: target[0], value: `${target[1]}target=""` });
    return replacements.sort((a, b) => b.index - a.index).reduce((result, replacement) =>
      result.slice(0, replacement.index) + replacement.value + result.slice(replacement.index + replacement.original.length), tag);
  });
  return value === field.value ? field : { ...field, value };
}
