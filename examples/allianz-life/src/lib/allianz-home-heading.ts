import type { Field } from '@sitecore-content-sdk/nextjs';

/** A content-model check, not a sanitizer: admitted inline markup stays unchanged. */
function isHeroPhrasing(value: string): boolean {
  const stack: string[] = [];
  let rest = value;
  while (rest.includes('<')) {
    rest = rest.slice(rest.indexOf('<'));
    const closing = /^<\/(span|strong)\s*>/i.exec(rest);
    if (closing) {
      if (stack.pop() !== closing[1].toLowerCase()) return false;
      rest = rest.slice(closing[0].length);
      continue;
    }
    const opening = /^<(span|strong|br)\b(?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>`=]+))?)*\s*(\/?)>/i.exec(rest);
    if (!opening) return false;
    const tag = opening[1].toLowerCase();
    if (tag !== 'br') {
      if (opening[2]) return false;
      stack.push(tag);
    }
    rest = rest.slice(opening[0].length);
  }
  return stack.length === 0;
}

/** Native editing retains its original field; visitors get a valid home H1 surface. */
export function homeHeroHeadingField(
  field: Field<string> | undefined,
  home: boolean,
  isEditing: boolean,
): Field<string> | undefined {
  if (!home || isEditing || !field || typeof field.value !== 'string') return field;
  const value = field.value.trim();
  // These editor wrappers have no authored attributes to discard. Anything more
  // complex keeps the established block-heading surface and original field.
  const wrapper = /^<div class=(?:"ck-content"|'ck-content')>\s*<p>([\s\S]*)<\/p>\s*<\/div>$/.exec(value)
    ?? /^<p>([\s\S]*)<\/p>$/.exec(value);
  if (!wrapper || !isHeroPhrasing(wrapper[1])) return field;
  return { ...field, value: wrapper[1] };
}
