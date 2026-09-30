import { Image, Link, RichText, Text } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { safeLink } from 'lib/allianz-fields';
import type { AllianzFooterProps } from './allianz-footer.props';

export const Default = ({ fields }: AllianzFooterProps) => {
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzFooter" />;
  return <footer className="c-footer">
    <div className="c-footer__container"><div className="c-footer__navigation"><div className="l-grid l-grid--max-width u-background-inherit"><div className="l-grid__row">
      {(data.primaryNav?.targetItems ?? []).map((group) => <div key={group.id} className="l-grid__column-medium-3">
        <Text tag="span" field={group.title?.jsonValue} className="c-heading c-footer__navigation-headline c-heading--subsection-xsmall" />
        <ul className="c-footer__navigation-list" aria-label={group.title?.jsonValue?.value}>{(group.children?.results ?? []).map((item) => <li key={item.id} className="c-footer__navigation-item"><Link field={safeLink(item.link?.jsonValue)} className="c-footer__navigation-link"><Text field={item.title?.jsonValue} /></Link></li>)}</ul>
      </div>)}
    </div></div></div>
      <div className="l-grid l-grid--max-width c-footer__tagline"><div className="l-grid__row justify-content-center"><div className="l-grid__column-large-8 l-grid__column-medium-12"><RichText tag="h3" field={data.body?.jsonValue} className="c-heading c-footer__tagline-headline u-text-weight-light c-heading--subsection-medium" /></div></div></div>
      <div className="m-footer__social u-hidden-small-down" aria-label="Social networks">{(data.socialNav?.targetItems ?? []).map((item) => <Link field={safeLink(item.link?.jsonValue)} key={item.id} className="m-footer__social-link"><span className="a-icon"><Image field={item.icon?.jsonValue} /></span></Link>)}</div>
    </div>
    <div className="c-footer__container--curtain-panel"><hr className="c-divider c-divider--compact c-footer__divider" /><div className="c-footer__service">
      <nav className="c-footer__legal" aria-label="Service links">{(data.utilityNav?.targetItems ?? []).map((item) => <Link key={item.id} field={safeLink(item.link?.jsonValue)} className="c-footer__legal-link"><Text field={item.title?.jsonValue} /></Link>)}</nav>
      <div className="c-footer__copyright"><Text field={data.copyright?.jsonValue} tag="small" className="c-copyright" /></div>
    </div></div>
  </footer>;
};
