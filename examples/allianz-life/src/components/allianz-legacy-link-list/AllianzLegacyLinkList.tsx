'use client';
import { Link, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { usePathname } from 'next/navigation';
import type { AllianzProps } from 'lib/allianz-fields';

export const Default = ({ fields, params }: AllianzProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const pathname = usePathname();
  const data = fields?.data?.datasource;
  const style = ['nav-links', 'next-steps', 'tools'].includes(params.style) ? params.style : 'nav-links';
  const links = (data?.children?.results ?? []).map((item) => {
    const field = allianzLinkField(item.link?.jsonValue, isEditing);
    const title = item.heading?.jsonValue?.value || field.value.text || '';
    return <li key={item.id} className={style === 'tools' && /^return to top$/i.test(title) ? 'tools-top hidden-xs' : style === 'tools' && /^print$/i.test(title) ? 'tools-print' : undefined}>
      {isEditing ? <>
        {shouldRenderTextField(item.heading?.jsonValue, true) && <Text editable field={item.heading?.jsonValue} />}
        {shouldRenderLinkField(item.link?.jsonValue, true) && <Link editable field={field} />}
      </> : style === 'tools' && /^print$/i.test(title) ? <button type="button" className="allianz-legacy-print" onClick={() => window.print()}><Text editable={false} field={item.heading?.jsonValue} /></button> : shouldRenderLinkField(item.link?.jsonValue, false) ? <Link editable={false} field={field} className={field.value.href?.toLowerCase() === pathname.toLowerCase() ? 'active' : undefined} aria-current={field.value.href?.toLowerCase() === pathname.toLowerCase() ? 'page' : undefined}>{item.heading?.jsonValue?.value ? <Text editable={false} field={item.heading?.jsonValue} /> : field.value.text}</Link> : null}
    </li>;
  });
  if (style === 'tools') return <div className="row" id={params.RenderingIdentifier}><div className="col-xs-12 content-footer"><ul className="tools">{links}</ul></div></div>;
  return <div className="row" id={params.RenderingIdentifier}><div className="col-md-12 content-body content"><nav aria-label={data?.heading?.jsonValue?.value || 'Related content'} className={style === 'next-steps' ? 'next-steps' : undefined}>
    {shouldRenderTextField(data?.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data?.heading?.jsonValue} />}
    <ul className={style === 'next-steps' ? 'link-list' : 'nav-links'}>{links}</ul>
  </nav></div></div>;
};
