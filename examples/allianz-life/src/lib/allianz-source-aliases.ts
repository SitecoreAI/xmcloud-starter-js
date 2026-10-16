import type { Field } from '@sitecore-content-sdk/nextjs';

// These exact links occur in the captured press-release source manifest. The
// source site resolves its vanity URLs; the migrated site has no vanity routes.
// Preserve the source author's destination without inventing native vanity pages.
const SOURCE_ALIASES: Readonly<Record<string, string>> = {
  '/careers': 'http://www.allianzlife.com/careers',
  '/culture': 'http://www.allianzlife.com/culture',
  '/allianzfortomorrow': 'http://www.allianzlife.com/allianzfortomorrow',
  '/AllianzForTomorrow': 'http://www.allianzlife.com/AllianzForTomorrow',
};

export function originalSourceAliasHref(href: string): string | undefined {
  const pathname = href.split(/[?#]/, 1)[0];
  const destination = Object.hasOwn(SOURCE_ALIASES, pathname) ? SOURCE_ALIASES[pathname] : undefined;
  return destination ? `${destination}${href.slice(pathname.length)}` : undefined;
}

/** Only repair localized source aliases for visitors; keep editable fields intact. */
export function restoreSourceAliasRichText(
  field: Field<string> | undefined,
  isEditing: boolean
): Field<string> | undefined {
  if (!field || isEditing || !field.value) return field;
  const value = field.value.replace(/<a\b(?:[^'">]|"[^"]*"|'[^']*')*>/gi, (tag) =>
    // Consume complete quoted attributes before looking for the actual href.
    // An unanchored search can mistake href-looking text in a title for a link.
    tag.replace(/^(<a\b(?:[^'">]|"[^"]*"|'[^']*')*?\s+href\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
      (attribute, prefix, doubleQuoted, singleQuoted, unquoted) => {
        const href = doubleQuoted ?? singleQuoted ?? unquoted;
        const destination = originalSourceAliasHref(href);
        if (!destination) return attribute;
        const quote = doubleQuoted !== undefined ? '"' : singleQuoted !== undefined ? "'" : '';
        return `${prefix}${quote}${destination}${quote}`;
      })
  );
  return value === field.value ? field : { ...field, value };
}
