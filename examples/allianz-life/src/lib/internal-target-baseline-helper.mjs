// Test-only bridge for sealed pre-policy DOM hashes. The historical renderer
// must still match its original hash; every current-render difference is checked
// independently and may change only an internal page's target and safe rel tokens.
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadSource, sourceRoot } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';
const fields = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const tokens = value => (value ?? '').split(/\s+/).filter(Boolean);
const internalPage = href => /^(?:\/(?!\/)|#|\?)/.test(href ?? '')
  && !/^#(?:service|demo)-unavailable$/.test(href)
  && !/\.(?:pdf|docx?|xlsx?|pptx?|csv|zip|mp4|mp3)(?:[?#]|$)/i.test(href);

export function withLegacyInternalTargets(run) {
  const original = fields.safeLink, originalProps = fields.safeLinkRenderProps;
  const restore = (output, input) => internalPage(output?.value?.href) && output.value.target === ''
    && input?.value?.target && input.value.target.toLowerCase() !== '_self'
    ? { ...output, value: { ...output.value, target: input.value.target } } : output;
  fields.safeLink = input => restore(original(input), input);
  fields.safeLinkRenderProps = (input, editing) => {
    const props = originalProps(input, editing), field = restore(props.field, input);
    if (field === props.field) return props;
    const rel = tokens(props.rel);
    if (field.value.target.toLowerCase() === '_blank') {
      const present = new Set(rel.map(token => token.toLowerCase()));
      for (const token of ['noopener', 'noreferrer']) if (!present.has(token)) rel.push(token);
    }
    return { ...props, field, rel: rel.length ? rel.join(' ') : undefined };
  };
  try { return run(); } finally { fields.safeLink = original; fields.safeLinkRenderProps = originalProps; }
}

export function assertOnlyInternalTargetChanges(current, legacy, label = '') {
  const anchors = html => [...html.matchAll(/<a\b(?:[^'">]|"[^"]*"|'[^']*')*>/gi)];
  const a = anchors(current), b = anchors(legacy);
  assert.equal(a.length, b.length, `${label}: anchor count`);
  let reverted = current;
  for (let i = a.length - 1; i >= 0; i--) {
    if (a[i][0] === b[i][0]) continue;
    const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1];
    const href = attr(a[i][0], 'href');
    assert.equal(href, attr(b[i][0], 'href'), `${label}: href retained`);
    assert.ok(internalPage(href), `${label}: external/document anchor cannot change`);
    assert.equal(attr(a[i][0], 'target'), '', `${label}: current target`);
    assert.ok(attr(b[i][0], 'target'), `${label}: historical explicit target`);
    assert.notEqual(attr(b[i][0], 'target').toLowerCase(), '_self');
    const omitTargetRel = tag => tag.replace(/\s(?:target|rel)="[^"]*"/gi, '');
    assert.equal(omitTargetRel(a[i][0]), omitTargetRel(b[i][0]), `${label}: other attributes retained`);
    const currentRel = tokens(attr(a[i][0], 'rel'));
    const legacyRel = tokens(attr(b[i][0], 'rel'));
    assert.ok(currentRel.every(token => legacyRel.includes(token)), `${label}: authored rel retained`);
    assert.ok(legacyRel.filter(token => !currentRel.includes(token))
      .every(token => ['noopener', 'noreferrer'].includes(token.toLowerCase())), `${label}: rel delta is safety tokens only`);
    reverted = reverted.slice(0, a[i].index) + b[i][0] + reverted.slice(a[i].index + a[i][0].length);
  }
  assert.equal(reverted, legacy, `${label}: every non-link byte retained`);
}
