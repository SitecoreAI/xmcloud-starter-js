import type { Field } from '@sitecore-content-sdk/nextjs';

const attributes = (value: string) => [...value.matchAll(/(?:^|\s)([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
  .map((match) => ({ name: match[1].toLowerCase(), value: match[2] ?? match[3] ?? match[4] ?? '' }));

const attribute = (value: string, name: string) => attributes(value).find((item) => item.name === name);
const hasClass = (value: string, name: string) => attribute(value, 'class')?.value.split(/\s+/).includes(name);

/** CKEditor moves the source table caption to its enclosing figure on save.
 * Name that table from the retained caption for visitors. Never rewrite the
 * SDK editing field, its chrome, or the author's saved HTML. */
export function financialRatingsRichText(
  field: Field<string> | undefined,
  isEditing: boolean,
  cardId: string,
): Field<string> | undefined {
  if (!field || isEditing || !field.value) return field;
  const id = cardId.replace(/[{}-]/g, '').toLowerCase();
  if (!/^[a-f\d]{32}$/.test(id)) return field;
  let index = 0;
  const value = field.value.replace(/<figure\b((?:[^'"<>]|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/figure\s*>/gi, (figure, figureAttrs: string, contents: string) => {
    if (!hasClass(figureAttrs, 'table')) return figure;
    const parts = contents.match(/^(\s*)<table\b((?:[^'"<>]|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/table\s*>(\s*)<figcaption\b((?:[^'"<>]|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/figcaption\s*>(\s*)$/i);
    if (!parts || !hasClass(parts[2], 'c-table') || /<table\b|<caption\b/i.test(parts[3])) return figure;
    const captionText = parts[6].replace(/<!--[\s\S]*?-->|<[^>]*>/g, '').replace(/&(?:nbsp|#0*160|#x0*a0);/gi, ' ').trim();
    if (!captionText) return figure;
    index += 1;
    if (attribute(parts[2], 'aria-label') || attribute(parts[2], 'aria-labelledby')) return figure;
    const existingId = attribute(parts[5], 'id');
    if (existingId && (!existingId.value || /\s/.test(existingId.value))) return figure;
    const captionId = existingId?.value ?? `allianz-rating-${id}-caption-${index}`;
    // Retain entity spelling from an existing HTML id; escape literal double
    // quotes without double-encoding its entities in the new attribute.
    const reference = captionId.replaceAll('"', '&quot;').replaceAll('<', '&lt;');
    const captionAttrs = existingId ? parts[5] : `${parts[5]} id="${captionId}"`;
    return `<figure${figureAttrs}>${parts[1]}<table${parts[2]} aria-labelledby="${reference}">${parts[3]}</table>${parts[4]}<figcaption${captionAttrs}>${parts[6]}</figcaption>${parts[7]}</figure>`;
  });
  return value === field.value ? field : { ...field, value };
}
