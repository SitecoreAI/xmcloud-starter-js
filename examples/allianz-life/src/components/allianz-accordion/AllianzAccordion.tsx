'use client';
import { Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useId, useState } from 'react';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { rowSpacing, sectionTheme, type ContentEntry } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { AllianzAccordionProps } from './allianz-accordion.props';
import { EditorialFrame } from 'lib/allianz-editorial-frame';

export const Default = ({ fields, params }: AllianzAccordionProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12"><div className="l-grid l-grid--max-width l-grid--no-gutters-mobile"><div className="l-grid__row justify-content-center"><div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
      {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} field={data.heading?.jsonValue} tag="h2" className="c-heading u-text-center" />}
      {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
      <div className="c-accordion c-accordion--light">
        {(data.children?.results ?? []).map((entry) => {
          const expanded = isEditing || open.includes(entry.id);
          return <div key={entry.id} className="c-accordion__item-wrapper">
            <button id={`accordion-trigger-${entry.id}`} type="button" className="c-accordion__trigger" aria-expanded={expanded} aria-controls={`accordion-${entry.id}`} onClick={() => setOpen(expanded ? open.filter((id) => id !== entry.id) : [...open,entry.id])}>
              <Text editable={isEditing} field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" /><span aria-hidden="true" className="c-accordion__chevron a-icon"><svg viewBox="0 0 24 24" style={{transform: expanded ? 'rotate(180deg)' : undefined}}><path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C23.489432,5.48204863 23.519856,5.51415659 23.5488832,5.54750648 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 C10.8938699,18.756857 10.861762,18.7264331 10.8309819,18.6946938 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.66454866,5.39411582 C2.69789855,5.42314298 2.73000651,5.45356693 2.76078655,5.48530618 L12,15.0124473 Z" /></svg></span>
            </button>
            <div id={`accordion-${entry.id}`} role="region" aria-labelledby={`accordion-trigger-${entry.id}`} className="c-accordion__item-content" hidden={!expanded}><RichText editable={isEditing} field={entry.body?.jsonValue} className="accordionContent" /></div>
          </div>;
        })}
      </div>
    </div></div></div></div></div></div>
  </section>;
};


/** Native FAQ entries share field ownership and instance-scoped disclosure IDs. */
const faqEntries = (entries: ContentEntry[], isEditing: boolean, instanceId: string,
  open: string[], toggleEntry: (key: string) => void, sourceClasses = false) => (
  <div className={sourceClasses ? 'c-accordion js-accordion c-accordion--light' : 'c-accordion c-accordion--light'}>
  {entries.map((entry, index) => {
    const key = `${entry.id}-${index}`;
    const triggerId = `${instanceId}-faq-trigger-${key}`;
    const panelId = `${instanceId}-faq-panel-${key}`;
    const expanded = isEditing || open.includes(key);
    const toggle = () => toggleEntry(key);
    return <div key={key} className="c-accordion__item-wrapper">
      <button id={triggerId} type="button"
        className={`${sourceClasses ? 'js-accordion__trigger c-accordion__trigger safari_only' : 'c-accordion__trigger'}${expanded ? ' c-accordion__item--is-active' : ''}`}
        aria-expanded={expanded} aria-controls={panelId} onClick={toggle}>
        <Text editable={isEditing} field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" />
        <span aria-hidden="true" className="c-accordion__chevron a-icon">
          <svg viewBox="0 0 24 24" focusable="false" style={{ transform: expanded ? 'rotate(180deg)' : undefined }}>
            <path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.76078655,5.48530618 L12,15.0124473 Z" />
          </svg>
        </span>
      </button>
      <div id={panelId} role="region" aria-labelledby={triggerId} className={sourceClasses ? 'js-accordion__item-content c-accordion__item-content' : 'c-accordion__item-content'} hidden={!expanded}>
        <RichText editable={isEditing} field={entry.body?.jsonValue} className="accordionContent" />
      </div>
    </div>;
  })}
</div>
);

/** Accordion row inside AllianzFaqSection; source spacing is fixed for this variant. */
export const FaqRow = ({ fields, params }: AllianzAccordionProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const instanceId = useId();
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return (
    <div className="l-grid__row u-margin-bottom-xl" id={params?.RenderingIdentifier}>
      <div className="l-grid__column-medium-12">
        <div className="l-grid l-grid--max-width l-grid--no-gutters-mobile">
          <div className="l-grid__row justify-content-center">
            <div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
              {faqEntries(data.children?.results ?? [], isEditing, instanceId, open,
                (key) => setOpen((current) => current.includes(key)
                  ? current.filter((id) => id !== key) : [...current, key]))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Life FAQ groups use only the three declared source anchor presentations. */
export const LifeFaqGroup = ({ fields, params }: AllianzAccordionProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const instanceId = useId();
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  const anchor = params.RenderingIdentifier;
  const general = anchor === 'GeneralLifeInsuranceQuestions';
  const applying = anchor === 'applying-for-life-insurance';
  if (!general && !applying && anchor !== 'about-indexed-universal-life') {
    return isEditing ? <div role="status">Choose a supported life FAQ group anchor.</div> : null;
  }
  const anchorProps: import('react').AnchorHTMLAttributes<HTMLAnchorElement> & { name: string } = { name: anchor };
  return <div className={`${general ? 'l-container--full-width' : 'l-container'} t-bg-transparent axlTileCollection`} id={anchor}>
    <div className={`l-grid l-grid--max-width${general ? '' : ' l-grid--no-gutters-outer'}`}>
      <a {...anchorProps} />
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
        <div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image">
            <div className="tileContent u-text-left"><header>
              <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
              <div className="tileSubHeading" />
            </header></div>
          </article>
        </div>
      </div>
      <div className={`l-grid__row${applying ? ' u-margin-bottom-xl' : ''}`}>
        <div className="l-grid__column-medium-12">
          <div className="l-grid l-grid--max-width l-grid--no-gutters-mobile">
            <div className="l-grid__row justify-content-center">
              <div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
                {faqEntries(data.children?.results ?? [], isEditing, instanceId, open,
                  (key) => setOpen((current) => current.includes(key)
                    ? current.filter((id) => id !== key) : [...current, key]), true)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
};

/** Strategy transcript: one editable entry inside its source width and spacing. */
export const Transcript = ({ fields, params }: AllianzAccordionProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const instanceId = useId();
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <EditorialFrame params={params} column>
    <div className="l-grid l-grid--max-width l-grid--no-gutters-mobile">
      <div className="l-grid__row justify-content-center">
        <div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
          {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} field={data.heading?.jsonValue} tag="h2" className="c-heading u-text-center" />}
          {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
          <div className="c-accordion c-accordion--light">
            {(data.children?.results ?? []).map((entry, index) => {
              const key = `${entry.id}-${index}`;
              const triggerId = `${instanceId}-transcript-trigger-${key}`;
              const panelId = `${instanceId}-transcript-panel-${key}`;
              const expanded = isEditing || open.includes(key);
              const toggle = () => setOpen((current) => current.includes(key)
                ? current.filter((id) => id !== key) : [...current, key]);
              return <div key={key} className="c-accordion__item-wrapper">
                <button id={triggerId} type="button"
                  className={`c-accordion__trigger${expanded ? ' c-accordion__item--is-active' : ''}`}
                  aria-expanded={expanded} aria-controls={panelId} onClick={toggle}>
                  <Text editable={isEditing} field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" />
                  <span aria-hidden="true" className="c-accordion__chevron a-icon">
                    <svg viewBox="0 0 24 24" focusable="false" style={{ transform: expanded ? 'rotate(180deg)' : undefined }}>
                      <path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.76078655,5.48530618 L12,15.0124473 Z" />
                    </svg>
                  </span>
                </button>
                <div id={panelId} role="region" aria-labelledby={triggerId} className="c-accordion__item-content" hidden={!expanded}>
                  <RichText editable={isEditing} field={entry.body?.jsonValue} className="accordionContent" />
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
  </EditorialFrame>;
};

/** About Us FAQ retains its centered source introduction and native answer owners. */
export const AboutFaq = ({ fields, params }: AllianzAccordionProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const instanceId = useId();
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params?.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
        <div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image">
            <div className="tileContent u-text-center"><header>
              <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
              <div className="tileSubHeading" />
            </header></div>
          </article>
        </div>
      </div>
      <div className="l-grid__row u-padding-bottom-xl">
        <div className="l-grid__column-medium-12">
          <div className="l-grid l-grid--max-width l-grid--no-gutters-mobile">
            <div className="l-grid__row justify-content-center">
              <div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
                {faqEntries(data.children?.results ?? [], isEditing, instanceId, open,
                  (key) => setOpen((current) => current.includes(key)
                    ? current.filter((id) => id !== key) : [...current, key]), true)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
};

/** FIA transcript presentation owns its contained width and source top spacing. */
export const FixedTranscript = (props: AllianzAccordionProps) => {
  const fixedParams: AllianzAccordionProps['params'] = { theme: 'transparent', sectionWidth: 'contained', paddingTop: 'xl' };
  if (props.params?.RenderingIdentifier !== undefined) {
    fixedParams.RenderingIdentifier = props.params.RenderingIdentifier;
  }
  return <Transcript {...props} params={fixedParams} />;
};

/** Fixed product accordions retain the source row spacing through their variant. */
export const FixedProductAccordion = (props: AllianzAccordionProps) => (
  <Default {...props} params={{ ...props.params, marginBottom: 'xl' }} />
);

/** RILA spacing is intrinsic because its native parameter template has no spacing fields. */
export const RilaTranscript = (props: AllianzAccordionProps) => {
  const fixedParams: AllianzAccordionProps['params'] = { theme: 'transparent', spacing: 'none',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'none' };
  if (props.params?.RenderingIdentifier !== undefined) {
    fixedParams.RenderingIdentifier = props.params.RenderingIdentifier;
  }
  return <Transcript {...props} params={fixedParams} />;
};


import './AllianzIapStrategies.css';

/** One source disclosure presentation is shared by all six Index Advantage+
 * strategies. Answers remain complete native RichText fields, including PDFs. */
export const IapStrategies = ({ fields, params }: AllianzAccordionProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const instanceId = useId();
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <div className="l-container--full-width t-bg-transparent axlTileCollection allianz-iap-strategies" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row">
        <div className="l-grid__column-medium-12">
          <div className="l-grid l-grid--max-width l-grid--no-gutters-mobile">
            <div className="l-grid__row justify-content-center">
              <div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
                <div role="presentation" className="c-accordion js-accordion c-accordion--light">
                  {(data.children?.results ?? []).map((entry, index) => {
                    const key = `${entry.id}-${index}`;
                    const triggerId = `${instanceId}-iap-trigger-${key}`;
                    const panelId = `${instanceId}-iap-panel-${key}`;
                    const expanded = isEditing || open.includes(key);
                    const toggle = () => setOpen((current) => current.includes(key)
                      ? current.filter((id) => id !== key) : [...current, key]);
                    return <div key={key} className="c-accordion__item-wrapper">
                      <button id={triggerId} type="button" className={`js-accordion__trigger c-accordion__trigger safari_only${expanded ? ' c-accordion__item--is-active' : ''}`}
                        aria-expanded={expanded} aria-controls={panelId} onClick={toggle}>
                        <Text editable={isEditing} field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" />
                        <span className="c-accordion__chevron a-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style={{ transform: expanded ? 'rotate(180deg)' : undefined }}>
                          <path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C23.489432,5.48204863 23.519856,5.51415659 23.5488832,5.54750648 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 C10.8938699,18.756857 10.861762,18.7264331 10.8309819,18.6946938 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.66454866,5.39411582 C2.69789855,5.42314298 2.73000651,5.45356693 2.76078655,5.48530618 L12,15.0124473 Z" />
                        </svg></span>
                      </button>
                      <div id={panelId} role="region" aria-labelledby={triggerId} className="js-accordion__item-content c-accordion__item-content" hidden={!expanded}>
                        <RichText editable={isEditing} field={entry.body?.jsonValue} className="accordionContent" />
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
  </div>;
};


/** AA5 allocation answers expose only their original child heading/body owners. */
export const AA5AllocationAnswers = (props: AllianzAccordionProps) => {
  const data = props.fields?.data?.datasource;
  const fields = data ? {
    ...props.fields,
    data: {
      ...props.fields?.data,
      datasource: {
        children: data.children ? {
          ...data.children,
          results: data.children.results.map(({ id, heading, body }) => ({ id, heading, body })),
        } : undefined,
      },
    },
  } : props.fields;
  const fixedParams: AllianzAccordionProps['params'] = { theme: 'transparent' };
  if (props.params?.RenderingIdentifier !== undefined) {
    fixedParams.RenderingIdentifier = props.params.RenderingIdentifier;
  }
  return <Default {...props} fields={fields} params={fixedParams} />;
};

/** AA5 crediting answers retain source spacing without root authoring slots. */
export const AA5CreditingAnswers = (props: AllianzAccordionProps) => {
  const data = props.fields?.data?.datasource;
  const fields = data ? {
    ...props.fields,
    data: {
      ...props.fields?.data,
      datasource: {
        children: data.children ? {
          ...data.children,
          results: data.children.results.map(({ id, heading, body }) => ({ id, heading, body })),
        } : undefined,
      },
    },
  } : props.fields;
  const fixedParams: AllianzAccordionProps['params'] = { theme: 'transparent', marginBottom: 'xl' };
  if (props.params?.RenderingIdentifier !== undefined) {
    fixedParams.RenderingIdentifier = props.params.RenderingIdentifier;
  }
  return <Default {...props} fields={fields} params={fixedParams} />;
};

/** AA Plus source panels retain their final overflow containment so native
 * paragraph margins stay inside the panel. The source fields remain whole. */
const AAPlusSourceAnswers = ({ fields, params, sourcePaddingBottom = false }:
  AllianzAccordionProps & { sourcePaddingBottom?: boolean }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <section className={`l-container--full-width ${sectionTheme('transparent')}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing({ paddingBottom: sourcePaddingBottom ? 'xl' : undefined })}`}><div className="l-grid__column-medium-12"><div className="l-grid l-grid--max-width l-grid--no-gutters-mobile"><div className="l-grid__row justify-content-center"><div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
      <div className="c-accordion c-accordion--light">
        {(data.children?.results ?? []).map((entry) => {
          const expanded = isEditing || open.includes(entry.id);
          return <div key={entry.id} className="c-accordion__item-wrapper">
            <button id={`accordion-trigger-${entry.id}`} type="button" className="c-accordion__trigger" aria-expanded={expanded} aria-controls={`accordion-${entry.id}`} onClick={() => setOpen(expanded ? open.filter((id) => id !== entry.id) : [...open,entry.id])}>
              <Text editable={isEditing} field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" /><span aria-hidden="true" className="c-accordion__chevron a-icon"><svg viewBox="0 0 24 24" style={{transform: expanded ? 'rotate(180deg)' : undefined}}><path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C23.489432,5.48204863 23.519856,5.51415659 23.5488832,5.54750648 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 C10.8938699,18.756857 10.861762,18.7264331 10.8309819,18.6946938 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.66454866,5.39411582 C2.69789855,5.42314298 2.73000651,5.45356693 2.76078655,5.48530618 L12,15.0124473 Z" /></svg></span>
            </button>
            <div id={`accordion-${entry.id}`} role="region" aria-labelledby={`accordion-trigger-${entry.id}`} className="c-accordion__item-content" style={{ overflow: 'hidden' }} hidden={!expanded}><RichText editable={isEditing} field={entry.body?.jsonValue} className="accordionContent" /></div>
          </div>;
        })}
      </div>
    </div></div></div></div></div></div>
  </section>;
};

/** AA Plus transcript owns only its source title and complete transcript body. */
export const AAPlusTranscript = (props: AllianzAccordionProps) => <AAPlusSourceAnswers {...props} />;

/** AA Plus allocation answers retain child ownership without root authoring slots. */
export const AAPlusAllocationAnswers = (props: AllianzAccordionProps) => <AAPlusSourceAnswers {...props} />;

/** AA Plus crediting answers retain source XL padding without an XL margin. */
export const AAPlusCreditingAccordion = (props: AllianzAccordionProps) => <AAPlusSourceAnswers {...props} sourcePaddingBottom />;

/** Classic source panels contain native paragraph margins through their final
 * overflow behavior; source spacing and every child field remain unchanged. */
const ClassicSourceAnswers = ({ fields, params, sourceMarginBottom = false }:
  AllianzAccordionProps & { sourceMarginBottom?: boolean }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <section className={`l-container--full-width ${sectionTheme('transparent')}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing({ marginBottom: sourceMarginBottom ? 'xl' : undefined })}`}><div className="l-grid__column-medium-12"><div className="l-grid l-grid--max-width l-grid--no-gutters-mobile"><div className="l-grid__row justify-content-center"><div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
      <div className="c-accordion c-accordion--light">
        {(data.children?.results ?? []).map((entry) => {
          const expanded = isEditing || open.includes(entry.id);
          return <div key={entry.id} className="c-accordion__item-wrapper">
            <button id={`accordion-trigger-${entry.id}`} type="button" className="c-accordion__trigger" aria-expanded={expanded} aria-controls={`accordion-${entry.id}`} onClick={() => setOpen(expanded ? open.filter((id) => id !== entry.id) : [...open,entry.id])}>
              <Text editable={isEditing} field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" /><span aria-hidden="true" className="c-accordion__chevron a-icon"><svg viewBox="0 0 24 24" style={{transform: expanded ? 'rotate(180deg)' : undefined}}><path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C23.489432,5.48204863 23.519856,5.51415659 23.5488832,5.54750648 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 C10.8938699,18.756857 10.861762,18.7264331 10.8309819,18.6946938 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.66454866,5.39411582 C2.69789855,5.42314298 2.73000651,5.45356693 2.76078655,5.48530618 L12,15.0124473 Z" /></svg></span>
            </button>
            <div id={`accordion-${entry.id}`} role="region" aria-labelledby={`accordion-trigger-${entry.id}`} className="c-accordion__item-content" style={{ overflow: 'hidden' }} hidden={!expanded}><RichText editable={isEditing} field={entry.body?.jsonValue} className="accordionContent" /></div>
          </div>;
        })}
      </div>
    </div></div></div></div></div></div>
  </section>;
};

/** Classic transcript retains the source XL row margin and original field owners. */
export const ClassicTranscript = (props: AllianzAccordionProps) => <ClassicSourceAnswers {...props} sourceMarginBottom />;

/** Classic allocation answers retain the source row without extra spacing. */
export const ClassicAllocationAnswers = (props: AllianzAccordionProps) => <ClassicSourceAnswers {...props} />;

/** Classic crediting answers retain an XL row margin, distinct from AA Plus padding. */
export const ClassicCreditingAnswers = (props: AllianzAccordionProps) => <ClassicSourceAnswers {...props} sourceMarginBottom />;

/** Benefit Control+ preserves its contained transcript and full-width answer
 * rows; source panel overflow keeps every native paragraph margin contained. */
const BenefitControlPlusSourceAnswers = ({ fields, params, transcript = false }:
  AllianzAccordionProps & { transcript?: boolean }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <div className={`${transcript ? 'l-container' : 'l-container--full-width'} t-bg-transparent axlTileCollection`} id={params.RenderingIdentifier}>
    <div className={`l-grid l-grid--max-width${transcript ? ' l-grid--no-gutters-outer' : ''}`}><div className={`l-grid__row ${transcript ? 'u-padding-top-xl' : 'match-height-row u-margin-bottom-xl'}`}><div className="l-grid__column-medium-12"><div className="l-grid l-grid--max-width l-grid--no-gutters-mobile"><div className="l-grid__row justify-content-center"><div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
      <div className="c-accordion c-accordion--light">
        {(data.children?.results ?? []).map((entry) => {
          const expanded = isEditing || open.includes(entry.id);
          return <div key={entry.id} className="c-accordion__item-wrapper">
            <button id={`accordion-trigger-${entry.id}`} type="button" className="c-accordion__trigger" aria-expanded={expanded} aria-controls={`accordion-${entry.id}`} onClick={() => setOpen(expanded ? open.filter((id) => id !== entry.id) : [...open,entry.id])}>
              <Text editable={isEditing} field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" /><span aria-hidden="true" className="c-accordion__chevron a-icon"><svg viewBox="0 0 24 24" style={{transform: expanded ? 'rotate(180deg)' : undefined}}><path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C23.489432,5.48204863 23.519856,5.51415659 23.5488832,5.54750648 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 C10.8938699,18.756857 10.861762,18.7264331 10.8309819,18.6946938 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.66454866,5.39411582 C2.69789855,5.42314298 2.73000651,5.45356693 2.76078655,5.48530618 L12,15.0124473 Z" /></svg></span>
            </button>
            <div id={`accordion-${entry.id}`} role="region" aria-labelledby={`accordion-trigger-${entry.id}`} className="c-accordion__item-content" style={{ overflow: 'hidden' }} hidden={!expanded}><RichText editable={isEditing} field={entry.body?.jsonValue} className="accordionContent" /></div>
          </div>;
        })}
      </div>
    </div></div></div></div></div></div>
  </div>;
};

/** The complete Benefit Control+ transcript owns one native heading/body pair. */
export const BenefitControlPlusTranscript = (props: AllianzAccordionProps) => <BenefitControlPlusSourceAnswers {...props} transcript />;

/** Benefit Control+ allocation answers use their source XL margin and native owners. */
export const BenefitControlPlusAllocationAnswers = (props: AllianzAccordionProps) => <BenefitControlPlusSourceAnswers {...props} />;

/** Benefit Control+ crediting answers share the exact source answer-row presentation. */
export const BenefitControlPlusCreditingAnswers = (props: AllianzAccordionProps) => <BenefitControlPlusSourceAnswers {...props} />;

/** Essential Income 7 panels retain their original child heading/body owners,
 * white answer sections and source row spacing. Paragraphs remain whole fields. */
const EssentialIncome7SourceAnswers = ({ fields, params, sourceRole }:
  AllianzAccordionProps & { sourceRole: 'transcript' | 'allocation' | 'crediting' }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const instanceId = useId();
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <div className={`l-container--full-width ${sectionTheme(sourceRole === 'transcript' ? 'transparent' : 'primary-white')} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className={`l-grid__row${sourceRole === 'allocation' ? '' : ' u-margin-bottom-xl'}`}>
        <div className="l-grid__column-medium-12">
          <div className="l-grid l-grid--max-width l-grid--no-gutters-mobile">
            <div className="l-grid__row justify-content-center">
              <div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
                <div role="presentation" className="c-accordion js-accordion c-accordion--light">
                  {(data.children?.results ?? []).map((entry, index) => {
                    const key = `${entry.id}-${index}`;
                    const triggerId = `${instanceId}-essential-income-7-trigger-${key}`;
                    const panelId = `${instanceId}-essential-income-7-panel-${key}`;
                    const expanded = isEditing || open.includes(key);
                    const toggle = () => setOpen((current) => current.includes(key)
                      ? current.filter((id) => id !== key) : [...current, key]);
                    return <div key={key} className="c-accordion__item-wrapper">
                      <button id={triggerId} type="button"
                        className={`js-accordion__trigger c-accordion__trigger safari_only${expanded ? ' c-accordion__item--is-active' : ''}`}
                        aria-expanded={expanded} aria-controls={panelId} onClick={toggle}>
                        <Text editable={isEditing} field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" />
                        <span aria-hidden="true" className="c-accordion__chevron a-icon">
                          <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style={{ transform: expanded ? 'rotate(180deg)' : undefined }}>
                            <path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C23.489432,5.48204863 23.519856,5.51415659 23.5488832,5.54750648 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 C10.8938699,18.756857 10.861762,18.7264331 10.8309819,18.6946938 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.66454866,5.39411582 C2.69789855,5.42314298 2.73000651,5.45356693 2.76078655,5.48530618 L12,15.0124473 Z" />
                          </svg>
                        </span>
                      </button>
                      <div id={panelId} role="region" aria-labelledby={triggerId}
                        className="js-accordion__item-content c-accordion__item-content"
                        style={{ overflow: 'hidden' }} hidden={!expanded}>
                        <RichText editable={isEditing} field={entry.body?.jsonValue} className="accordionContent" />
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
  </div>;
};

/** One complete source transcript with its XL row margin. */
export const EssentialIncome7Transcript = (props: AllianzAccordionProps) => <EssentialIncome7SourceAnswers {...props} sourceRole="transcript" />;

/** The three source allocation answers retain a white section and bare row. */
export const EssentialIncome7AllocationAnswers = (props: AllianzAccordionProps) => <EssentialIncome7SourceAnswers {...props} sourceRole="allocation" />;

/** The source crediting answer retains a white section and XL row margin. */
export const EssentialIncome7CreditingAnswers = (props: AllianzAccordionProps) => <EssentialIncome7SourceAnswers {...props} sourceRole="crediting" />;


/** RFA source answer rows preserve contained gutters and one shared outer margin.
 * Whole child fields remain editable, with unique live trigger/panel identities. */
const RetirementFoundationAdvSourceAnswers = ({ fields, params, sourceRole }:
  AllianzAccordionProps & { sourceRole: 'allocation' | 'crediting' }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const instanceId = useId();
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <div className={"l-container u-row-spacing t-bg-transparent axlTileCollection"} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width l-grid--no-gutters-outer">
      <div className={"l-grid__row u-margin-bottom-xl"}>
        <div className="l-grid__column-medium-12">
          <div className="l-grid l-grid--max-width l-grid--no-gutters-mobile">
            <div className="l-grid__row justify-content-center">
              <div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
                <div role="presentation" className="c-accordion js-accordion c-accordion--light">
                  {(data.children?.results ?? []).map((entry, index) => {
                    const key = `${entry.id}-${index}`;
                    const triggerId = `${instanceId}-retirement-foundation-adv-trigger-${key}`;
                    const panelId = `${instanceId}-retirement-foundation-adv-panel-${key}`;
                    const expanded = isEditing || open.includes(key);
                    const toggle = () => setOpen((current) => current.includes(key)
                      ? current.filter((id) => id !== key) : [...current, key]);
                    return <div key={key} className="c-accordion__item-wrapper">
                      <button id={triggerId} type="button"
                        className={`js-accordion__trigger c-accordion__trigger safari_only${expanded ? ' c-accordion__item--is-active' : ''}`}
                        aria-expanded={expanded} aria-controls={panelId} onClick={toggle}>
                        <Text editable={isEditing} field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" />
                        <span aria-hidden="true" className="c-accordion__chevron a-icon">
                          <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style={{ transform: expanded ? 'rotate(180deg)' : undefined }}>
                            <path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C23.489432,5.48204863 23.519856,5.51415659 23.5488832,5.54750648 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 C10.8938699,18.756857 10.861762,18.7264331 10.8309819,18.6946938 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.66454866,5.39411582 C2.69789855,5.42314298 2.73000651,5.45356693 2.76078655,5.48530618 L12,15.0124473 Z" />
                          </svg>
                        </span>
                      </button>
                      <div id={panelId} role="region" aria-labelledby={triggerId}
                        className="js-accordion__item-content c-accordion__item-content"
                        style={{ overflow: 'hidden' }} hidden={!expanded}>
                        <RichText editable={isEditing} field={entry.body?.jsonValue} className="accordionContent" />
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
  </div>;
};

/** All five original allocation answers retain exact native ownership. */
export const RetirementFoundationAdvAllocationAnswers = (props: AllianzAccordionProps) => <RetirementFoundationAdvSourceAnswers {...props} sourceRole="allocation" />;

/** The complete source crediting answer has the same contained presentation. */
export const RetirementFoundationAdvCreditingAnswers = (props: AllianzAccordionProps) => <RetirementFoundationAdvSourceAnswers {...props} sourceRole="crediting" />;


/** Core's transparent transcript reuses the exact proven native-answer grammar. */
export const CoreIncome7Transcript = (props: AllianzAccordionProps) => <EssentialIncome7Transcript {...props} />;

/** Core answer rows own full native child fields, unique live IDs and source XL margin. */
const CoreIncome7SourceAnswers = ({ fields, params }: AllianzAccordionProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const instanceId = useId();
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzAccordion" />;
  return <div className={"l-container--full-width t-bg-transparent axlTileCollection"} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className={"l-grid__row u-margin-bottom-xl"}>
        <div className="l-grid__column-medium-12">
          <div className="l-grid l-grid--max-width l-grid--no-gutters-mobile">
            <div className="l-grid__row justify-content-center">
              <div className="l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md">
                <div role="presentation" className="c-accordion js-accordion c-accordion--light">
                  {(data.children?.results ?? []).map((entry, index) => {
                    const key = `${entry.id}-${index}`;
                    const triggerId = `${instanceId}-core-income-7-trigger-${key}`;
                    const panelId = `${instanceId}-core-income-7-panel-${key}`;
                    const expanded = isEditing || open.includes(key);
                    const toggle = () => setOpen((current) => current.includes(key)
                      ? current.filter((id) => id !== key) : [...current, key]);
                    return <div key={key} className="c-accordion__item-wrapper">
                      <button id={triggerId} type="button"
                        className={`js-accordion__trigger c-accordion__trigger safari_only${expanded ? ' c-accordion__item--is-active' : ''}`}
                        aria-expanded={expanded} aria-controls={panelId} onClick={toggle}>
                        <Text editable={isEditing} field={entry.heading?.jsonValue} tag="span" className="c-accordion__item-title" />
                        <span aria-hidden="true" className="c-accordion__chevron a-icon">
                          <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style={{ transform: expanded ? 'rotate(180deg)' : undefined }}>
                            <path d="M12,15.0124473 L21.2392135,5.48530618 C21.8424304,4.86329081 22.8356774,4.84805166 23.4576928,5.45126859 C23.489432,5.48204863 23.519856,5.51415659 23.5488832,5.54750648 C24.1827348,6.2757513 24.1533179,7.3680831 23.4811896,8.06115738 L13.1690181,18.6946938 C12.8506745,19.0229581 12.4237026,19.1822275 11.999995,19.1707852 C11.6204934,19.1812292 11.2361618,19.054782 10.9272198,18.7858842 C10.8938699,18.756857 10.861762,18.7264331 10.8309819,18.6946938 L0.518810427,8.06115738 C-0.153317882,7.3680831 -0.182734796,6.2757513 0.451116843,5.54750648 C1.0199815,4.89392649 2.01096868,4.82525116 2.66454866,5.39411582 C2.69789855,5.42314298 2.73000651,5.45356693 2.76078655,5.48530618 L12,15.0124473 Z" />
                          </svg>
                        </span>
                      </button>
                      <div id={panelId} role="region" aria-labelledby={triggerId}
                        className="js-accordion__item-content c-accordion__item-content"
                        style={{ overflow: 'hidden' }} hidden={!expanded}>
                        <RichText editable={isEditing} field={entry.body?.jsonValue} className="accordionContent" />
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
  </div>;
};

export const CoreIncome7AllocationAnswers = (props: AllianzAccordionProps) => <CoreIncome7SourceAnswers {...props} />;

export const CoreIncome7CreditingAnswers = (props: AllianzAccordionProps) => <CoreIncome7SourceAnswers {...props} />;
