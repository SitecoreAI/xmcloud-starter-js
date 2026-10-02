'use client';
import { Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useId, useState, useSyncExternalStore } from 'react';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField } from 'lib/allianz-field-state';
import { AllianzFieldIcon, iconFieldLabel } from 'lib/allianz-field-icon';
import type { AllianzFooterProps } from './allianz-footer.props';

const mobileQuery = '(max-width: 703px)';
const subscribeViewport = (callback: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};

export const Default = ({ fields }: AllianzFooterProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const isMobile = useSyncExternalStore(subscribeViewport, () => window.matchMedia(mobileQuery).matches, () => false);
  const instanceId = useId();
  const [open, setOpen] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzFooter" />;
  const social = (className: string) => <div className={className} aria-label="Social networks">{(data.socialNav?.targetItems ?? []).map((item) => <Link editable={isEditing} renderChildrenWhenEmpty={isEditing} field={allianzLinkField(item.link?.jsonValue, isEditing)} key={item.id} className="m-footer__social-link" aria-label={item.title?.jsonValue?.value || iconFieldLabel(item.icon?.jsonValue, item.link?.jsonValue?.value?.text)}><span className="a-icon"><AllianzFieldIcon field={item.icon?.jsonValue} decorative /></span></Link>)}</div>;
  return <footer className="c-footer">
    <div className="c-footer__container"><div className="c-footer__navigation"><div className="l-grid l-grid--max-width u-background-inherit"><div className="l-grid__row">
      {(data.primaryNav?.targetItems ?? []).map((group) => {
        const expanded = isEditing || !isMobile || open.includes(group.id);
        const listId = `allianz-footer-${instanceId}-${group.id}`;
        const headingClass = 'c-heading c-footer__navigation-headline c-heading--subsection-xsmall c-icon c-icon--chevron-down';
        const toggle = () => setOpen((previous) => previous.includes(group.id) ? previous.filter((id) => id !== group.id) : [...previous, group.id]);
        return <div key={group.id} className="l-grid__column-medium-3" onKeyDown={(event) => {
          if (event.key === 'Escape' && isMobile && !isEditing && expanded) {
            event.preventDefault();
            setOpen((previous) => previous.filter((id) => id !== group.id));
            event.currentTarget.querySelector<HTMLButtonElement>('button')?.focus();
          }
        }}>
          {isMobile && !isEditing ? <button type="button" className={headingClass} aria-label={group.title?.jsonValue?.value || undefined} aria-expanded={expanded} aria-controls={listId} onClick={toggle}><Text editable={false} tag="span" field={group.title?.jsonValue} /></button> : <Text editable={isEditing} tag="span" field={group.title?.jsonValue} className={headingClass} />}
          <ul id={listId} className="c-footer__navigation-list" hidden={!expanded} aria-label={group.title?.jsonValue?.value}>{(group.children?.results ?? []).map((item) => <li key={item.id} className="c-footer__navigation-item"><Link editable={isEditing} renderChildrenWhenEmpty={isEditing} field={allianzLinkField(item.link?.jsonValue, isEditing)} className="c-footer__navigation-link"><Text editable={isEditing} field={item.title?.jsonValue} /></Link></li>)}</ul>
        </div>;
      })}
    </div></div></div>
      <div className="l-grid l-grid--max-width c-footer__tagline"><div className="l-grid__row justify-content-center"><div className="l-grid__column-large-8 l-grid__column-medium-12"><RichText editable={isEditing} tag="h3" field={data.body?.jsonValue} className="c-heading c-footer__tagline-headline u-text-weight-light c-heading--subsection-medium" /></div></div></div>
      {!isMobile && social('m-footer__social u-hidden-small-down')}
    </div>
    <div className="c-footer__container--curtain-panel"><hr className="c-divider c-divider--compact c-footer__divider" /><div className="c-footer__service">
      <nav className="c-footer__legal" aria-label="Service links">{(data.utilityNav?.targetItems ?? []).map((item) => <Link editable={isEditing} renderChildrenWhenEmpty={isEditing} key={item.id} field={allianzLinkField(item.link?.jsonValue, isEditing)} className="c-footer__legal-link"><Text editable={isEditing} field={item.title?.jsonValue} /></Link>)}</nav>
      <div className="c-footer__copyright"><Text editable={isEditing} field={data.copyright?.jsonValue} tag="small" className="c-copyright" /></div>
      {isMobile && social('m-footer__social u-hidden-medium-up')}
    </div></div>
  </footer>;
};
