import type { Field } from '@sitecore-content-sdk/nextjs';

// Exact shared geometry of the two saved source PDF link glyphs. Decorative:
// the authored parent span already supplies aria-hidden, without duplicate IDs.
const DOWNLOAD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M11.0088496,18.601 L5.41052947,13.1737857 C4.86315684,12.6431429 4.86315684,11.7854286 5.41052947,11.2547857 C5.9579021,10.7241429 6.84265787,10.7241429 7.3900305,11.2547857 L10.60007,14.3667143 L10.60007,1.35714286 C10.60007,0.606642857 11.2258387,0 12,0 C12.7741613,0 13.39993,0.606642857 13.39993,1.35714286 L13.39993,14.3667143 L16.6099695,11.2547857 C17.1573421,10.7241429 18.0420979,10.7241429 18.5894705,11.2547857 C19.1368432,11.7854286 19.1368432,12.6431429 18.5894705,13.1737857 L12.9911504,18.601 C12.8623569,18.7272143 12.7069647,18.8262857 12.5347733,18.8955 C12.3639818,18.9647143 12.1819909,19 12,19 C11.8180091,19 11.6360182,18.9647143 11.4652267,18.8955 C11.2930353,18.8262857 11.1376431,18.7272143 11.0088496,18.601 Z M22.9090909,18 C23.5104545,18 24,18.4669565 24,19.0434783 L24,22.9565217 C24,23.5317391 23.5104545,24 22.9090909,24 L1.09090909,24 C0.489545455,24 0,23.5317391 0,22.9565217 L0,19.0434783 C0,18.4669565 0.489545455,18 1.09090909,18 C1.69227273,18 2.18181818,18.4669565 2.18181818,19.0434783 L2.18181818,21.9130435 L21.8181818,21.9130435 L21.8181818,19.0434783 C21.8181818,18.4669565 22.3077273,18 22.9090909,18 Z"/></svg>';

const VOID_TAGS = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
// Conservatively skip raw-text, RCDATA, inert, conditional and legacy containers.
const NON_SCANNABLE_TAGS = new Set([
  'script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes',
  'noscript', 'plaintext', 'template', 'listing',
]);

type Frame = {
  name: string;
  anchor?: { slots: number; insertions: number[] };
  icon?: { start: number; anchor: NonNullable<Frame['anchor']> };
};

/** Parse attributes without treating quoted href/class-looking text as markup. */
function attributes(source: string): Map<string, string> | undefined {
  const result = new Map<string, string>();
  const attribute = /\s+([a-z_:][\w.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/giy;
  let cursor = 0;
  while (cursor < source.length) {
    if (!source.slice(cursor).trim()) break;
    attribute.lastIndex = cursor;
    const match = attribute.exec(source);
    if (!match) return undefined;
    const name = match[1].toLowerCase();
    if (result.has(name)) return undefined;
    result.set(name, match[2] ?? match[3] ?? match[4] ?? '');
    cursor = attribute.lastIndex;
  }
  return result;
}

/** Explicit BodyDownloadLinks presentation only; never changes stored/editing HTML. */
export function bodyDownloadLinkGlyphs(
  field: Field<string> | undefined,
  isEditing: boolean
): Field<string> | undefined {
  if (isEditing !== false || !field || typeof field.value !== 'string' || !field.value) return field;
  const source = field.value;
  const tags = /<!--[\s\S]*?-->|<\/?[a-z][^"'<>]*(?:(?:"[^"]*"|'[^']*')[^"'<>]*)*>/gi;
  const stack: Frame[] = [];
  const insertions: number[] = [];
  let cursor = 0;
  for (const match of source.matchAll(tags)) {
    const start = match.index;
    // Unsupported or malformed markup stays byte-identical rather than repaired.
    if (source.slice(cursor, start).includes('<')) return field;
    const tag = match[0];
    cursor = start + tag.length;
    if (tag.startsWith('<!--')) continue;
    const opening = /^<(\/?)([a-z][\w:-]*)/i.exec(tag);
    if (!opening) return field;
    const name = opening[2].toLowerCase();
    if (NON_SCANNABLE_TAGS.has(name)) return field;
    if (opening[1]) {
      if (!/^<\/[a-z][\w:-]*\s*>$/i.test(tag)) return field;
      const frame = stack.pop();
      if (!frame || frame.name !== name) return field;
      if (frame.icon && !source.slice(frame.icon.start, start).trim()) {
        frame.icon.anchor.insertions.push(frame.icon.start);
      }
      if (frame.anchor?.slots === 1 && frame.anchor.insertions.length === 1) {
        insertions.push(frame.anchor.insertions[0]);
      }
      continue;
    }
    const attrs = attributes(tag.slice(opening[0].length, tag.endsWith('/>') ? -2 : -1));
    if (!attrs) return field;
    const classes = (attrs.get('class') ?? '').split(/\s+/);
    if (name === 'a' && stack.some((frame) => frame.name === 'a')) return field;
    const frame: Frame = { name };
    if (name === 'a' && classes.includes('a-link')) frame.anchor = { slots: 0, insertions: [] };
    const parent = stack.at(-1);
    if (name === 'span' && classes.includes('a-link__icon') && parent?.anchor) {
      parent.anchor.slots += 1;
      if (attrs.get('aria-hidden') === 'true') frame.icon = { start: cursor, anchor: parent.anchor };
    }
    if (!VOID_TAGS.has(name) && !tag.endsWith('/>')) stack.push(frame);
  }
  if (stack.length || source.slice(cursor).includes('<') || !insertions.length) return field;
  const value = insertions.sort((a, b) => b - a).reduce((html, at) =>
    html.slice(0, at) + DOWNLOAD_SVG + html.slice(at), source);
  return { ...field, value };
}


// Exact source Right geometry. The source icon span carries the decorative role.
const RIGHT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536"/></svg>';

/** Source-owned single bare Body anchor only; never rewrites authored/editing HTML. */
export function bodyArrowLinkGlyphs(
  field: Field<string> | undefined,
  isEditing: boolean
): Field<string> | undefined {
  if (isEditing !== false || !field || typeof field.value !== 'string' || !field.value) return field;
  // A complete classless text anchor is the finite input contract for this variant.
  // Structured content, existing presentations and ambiguous markup remain untouched.
  const match = /^(\s*)(<a(?=\s|>)[^"'<>]*(?:(?:"[^"]*"|'[^']*')[^"'<>]*)*>)([^<]*)(<\/a\s*>)(\s*)$/i.exec(field.value);
  if (!match || match[2].endsWith('/>') || !match[3].trim()) return field;
  const attrs = attributes(match[2].slice(2, -1));
  if (!attrs || attrs.has('class') || !attrs.get('href')?.trim()) return field;
  const value = match[1] + '<footer><div class="tileLink u-margin-top-md u-margin-bottom-md">' +
    match[2].slice(0, -1) + ' class="a-link">' +
    '<span aria-hidden="true" class="a-link__icon">' + RIGHT_SVG + '</span>' +
    '<span class="a-link__text">' + match[3] + '</span>' + match[4] + '</div></footer>' + match[5];
  return { ...field, value };
}
