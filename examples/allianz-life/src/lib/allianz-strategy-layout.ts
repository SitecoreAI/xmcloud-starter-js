/** Finite source compositions. Variant selection supplies presentation only;
 * authored children stay in their native query order and are each rendered once. */
export type StrategyLayout = 'intro' | 'brand-intro' | 'intro-split' | 'intro-tiles'
  | 'intro-flipped-tiles' | 'intro-resources' | 'stacked-pair';

export function strategyCardPresentation(layout: StrategyLayout, index: number) {
  const intro = layout === 'intro' || layout === 'brand-intro'
    || (layout !== 'stacked-pair' && index === 0);
  const split = !intro && layout === 'intro-split';
  const stacked = layout === 'stacked-pair';
  return {
    intro,
    resource: !intro && layout === 'intro-resources',
    stacked,
    split,
    flipped: stacked ? index > 0 : !intro && layout === 'intro-flipped-tiles',
    alignment: split || (stacked && index === 0) ? 'left' : 'center',
    columnClass: intro ? 'l-grid__column-medium-12'
      : split ? 'l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12'
      : stacked ? 'l-grid__column-medium-6' : 'l-grid__column-medium-4',
    bodySize: intro ? 'source-default' : stacked ? 'large' : 'medium',
    brandIcon: layout === 'brand-intro',
  } as const;
}
