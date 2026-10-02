'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useId, useState } from 'react';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { collectionsComplete } from 'lib/collection-completeness';
import { productFaqFields } from './product-faq-fields.props';
import type { ProductFaqProps } from './product-faq.props';
import './ProductFaq.css';

/** Source spacing and typography are fixed; authors own each question and answer. */
export const Default = ({ fields, params }: ProductFaqProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const instanceId = useId();
  const [open, setOpen] = useState<string[]>([]);
  const datasource = fields?.data?.datasource;
  if (!datasource) return <NoDataFallback componentName="Product FAQ" />;
  if (!Array.isArray(datasource.children?.results) || !collectionsComplete(datasource, true)) {
    return isEditing
      ? <div className="allianz-missing-data" role="status">Product FAQ content is incomplete.</div>
      : null;
  }
  const entries = (datasource.children?.results ?? []).map(productFaqFields);

  return (
    <section className="l-container--full-width t-bg-transparent axlTileCollection allianz-product-faq"
      id={params?.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row u-padding-bottom-xl">
          <div className="l-grid__column-medium-12">
            <div className="l-grid l-grid--max-width l-grid--no-gutters-mobile">
              <div className="l-grid__row justify-content-center">
                <div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
                  <div role="presentation" className="c-accordion js-accordion c-accordion--light">
                    {entries.map((entry, index) => {
                      const question = entry.question?.jsonValue;
                      const answer = entry.answer?.jsonValue;
                      const showQuestion = shouldRenderTextField(question, isEditing);
                      const showAnswer = shouldRenderTextField(answer, isEditing);
                      if (!showQuestion && !showAnswer) return null;
                      const entryKey = `${entry.id}-${index}`;
                      const triggerId = `${instanceId}-faq-trigger-${entryKey}`;
                      const panelId = `${instanceId}-faq-panel-${entryKey}`;
                      const expanded = isEditing || !showQuestion || open.includes(entryKey);
                      const toggle = () => setOpen((current) => current.includes(entryKey)
                        ? current.filter((id) => id !== entryKey) : [...current, entryKey]);

                      return <div key={entryKey} className="c-accordion__item-wrapper">
                        {showQuestion && <button id={triggerId} type="button"
                          className={`js-accordion__trigger c-accordion__trigger safari_only${expanded ? ' c-accordion__item--is-active' : ''}`}
                          aria-expanded={expanded} aria-controls={panelId} onClick={toggle}>
                          <Text field={question} editable={isEditing} tag="span" className="c-accordion__item-title" />
                          <span aria-hidden="true" className="c-accordion__chevron a-icon">
                            <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false"
                              style={{ transform: expanded ? 'rotate(180deg)' : undefined }}>
                              <path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C23.489432,5.48204863 23.519856,5.51415659 23.5488832,5.54750648 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 C10.8938699,18.756857 10.861762,18.7264331 10.8309819,18.6946938 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.66454866,5.39411582 C2.69789855,5.42314298 2.73000651,5.45356693 2.76078655,5.48530618 L12,15.0124473 Z" />
                            </svg>
                          </span>
                        </button>}
                        <div id={panelId} role={showQuestion ? 'region' : undefined}
                          aria-labelledby={showQuestion ? triggerId : undefined}
                          className="js-accordion__item-content c-accordion__item-content" hidden={!expanded}>
                          {showAnswer && <RichText field={answer} editable={isEditing} className="accordionContent" />}
                        </div>
                      </div>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
