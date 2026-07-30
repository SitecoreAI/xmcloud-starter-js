'use client';

import type React from 'react';

import { useRef } from 'react';
import { Text } from '@sitecore-content-sdk/nextjs';
import type { GlobalFooterProps } from './global-footer.props';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { cn } from '@/lib/utils';
import { Default as EmailSignupForm } from '@/components/forms/email/EmailSignupForm.dev';
import { EditableButton } from '@/components/button-component/ButtonComponent';
import { AnimatedHoverNav } from '@/components/ui/animated-hover-nav';
import { Default as FooterNavigationColumn } from './FooterNavigationColumn.dev';
import { useContainerQuery } from '@/hooks/use-container-query';
import { FooterLogo } from './footer-logo.util';

export const GlobalFooterBlackLarge: React.FC<GlobalFooterProps> = (props) => {
  const { fields, isPageEditing } = props;
  const { dictionary } = fields;
  const {
    footerNavLinks,
    footerCopyright,
    socialLinks,
    tagline,
    emailSubscriptionTitle,
    footerLogo,
  } = fields.data.datasource ?? {};
  const footerRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const socialContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useContainerQuery(footerRef, 'md', 'max');

  if (fields) {
    return (
      <footer
        className="@container bg-background text-foreground relative w-full overflow-hidden"
        ref={footerRef}
        role="contentinfo"
      >
        {/* Main footer content */}
        <div className="pb-16 pt-12">
          <div className="legal-content-shell relative z-10">
            <div className="grid grid-cols-1  items-end gap-8 md:grid-cols-[1fr,auto]">
              {/* Left section with heading and subscription */}
              <div>
                {/* Left section with heading */}
                <div className="max-w-[400px]">
                  <Text
                    tag="h2"
                    field={tagline?.jsonValue}
                    className="legal-display-heading font-heading text-75xl mb-10 max-w-[18ch] text-pretty font-light antialiased"
                  />
                  {/* Navigation links */}
                </div>

                <Text
                  className="font-body mb-4 text-xl font-medium"
                  field={emailSubscriptionTitle?.jsonValue}
                  tag="p"
                />

                <div className="@sm:flex-row flex max-w-md flex-col gap-2">
                  <EmailSignupForm
                    fields={{
                      buttonVariant: 'default',
                      emailPlaceholder: {
                        value: dictionary?.FOOTER_EmailPlaceholder,
                      },
                      emailSubmitLabel: {
                        value: dictionary?.FOOTER_EmailSubmitLabel,
                      },
                      emailErrorMessage: {
                        value: dictionary?.FOOTER_EmailErrorMessage,
                      },
                      emailSuccessMessage: {
                        value: dictionary?.FOOTER_EmailSuccessMessage,
                      },
                    }}
                  />
                </div>
                <FooterLogo
                  logo={footerLogo?.jsonValue}
                  isPageEditing={isPageEditing}
                  page={props.page}
                />
              </div>

              {/* Right section with navigation links - using vertical AnimatedHoverNav */}
              <div
                className="@md:items-end flex flex-col gap-2 text-right"
                ref={navContainerRef}
              >
                <FooterNavigationColumn
                  items={footerNavLinks?.results}
                  isPageEditing={isPageEditing}
                  parentRef={footerRef}
                  indicatorClassName="h-0-5 bg-white rounded-default mt-10"
                  alignItems={isMobile ? 'start' : 'end'}
                  orientation="vertical"
                  listClassName="gap-0 flex list-none flex-wrap p-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom footer with social icons and copyright */}
        <div>
          <div className="legal-content-shell @sm:flex-row @sm:justify-between flex flex-col items-center justify-start gap-4 py-12">
            {/* Social media icons - using responsive AnimatedHoverNav */}
            <div ref={socialContainerRef}>
              <AnimatedHoverNav
                parentRef={footerRef}
                orientation="horizontal"
                indicatorClassName="h-0-5 bg-white rounded-default bottom-0 mt-10"
                mobileBreakpoint={null}
              >
                <ul className="@sm:gap-6 mx-auto flex items-center gap-4">
                  {socialLinks?.results?.map((socialLink, index) => (
                    <li key={index} className="relative z-10">
                      <EditableButton
                        buttonLink={socialLink?.link?.jsonValue}
                        className={cn('relative hover:bg-transparent')}
                        variant="ghost"
                        size={isPageEditing ? 'default' : 'icon'}
                        isPageEditing={isPageEditing}
                        icon={socialLink?.socialIcon?.jsonValue}
                        asIconLink={true}
                      />
                    </li>
                  ))}
                </ul>
              </AnimatedHoverNav>
            </div>
            {/* Copyright text */}
            <Text field={footerCopyright?.jsonValue} encode={false} />
          </div>
        </div>
      </footer>
    );
  }
  return <NoDataFallback componentName="Global Footer - Black Large" />;
};
