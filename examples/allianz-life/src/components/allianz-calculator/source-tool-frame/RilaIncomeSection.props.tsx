'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { safeEditorialRichText } from 'lib/allianz-editorial';
import type { AllianzCalculatorProps } from '../allianz-calculator.props';
import { SourceToolFrame } from './SourceToolFrame.props';
import { RILA_INCOME_PRESETS, type RilaIncomePreset } from './rila-income-presets';

export function RilaIncomeSection({ fields, params, preset }: AllianzCalculatorProps & { preset: RilaIncomePreset }) {
  const { page } = useSitecore();
  const editing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  return <section className="allianz-rila-income-calculator" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      {shouldRenderTextField(data?.heading?.jsonValue, editing) && <Text editable={editing} tag="h2" field={data?.heading?.jsonValue} />}
      {shouldRenderTextField(data?.body?.jsonValue, editing) && <RichText editable={editing} field={safeEditorialRichText(data?.body?.jsonValue, editing, true)} className="o-richTextEditor__wrapper" />}
      <SourceToolFrame {...RILA_INCOME_PRESETS[preset]} />
      {shouldRenderTextField(data?.disclaimer?.jsonValue, editing) && <RichText editable={editing} field={safeEditorialRichText(data?.disclaimer?.jsonValue, editing, true)} className="o-richTextEditor__wrapper" />}
    </div></div></div>
  </section>;
}
