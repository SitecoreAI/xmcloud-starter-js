export const RILA_INCOME_PRESETS = {
  'income-adv': {
    preset: 'income-adv',
    src: '/allianz-assets/rila-income/income-adv.html',
    title: 'Allianz Index Advantage Income ADV income calculator',
    sourcePagePath: '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-income-adv/income-calculator',
  },
  'income-plus': {
    preset: 'income-plus',
    src: '/allianz-assets/rila-income/plus-income.html',
    title: 'Allianz Index Advantage+ Income income calculator',
    sourcePagePath: '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-income/income-calculator',
  },
  'income-select': {
    preset: 'income-select',
    src: '/allianz-assets/rila-income/plus-select-income.html',
    title: 'Allianz Index Advantage+ Select Income income calculator',
    sourcePagePath: '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-select-income/income-calculator',
  },
} as const;

export type RilaIncomePreset = keyof typeof RILA_INCOME_PRESETS;

/** Explicit native keys only. No path fallback or authored iframe destination. */
export function rilaIncomePreset(schemaKey: string | undefined): RilaIncomePreset | null {
  if (schemaKey === 'rila-income-adv-source') return 'income-adv';
  if (schemaKey === 'rila-income-plus-source') return 'income-plus';
  if (schemaKey === 'rila-income-select-source') return 'income-select';
  return null;
}
