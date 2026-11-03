export const RILA_STRATEGY_PRESETS = {
  'strategy-plus': {
    preset: 'strategy-plus',
    src: '/allianz-assets/rila-strategy/index-advantage-plus.html',
    title: 'Allianz Index Advantage+ strategy calculator',
    sourcePagePath: '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus/calculator',
    viewportProfile: 'strategy-mobile',
  },
} as const;

export type RilaStrategyPreset = keyof typeof RILA_STRATEGY_PRESETS;

/** One exact native key; neither routes nor authored URLs choose source frames. */
export function rilaStrategyPreset(schemaKey: string | undefined): RilaStrategyPreset | null {
  return schemaKey === 'rila-strategy-plus-source' ? 'strategy-plus' : null;
}
