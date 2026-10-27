/** Finite visual projection of three native Index category Bodies; original fields remain authoritative. */
export const INDEX_PAGE_ID = 'e8e1893aff9b4b4a81bca809693ccf88';

const CATEGORIES: Record<string, readonly string[]> = {
  '277ec94744684457a9932d7390ca7ed7': [
    'BlackRock iBLD Claria® ER Index',
    'Bloomberg US Dynamic Balance II ER Index',
    'Bloomberg US Dynamic Balance III ER Index',
    'Morgan Stanley Strategic Trends 10 ER Index',
    'PIMCO Tactical Balanced ER Index',
    'S&amp;P 500® Futures Daily Risk Control 5% Index',
  ],
  'e6bb2401417845c8b77ed8ad04ed3fb3': ['Bloomberg US Dynamic Balance Index II'],
  'cc125c778b7d4191841695b468d978fc': [
    'Blended Futures Index', 'Nasdaq-100® Index', 'Russell 2000® Index',
    'S&amp;P 500® Index', 'S&amp;P 500® Futures Index ER',
  ],
};

const nativeID = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const id = value.replace(/^\{(.+)\}$/, '$1');
  return /^(?:[a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i.test(id)
    ? id.replace(/-/g, '').toLowerCase() : undefined;
};

type Block = { headingHTML: string; answerHTML: string };
export type CategoryProjection = {
  html: string; blocks: Block[]; originalHTML: string; leadingWhitespace: string;
  ownerID: string; disclosureCount: number;
};

/**
 * The three witnessed bodies have a deliberately narrow grammar:
 * top-level h4 / p / ol; ol contains li; only p may contain an HTTPS anchor.
 * Anchors retain the legacy form or the exact explanatory title required by the
 * native new-window validator. Other attributes, nesting, text or headings reject.
 * Character ranges are retained verbatim; no entity, text or link rewriting.
 */
function blocksFromExactGrammar(html: string, expectedTitles: readonly string[]):
  { blocks: Block[]; leadingWhitespace: string } | undefined {
  const tokens = /<[^>]*>/g;
  const stack: string[] = [];
  const headings: { start: number; end: number; inner: string }[] = [];
  let cursor = 0;
  let headingStart = -1;
  let headingInnerStart = -1;
  let match: RegExpExecArray | null;
  while ((match = tokens.exec(html))) {
    const between = html.slice(cursor, match.index);
    if (between.includes('<') || between.includes('>')
      || ((!stack.length || stack.at(-1) === 'ol') && between.trim())) return undefined;
    const tag = match[0];
    const closing = /^<\/(h4|p|a|ol|li)>$/.exec(tag);
    if (closing) {
      if (stack.pop() !== closing[1]) return undefined;
      if (closing[1] === 'h4') headings.push({ start: headingStart, end: tokens.lastIndex,
        inner: html.slice(headingInnerStart, match.index) });
    } else {
      const plain = /^<(h4|p|ol|li)>$/.exec(tag);
      const anchor = /^<a href="([^"]+)" target="_blank"(?: title="Opens in a new window")?>$/.exec(tag);
      const name = plain?.[1] ?? (anchor ? 'a' : undefined);
      if (!name) return undefined;
      const parent = stack.at(-1);
      if (name === 'a') {
        if (parent !== 'p' || !anchor) return undefined;
        try { if (new URL(anchor[1]).protocol !== 'https:') return undefined; }
        catch { return undefined; }
      } else if (name === 'li') {
        if (parent !== 'ol') return undefined;
      } else if (parent) return undefined;
      if (name === 'h4') { headingStart = match.index; headingInnerStart = tokens.lastIndex; }
      stack.push(name);
    }
    cursor = tokens.lastIndex;
  }
  if (stack.length || html.slice(cursor).trim() || headings.length !== expectedTitles.length) return undefined;
  if (!headings.length || headings.some((h, i) => h.inner !== expectedTitles[i])) return undefined;
  const leadingWhitespace = html.slice(0, headings[0].start);
  if (leadingWhitespace.trim()) return undefined;
  const blocks = headings.map((heading, index) => ({
    headingHTML: html.slice(heading.start, heading.end),
    answerHTML: html.slice(heading.end, headings[index + 1]?.start ?? html.length),
  }));
  if (blocks.some((block) => !block.answerHTML.trim() || !/^\s*<p>/.test(block.answerHTML))) return undefined;
  return { blocks, leadingWhitespace };
}

/** React useId() supplies a hydration-stable, per-instance token. Encoding is injective. */
function instanceID(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length < 128
    ? Array.from(value, (c) => c.codePointAt(0)!.toString(16)).join('-') : undefined;
}

export function projectIndexCategoryBody(input: {
  pageID: unknown; ownerID: unknown; renderingUID: unknown; instanceToken: unknown; html: unknown;
}): CategoryProjection | undefined {
  const page = nativeID(input.pageID), owner = nativeID(input.ownerID), rendering = nativeID(input.renderingUID);
  const instance = instanceID(input.instanceToken);
  if (page !== INDEX_PAGE_ID || !owner || !Object.hasOwn(CATEGORIES, owner)
    || !rendering || !instance || typeof input.html !== 'string') return undefined;
  const parsed = blocksFromExactGrammar(input.html, CATEGORIES[owner]);
  if (!parsed) return undefined;
  const prefix = `index-category-${owner}-${rendering}-${instance}`;
  const html = parsed.leadingWhitespace + parsed.blocks.map((block, index) => {
    const id = `${prefix}-${index + 1}`;
    // Native details/summary provides expanded state, keyboard operation and focus.
    // No stale aria-expanded, injected link handler, or editable projected value.
    return `<details class="allianz-index-category-disclosure" id="${id}">`
      + `<summary id="${id}-summary" aria-controls="${id}-answer">${block.headingHTML}</summary>`
      + `<div id="${id}-answer" class="allianz-index-category-answer">${block.answerHTML}</div></details>`;
  }).join('');
  return { html, ...parsed, originalHTML: input.html, ownerID: owner, disclosureCount: parsed.blocks.length };
}

