'use client';
import { Link, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { usePathname } from 'next/navigation';
import { safeLink, safeLinkRenderProps, type AllianzProps } from 'lib/allianz-fields';
import type { AllianzServiceLinksProps } from './allianz-legacy-link-list.props';
import './AllianzLegacyServiceLinks.css';

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

/** Native-authored service links without the production authentication widget. */
const ServiceLinks = ({ fields, params, serviceKind }: AllianzServiceLinksProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  const account = serviceKind === 'account';
  const entries = (data?.children?.results ?? []).filter((item) =>
    shouldRenderLinkField(item.link?.jsonValue, isEditing));
  if (!isEditing && !entries.length) return null;
  return <nav
    id={params.RenderingIdentifier}
    aria-label={data?.heading?.jsonValue?.value || (account ? 'Account services' : 'Contact services')}
    className={`allianz-legacy-service-links allianz-legacy-service-links--${serviceKind}${account && !isEditing ? ' hidden-xs' : ''}`}
  >
    {isEditing && shouldRenderTextField(data?.heading?.jsonValue, true) && <Text editable field={data?.heading?.jsonValue} />}
    <ul className="nav navbar-nav right-nav">{entries.map((item) => {
      const authored = allianzLinkField(item.link?.jsonValue, isEditing);
      // Account variants never enter live services, even if an author supplies
      // a placeholder URL. Keep the original field and its metadata in Pages.
      const field = account && !isEditing
        ? safeLink({ ...authored, value: { ...authored.value, href: '#service-unavailable' } })
        : authored;
      return <li key={item.id} className={account ? 'dropdown login' : 'contact-us'}>
        {isEditing ? <>
          {shouldRenderTextField(item.heading?.jsonValue, true) && <Text editable field={item.heading?.jsonValue} />}
          <Link editable field={field} />
        </> : <Link editable={false} {...safeLinkRenderProps(field)}>
          {item.heading?.jsonValue
            ? <Text editable={false} className={account ? undefined : 'btn-icon-mail'} field={item.heading.jsonValue} />
            : <span className={account ? undefined : 'btn-icon-mail'}>{field.value.text}</span>}
          {account && <>{' '}<span className="caret" aria-hidden="true" /></>}
        </Link>}
      </li>;
    })}</ul>
  </nav>;
};

export const AccountServices = (props: AllianzProps) => <ServiceLinks {...props} serviceKind="account" />;
export const ContactServices = (props: AllianzProps) => <ServiceLinks {...props} serviceKind="contact" />;

/** Bare lists for the product-document shell; source order is native child order. */
import { collectionsComplete } from 'lib/collection-completeness';

function productDocumentObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function productDocumentTextField(value: unknown): boolean {
  return productDocumentObject(value) && typeof value.value === 'string';
}

function productDocumentEntryReady(entry: unknown, ids: Set<string>): boolean {
  if (!productDocumentObject(entry) || typeof entry.id !== 'string' || !entry.id.trim()) return false;
  const id = entry.id.trim().toLowerCase();
  if (ids.has(id)) return false;
  const heading = productDocumentObject(entry.heading) ? entry.heading.jsonValue : undefined;
  const link = productDocumentObject(entry.link) ? entry.link.jsonValue : undefined;
  if (!productDocumentTextField(heading) || !productDocumentObject(link) || !productDocumentObject(link.value)) return false;
  const value = link.value;
  if (!['href', 'text', 'target', 'rel', 'querystring', 'anchor', 'title', 'linktype'].every((name) =>
    value[name] === undefined || typeof value[name] === 'string')) return false;
  ids.add(id);
  return true;
}

function productDocumentConnectionReady(props: AllianzProps): boolean {
  const data = props.fields?.data?.datasource;
  if (!data || !productDocumentTextField(data.heading?.jsonValue) ||
      !Array.isArray(data.children?.results) || !collectionsComplete(data, true)) return false;
  const ids = new Set<string>();
  return data.children.results.every((entry) => productDocumentEntryReady(entry, ids));
}

function productDocumentUnavailable(isEditing: boolean) {
  return <p role="status" className="allianz-missing-data">{isEditing
    ? 'Product document links could not load completely. Check the datasource children and native collection metadata.'
    : 'Product document links are temporarily unavailable.'}</p>;
}

function productDocumentLinks(props: AllianzProps, isEditing: boolean, pathname: string, nextSteps: boolean) {
  return <ul className={nextSteps ? 'link-list' : 'nav-links'} id={props.params?.RenderingIdentifier}>
    {(props.fields?.data?.datasource?.children?.results ?? []).map((item) => {
      const field = allianzLinkField(item.link?.jsonValue, isEditing);
      const active = !nextSteps && field.value.href?.toLowerCase() === pathname.toLowerCase();
      return <li key={item.id}>
        {isEditing ? <>
          {shouldRenderTextField(item.heading?.jsonValue, true) && <Text editable field={item.heading?.jsonValue} />}
          {shouldRenderLinkField(item.link?.jsonValue, true) && <Link editable field={field} />}
        </> : shouldRenderLinkField(item.link?.jsonValue, false) ? <Link editable={false}
          {...safeLinkRenderProps(field)} className={active ? 'active' : undefined}
          aria-current={active ? 'page' : undefined}>
          {item.heading?.jsonValue?.value ? <Text editable={false} field={item.heading.jsonValue} /> : field.value.text}
        </Link> : null}
      </li>;
    })}
  </ul>;
}

/** Navigation is already inside the shell's content column; no extra row or nav. */
export const ProductNavigation = (props: AllianzProps) => {
  const { page } = useSitecore();
  const pathname = usePathname();
  const isEditing = page?.mode?.isEditing ?? false;
  if (!productDocumentConnectionReady(props)) return productDocumentUnavailable(isEditing);
  return productDocumentLinks(props, isEditing, pathname, false);
};

/** Native next-steps heading and links stay inside the source-hidden shell wrapper. */
export const ProductNextSteps = (props: AllianzProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const heading = props.fields?.data?.datasource?.heading?.jsonValue;
  if (!productDocumentConnectionReady(props)) return productDocumentUnavailable(isEditing);
  return <>
    <hr />
    {shouldRenderTextField(heading, isEditing) && <Text editable={isEditing} tag="h2" field={heading} />}
    {productDocumentLinks(props, isEditing, '', true)}
  </>;
};
