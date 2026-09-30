'use client';
import { Link, Placeholder, RichText, Text } from '@sitecore-content-sdk/nextjs';
import { useId, useState } from 'react';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { safeLink, type AllianzProps } from 'lib/allianz-fields';

export const Default = ({ fields, params, rendering }: AllianzProps) => {
  const instance = useId().replace(/:/g, '');
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyAccordion" />;
  const region = ['pre-content', 'content', 'post-content', 'disclosure'].includes(params.region) ? params.region : 'content';
  return <div className="row" id={params.RenderingIdentifier}><div className={`col-md-12 content-body ${region}`}>
    {data.heading?.jsonValue?.value && <Text tag="h2" field={data.heading.jsonValue} />}
    <div className="panel-group accordion">
      {(data.children?.results ?? []).map((item, index) => {
        const isOpen = open.includes(item.id);
        const id = `${instance}-panel-${index}`;
        const placeholder = `allianz-legacy-accordion-${index + 1}`;
        const hasNestedContent = !!rendering.placeholders?.[placeholder]?.length;
        return <section key={item.id} className="panel panel-default">
          <div className="panel-heading"><h4 className="panel-title">
            <button type="button" className={`allianz-legacy-accordion-trigger ${isOpen ? '' : 'collapsed'}`} aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen((current) => isOpen ? current.filter((key) => key !== item.id) : params.allowMultiple === '1' ? [...current, item.id] : [item.id])}>
              <Text field={item.heading?.jsonValue} /><span className="allianz-legacy-accordion-icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
            </button>
          </h4></div>
          <div id={id} className={`panel-collapse collapse ${isOpen ? 'in' : ''}`} hidden={!isOpen}>
            <div className="panel-body"><RichText field={item.body?.jsonValue} />
              {item.link?.jsonValue?.value?.href && <p className="link"><Link field={safeLink(item.link.jsonValue)} /></p>}
              {hasNestedContent && <Placeholder name={placeholder} rendering={rendering} />}
            </div>
          </div>
        </section>;
      })}
    </div>
  </div></div>;
};
