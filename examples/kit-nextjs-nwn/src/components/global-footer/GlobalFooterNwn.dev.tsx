'use client';

import { Text } from '@sitecore-content-sdk/nextjs';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { Default as EmailSignupForm } from '@/components/forms/email/EmailSignupForm.dev';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { GlobalFooterProps } from './global-footer.props';

const isLegacyStarterValue = (value: string | undefined): boolean =>
  Boolean(
    value &&
      /alaris|aero|nexa|terra|vehicle|automotive|models|dealership|test drive|test-drive/i.test(
        value,
      ),
  );

const fallbackFooterLinks = [
  ['Account & Billing', '/account-billing'],
  ['Rebates & Offers', '/ways-to-save/rebates-offers'],
  ['Services', '/services'],
  ['Get Natural Gas', '/get-natural-gas'],
  ['Safety', '/safety'],
  ['Company Overview', '/about-us/company-overview'],
  ['Renewable Natural Gas', '/about-us/renewable-natural-gas'],
  ['Less We Can', '/about-us/less-we-can'],
].map(([text, href]) => ({
  link: { jsonValue: { value: { text, href, linktype: 'internal' } } },
}));

const fallbackTagline = {
  value:
    'Safe, reliable energy and practical support for homes across the Pacific Northwest.',
};
const fallbackEmailTitle = { value: 'Get energy tips and service updates.' };
const fallbackCopyright = { value: '© NW Natural. Demo experience.' };

export const GlobalFooterNwn: React.FC<GlobalFooterProps> = (props) => {
  const { fields, isPageEditing } = props;
  const datasource = fields?.data?.datasource;

  if (!fields || !datasource) {
    return <NoDataFallback componentName="Global Footer" />;
  }

  const {
    footerNavLinks,
    footerCopyright,
    socialLinks,
    tagline,
    emailSubscriptionTitle,
  } = datasource;
  const authoredLinks = footerNavLinks?.results ?? [];
  const hasLegacyContent =
    isLegacyStarterValue(tagline?.jsonValue?.value) ||
    isLegacyStarterValue(emailSubscriptionTitle?.jsonValue?.value) ||
    isLegacyStarterValue(footerCopyright?.jsonValue?.value) ||
    authoredLinks.some(
      (item) =>
        isLegacyStarterValue(item.link?.jsonValue?.value?.text) ||
        isLegacyStarterValue(item.link?.jsonValue?.value?.href),
    );
  const useFallbackContent =
    !isPageEditing && (authoredLinks.length === 0 || hasLegacyContent);
  const links = useFallbackContent ? fallbackFooterLinks : authoredLinks;
  const displayTagline = useFallbackContent
    ? fallbackTagline
    : tagline?.jsonValue;
  const displayEmailTitle = useFallbackContent
    ? fallbackEmailTitle
    : emailSubscriptionTitle?.jsonValue;
  const displayCopyright = useFallbackContent
    ? fallbackCopyright
    : footerCopyright?.jsonValue;
  const displaySocialLinks = useFallbackContent
    ? []
    : (socialLinks?.results ?? []).filter(
        (item) =>
          isPageEditing ||
          Boolean(
            item.link?.jsonValue?.value?.href &&
              item.socialIcon?.jsonValue?.value?.src,
          ),
      );
  const shouldShowSignup = isPageEditing || Boolean(displayEmailTitle?.value);

  return (
    <footer
      data-component="GlobalFooter"
      data-variant="Nwn"
      className="nwn-footer bg-[#66717f] text-white"
      role="contentinfo"
    >
      <div className="border-t-8 border-cyan-500">
        <div className="nwn-content-shell grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_1fr] lg:py-16">
          <div>
            <div className="font-heading text-3xl font-semibold tracking-tight">
              NW Natural
            </div>
            <Text
              tag="p"
              field={displayTagline}
              className="mt-5 max-w-md text-lg leading-8 text-white"
            />
            <div className="mt-8 border-l-4 border-cyan-300 bg-slate-900/20 px-5 py-4">
              <p className="font-heading text-xl font-semibold">
                Smell natural gas?
              </p>
              <p className="mt-1 text-sm leading-6 text-white">
                Leave the area immediately, then call our 24-hour emergency
                line.
              </p>
              <a
                href="tel:8008823377"
                className="mt-2 inline-flex min-h-11 items-center font-heading text-xl font-semibold text-white underline decoration-cyan-300 decoration-2 underline-offset-4"
              >
                800-882-3377
              </a>
            </div>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="font-heading text-2xl font-semibold">Explore</h2>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
              {links.map((item, index) => (
                <li key={'nwn-footer-link-' + index}>
                  <EditableButton
                    buttonLink={item.link?.jsonValue}
                    isPageEditing={isPageEditing}
                    variant="ghost"
                    className="h-auto justify-start whitespace-normal p-0 text-left text-base font-medium text-white hover:bg-transparent hover:text-cyan-100"
                    page={props.page}
                  />
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-2 lg:col-span-1">
            {shouldShowSignup && (
              <>
                <Text
                  tag="h2"
                  field={displayEmailTitle}
                  className="font-heading text-2xl font-semibold"
                />
                <div className="mt-6">
                  <EmailSignupForm
                    fields={{
                      buttonVariant: 'default',
                      emailPlaceholder: {
                        value:
                          fields.dictionary?.FOOTER_EmailPlaceholder?.replace(
                            /\s+QA\.?$/i,
                            '',
                          ),
                      },
                      emailSubmitLabel: {
                        value: fields.dictionary?.FOOTER_EmailSubmitLabel,
                      },
                      emailErrorMessage: {
                        value: fields.dictionary?.FOOTER_EmailErrorMessage,
                      },
                      emailSuccessMessage: {
                        value: fields.dictionary?.FOOTER_EmailSuccessMessage,
                      },
                    }}
                  />
                </div>
              </>
            )}

            <div className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white">
                Follow NW Natural
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {displaySocialLinks.map((socialLink, index) => (
                  <li key={'nwn-social-' + index}>
                    <EditableButton
                      buttonLink={socialLink.link?.jsonValue}
                      icon={socialLink.socialIcon?.jsonValue}
                      iconClassName="h-6 w-6 object-contain brightness-0 invert"
                      isPageEditing={isPageEditing}
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-white hover:bg-white/15"
                      asIconLink
                      page={props.page}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/25 bg-slate-900/15">
        <div className="nwn-content-shell flex flex-col gap-3 py-5 text-sm text-white sm:flex-row sm:items-center sm:justify-between">
          <Text field={displayCopyright} encode={false} />
          <p>Safe. Reliable. Ready for what comes next.</p>
        </div>
      </div>
    </footer>
  );
};
