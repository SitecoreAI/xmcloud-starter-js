import assert from 'node:assert/strict';

export const withoutFieldChrome = html => html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '');
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
// React and the SDK may serialize identical attributes in a different order.
// Retain every tag, attribute name/value, text node and child order in the comparison.
const canonicalAttributes = html => html.replace(/<([A-Za-z][\w:-]*)(\s[^<>]*?)?(\/?)>/g, (tag, name, attributes = '', close) => {
  const tokens = attributes.match(/[^\s=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s]+))?/g) ?? [];
  return `<${name}${tokens.length ? ` ${tokens.sort().join(' ')}` : ''}${close}>`;
});
const fieldIdentity = metadata => `${metadata.itemId ?? metadata.datasource?.id ?? ''}\0${metadata.fieldId}`;

/** Current canvas contract: only actual populated fields add native chrome;
 * metadata is not visible content, and removing it leaves the visitor DOM. */
export function assertWysiwygCanvas(visitor, editing, nativeData, message = '') {
  assert.doesNotMatch(editing, /\[No (?:text|image) in field\]|Additional content fields/, message);
  assert.equal(canonicalAttributes(withoutFieldChrome(editing)), canonicalAttributes(withoutFieldChrome(visitor)), message);
  const native = new Map();
  function collect(value) {
    if (!value || typeof value !== 'object') return;
    if (value.metadata?.fieldId) native.set(fieldIdentity(value.metadata), value.value);
    for (const child of Object.values(value)) collect(child);
  }
  collect(nativeData);
  for (const match of editing.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)) {
    const metadata = JSON.parse(decode(match[1]));
    assert.ok(native.has(fieldIdentity(metadata)), `${message}: original native field ${metadata.fieldId}`);
    const value = native.get(fieldIdentity(metadata));
    const populated = typeof value === 'string' ? !!value.trim() : typeof value === 'number' ? true
      : !!(value?.src?.trim() || value?.href?.trim() || value?.text?.trim());
    assert.ok(populated, `${message}: empty optional field ${metadata.fieldId} must not add a canvas control`);
  }
}
