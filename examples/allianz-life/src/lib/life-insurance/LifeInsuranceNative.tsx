'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import type { AllianzCalculatorProps } from 'components/allianz-calculator/allianz-calculator.props';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { LifeInsuranceRuntime } from './LifeInsuranceRuntime';

/** The native datasource owns the surrounding copy; the source widget owns its controls. */
export function LifeInsuranceNative({ fields, params }: AllianzCalculatorProps) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;

  return <section className="allianz-life-insurance-calculator" id={params.RenderingIdentifier}>
    {(shouldRenderTextField(data?.heading?.jsonValue, isEditing) ||
      shouldRenderTextField(data?.body?.jsonValue, isEditing)) &&
      <div className="l-container--full-width u-row-spacing t-bg-transparent"><div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
        {shouldRenderTextField(data?.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data?.heading?.jsonValue} />}
        {shouldRenderTextField(data?.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data?.body?.jsonValue} className="o-richTextEditor__wrapper" />}
      </div></div></div></div>}
    <div className="l-container--full-width u-row-spacing t-bg-transparent axlTileCollection"><div className="l-grid l-grid--max-width"><div className="l-grid__row u-margin-bottom-xl"><div className="l-grid__column-medium-12"><div className="o-richTextEditor__wrapper">
      <LifeInsuranceRuntime />
    </div></div></div></div></div>
    {shouldRenderTextField(data?.disclaimer?.jsonValue, isEditing) &&
      <div className="l-container--full-width t-bg-grey-muted"><div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
        <RichText editable={isEditing} field={data?.disclaimer?.jsonValue} className="o-richTextEditor__wrapper" />
      </div></div></div></div>}
  </section>;
}
