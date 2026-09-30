'use client';
import { Link, RichText, Text } from '@sitecore-content-sdk/nextjs';
import { useState } from 'react';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { rowSpacing, safeLink, sectionTheme } from 'lib/allianz-fields';
import type { AllianzAccordionProps } from './allianz-accordion.props';

export const Default = ({ fields, params, page }: AllianzAccordionProps) => {
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12"><div className="l-grid l-grid--max-width l-grid--no-gutters-mobile"><div className="l-grid__row justify-content-center"><div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
      {data.heading?.jsonValue?.value && <Text field={data.heading.jsonValue} tag="h2" className="c-heading u-text-center" />}
      {data.primaryLink?.jsonValue?.value?.href && <Link field={safeLink(data.primaryLink.jsonValue)} className="a-link" />}
      <div className="c-accordion c-accordion--light">
        {(data.children?.results ?? []).map((entry) => {
          const expanded = page?.mode.isEditing || open.includes(entry.id);
          return <div key={entry.id} className="c-accordion__item-wrapper">
            <button id={`accordion-trigger-${entry.id}`} type="button" className="c-accordion__trigger" aria-expanded={expanded} aria-controls={`accordion-${entry.id}`} onClick={() => setOpen(expanded ? open.filter((id) => id !== entry.id) : [...open,entry.id])}>
              <Text field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" /><span aria-hidden="true" className="c-accordion__chevron a-icon"><svg viewBox="0 0 24 24" style={{transform: expanded ? 'rotate(180deg)' : undefined}}><path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.76078655,5.48530618 L12,15.0124473 Z" /></svg></span>
            </button>
            <div id={`accordion-${entry.id}`} role="region" aria-labelledby={`accordion-trigger-${entry.id}`} className="c-accordion__item-content" hidden={!expanded}><RichText field={entry.body?.jsonValue} className="accordionContent" /></div>
          </div>;
        })}
      </div>
    </div></div></div></div></div></div>
  </section>;
};
