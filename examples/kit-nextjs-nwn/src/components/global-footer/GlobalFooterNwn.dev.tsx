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
  ['Ways to Save', '/ways-to-save'],
  ['Services', '/services'],
  ['Get Natural Gas', '/get-natural-gas'],
  ['Safety', '/safety'],
  ['About Us', '/about-us'],
].map(([text, href]) => ({
  link: { jsonValue: { value: { text, href, linktype: 'internal' } } },
}));

const fallbackEmailTitle = { value: 'Get energy tips and service updates.' };
const fallbackCopyright = {
  value: `© ${new Date().getFullYear()} NW Natural. All Rights Reserved.`,
};

const utilityLinks = [
  {
    text: 'Terms and Conditions',
    href: 'https://www.nwnatural.com/terms-and-conditions',
  },
  {
    text: 'Privacy Notice',
    href: 'https://www.nwnatural.com/privacy-notice',
  },
  {
    text: 'Bill Inserts',
    href: 'https://www.nwnatural.com/account/bill-inserts',
  },
  { text: 'En Español', href: 'https://www.nwnatural.com/espanol' },
  {
    text: 'Your Privacy Choices',
    href: 'https://www.nwnatural.com/do-not-share-my-data',
  },
] as const;

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
    emailSubscriptionTitle,
  } = datasource;
  const authoredLinks = footerNavLinks?.results ?? [];
  const hasLegacyContent =
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
  const shouldIdentifyWithCdp = !isPageEditing && props.page.mode.isNormal;

  return (
    <footer
      data-component="GlobalFooter"
      data-variant="Nwn"
      className="nwn-footer bg-[#66717f] text-white"
      role="contentinfo"
    >
      <div className="nwn-content-shell py-6 text-center">
        {shouldShowSignup && (
          <div className="mx-auto max-w-4xl border-b border-white/20 pb-4">
            <div className="flex flex-col items-center justify-center gap-3 md:flex-row md:gap-5">
              <Text
                tag="h2"
                field={displayEmailTitle}
                className="font-heading text-lg font-semibold leading-7 md:max-w-72 md:text-left md:text-xl"
              />
              <div className="w-full max-w-xl flex-1 text-left">
                <EmailSignupForm
                  cdpIdentity={
                    shouldIdentifyWithCdp
                      ? {
                          provider:
                            process.env
                              .NEXT_PUBLIC_SITECORE_CDP_IDENTITY_PROVIDER ||
                            'email',
                          source: 'global_footer',
                        }
                      : undefined
                  }
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
                    submissionErrorMessage: {
                      value:
                        'We could not complete your signup. Please try again.',
                    },
                  }}
                />
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/90">
              By subscribing, you agree to receive NW Natural email updates. See
              our{' '}
              <a
                href="https://www.nwnatural.com/privacy-notice"
                className="font-semibold text-white underline underline-offset-2"
              >
                Privacy Notice
              </a>
              .
            </p>
          </div>
        )}

        <nav className="mt-3" aria-label="Footer navigation">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            {links.map((item, index) => (
              <li key={'nwn-footer-link-' + index}>
                <EditableButton
                  buttonLink={item.link?.jsonValue}
                  isPageEditing={isPageEditing}
                  variant="ghost"
                  className="h-auto min-h-11 whitespace-normal px-1 py-2 text-center text-[1.125rem] font-medium text-white hover:bg-transparent hover:text-cyan-100"
                  page={props.page}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-3 flex flex-col items-center justify-center gap-2 md:flex-row md:gap-5">
          {(displaySocialLinks.length > 0 || isPageEditing) && (
            <div>
              <h2 className="sr-only">Follow NW Natural</h2>
              <ul className="flex flex-wrap justify-center gap-1">
                {displaySocialLinks.map((socialLink, index) => (
                  <li key={'nwn-social-' + index}>
                    <EditableButton
                      buttonLink={socialLink.link?.jsonValue}
                      icon={socialLink.socialIcon?.jsonValue}
                      iconClassName="h-7 w-7 object-contain brightness-0 invert"
                      isPageEditing={isPageEditing}
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11 rounded-full text-white hover:bg-white/15"
                      asIconLink
                      page={props.page}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <nav aria-label="Legal">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
              {utilityLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-white underline-offset-4 hover:underline"
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-2 text-sm text-white">
          <Text field={displayCopyright} encode={false} />
        </div>
      </div>
    </footer>
  );
};
