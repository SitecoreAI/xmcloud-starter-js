import type { ComponentProps } from 'lib/component-props';

const CLASS_TOKEN = /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/;
const ITEM_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i;
const ALIGNMENT = /^position-(left|center|right)$/;

/** Placeholder resolves SXA Styles into params.styles; raw item IDs are not CSS classes. */
export function getProductIntroductionStyles(params?: ComponentProps['params']) {
  const styles = typeof params?.styles === 'string' ? params.styles : '';
  const tokens = [...new Set(styles.split(/\s+/).filter((token) =>
    CLASS_TOKEN.test(token) && !ITEM_ID.test(token)))];
  const alignments = tokens.filter((token) => ALIGNMENT.test(token));
  const alignment = alignments.length === 1 ? alignments[0].slice('position-'.length) : 'center';

  return {
    wrapperStyles: tokens.filter((token) => alignments.length <= 1 || !ALIGNMENT.test(token)).join(' '),
    // An outer alignment class cannot override the source's inner !important utility.
    contentAlignmentClass: `u-text-${alignment}`,
  };
}
