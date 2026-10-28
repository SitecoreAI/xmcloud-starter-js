import contract from './source-ui-contract.json';
import type { LifeUiCopy, SourceFieldCopy } from './life-ui.props';
import type { LifeField } from './life-ui-model';

/** Structural mapping only; all visible copy comes verbatim from the verified source contract. */
export const lifeUiCopy: LifeUiCopy = {
  stages: contract.stages.map((stage) => ({ id: stage.id, name: stage.name, introduction: stage.intro })),
  fields: Object.fromEntries(contract.fields.map((field) => [field.name, {
    label: field.label,
    help: field.help,
    placeholder: field.placeholder ?? undefined,
    type: field.type === 'radio' ? 'yes/no' : field.currency ? 'currency' : field.percent ? 'percent' : 'number',
    htmlType: field.type === 'number' ? 'number' : 'text',
  } satisfies SourceFieldCopy])) as Record<LifeField, SourceFieldCopy>,
  buttons: { next: contract.controls.continue, print: contract.controls.print },
  partnerOptions: {
    yes: contract.fields.find((field) => field.name === 'hasPartner')!.options![0].label,
    no: contract.fields.find((field) => field.name === 'hasPartner')!.options![1].label,
  },
  summary: {
    heading: contract.summary.heading,
    rows: contract.summary.topFields,
    tables: contract.summary.tables,
    warning: contract.summary.invalidWarning,
    externalDescriptionLinkText: contract.summary.descriptionLinkText,
  },
};
