'use client';
import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useEffect, useRef, useState } from 'react';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import { safeEditorialRichText } from 'lib/allianz-editorial';
import type { AllianzCalculatorProps } from './allianz-calculator.props';
import { observeRmdFrame, type RmdFrameState } from './rmd-frame';

/** The isolated source document owns its grid; the iframe must not be grid-nested. */
function RmdSourceFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1000);
  const [state, setState] = useState<RmdFrameState>('loading');
  useEffect(() => {
    if (!frame.current) return;
    return observeRmdFrame(frame.current,
      (next) => setHeight((previous) => Math.abs(previous - next) > 1 ? next : previous),
      setState);
  }, []);
  return <>
    {state === 'loading' && <p role="status">The calculator is loading.</p>}
    <iframe ref={frame} src="/allianz-assets/rmd/index.html"
      title="Required minimum distribution calculator" aria-busy={state === 'loading'}
      aria-hidden={state !== 'ready'} hidden={state === 'failed'}
      style={{ display: state === 'failed' ? 'none' : 'block', visibility: state === 'ready' ? 'visible' : 'hidden', width: '100%', height, border: 0 }} />
    {state === 'failed' && <p role="alert">The calculator could not be loaded. Please try again later.</p>}
  </>;
}

/** Existing native fields remain editable; source inputs/results remain code-owned. */
export function RequiredMinimumDistribution({ fields, params }: AllianzCalculatorProps) {
  const { page } = useSitecore();
  const editing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  const hasHeading = shouldRenderTextField(data?.heading?.jsonValue, editing);
  const hasBody = shouldRenderTextField(data?.body?.jsonValue, editing);
  const hasDisclaimer = shouldRenderTextField(data?.disclaimer?.jsonValue, editing);
  return <section className="allianz-rmd-calculator" id={params.RenderingIdentifier}>
    {(hasHeading || hasBody) && <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      {hasHeading && <Text editable={editing} tag="h2" field={data?.heading?.jsonValue} />}
      {hasBody && <RichText editable={editing} field={safeEditorialRichText(data?.body?.jsonValue, editing, true)} className="o-richTextEditor__wrapper" />}
    </div></div></div>}
    <RmdSourceFrame />
    {hasDisclaimer && <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      <RichText editable={editing} field={safeEditorialRichText(data?.disclaimer?.jsonValue, editing, true)} className="o-richTextEditor__wrapper" />
    </div></div></div>}
  </section>;
}
