'use client';

import { useState } from 'react';
import { Text, Image, type LinkField } from '@sitecore-content-sdk/nextjs';
import { getDatasource, getFieldValue } from '@/lib/component-props';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { LogoTabsProps } from './logo-tabs.props';
import { LogoItem } from './LogoItem';
import { EditableButton as Button } from '@/components/button-component/ButtonComponent';
import { cn } from '@/lib/utils';

function isAuthoringPlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return false;

  const normalizedValue = value.trim();
  return (
    /^(?:brand name|brand [a-d]|brand [1-4])$/i.test(normalizedValue) ||
    /^click to edit(?:\s|$)/i.test(normalizedValue)
  );
}

const editingCtaFallback: LinkField = {
  value: {
    href: '#',
    text: 'Click to edit CTA',
    linktype: 'internal',
  },
};

export const Default: React.FC<LogoTabsProps> = ({
  fields,
  page,
  isPageEditing: propIsPageEditing,
}) => {
  const isPageEditing = propIsPageEditing || page.mode.isEditing;
  const datasource = getDatasource(fields);
  const { title, backgroundImage, logos, logoTabContent } = datasource ?? {};
  const titleField = getFieldValue(title);
  const backgroundImageField = getFieldValue(backgroundImage);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const authoredLogos = logos?.results ?? [];
  const authoredContent = logoTabContent?.results ?? [];
  const publicPairs = authoredLogos.flatMap((logo, index) => {
    const content = authoredContent[index];
    const imageSource = getFieldValue(logo?.logo)?.value?.src;
    const logoTitle = getFieldValue(logo?.title)?.value;
    const contentHeading = getFieldValue(content?.heading)?.value;
    const contentCta = getFieldValue(content?.cta)?.value?.text;

    return content &&
      imageSource &&
      !imageSource.toLocaleLowerCase().includes('logo-placeholder') &&
      !isAuthoringPlaceholder(logoTitle) &&
      !isAuthoringPlaceholder(contentHeading) &&
      !isAuthoringPlaceholder(contentCta)
      ? [{ logo, content }]
      : [];
  });
  const logosData = isPageEditing
    ? authoredLogos
    : publicPairs.map(({ logo }) => logo);
  const contentData = isPageEditing
    ? authoredContent
    : publicPairs.map(({ content }) => content);
  const showTitle =
    Boolean(titleField?.value) &&
    (isPageEditing || !isAuthoringPlaceholder(titleField?.value));

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const tabCount = logosData.length;
    // Skip keyboard navigation if there are no tabs
    if (tabCount === 0) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        setActiveTabIndex((prev) => (prev + 1) % tabCount);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        setActiveTabIndex((prev) => (prev - 1 + tabCount) % tabCount);
        break;
      case 'Home':
        event.preventDefault();
        setActiveTabIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveTabIndex(tabCount - 1);
        break;
    }
  };

  if (fields) {
    const hasLogos = authoredLogos.length > 0;
    const hasBackgroundImage = !!backgroundImageField?.value?.src;

    // Empty authoring states stay editable, but synthetic brands, edit copy,
    // and placeholder images must never become public-facing content.
    if (!isPageEditing && (!datasource || publicPairs.length === 0)) {
      return <></>;
    }

    return (
      <div
        className={cn(
          'text-primary-foreground relative min-h-[800px] w-full overflow-hidden',
        )}
      >
        {/* Background Image */}
        {hasBackgroundImage ? (
          <div className="absolute inset-0">
            <Image
              field={backgroundImageField}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/80" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900" />
        )}

        {/* Content */}
        <div className="@container relative z-10 mx-auto max-w-7xl px-4 py-[88px] sm:px-6 lg:px-8">
          {/* Title */}
          {showTitle ? (
            <Text
              tag="h2"
              field={titleField}
              className="font-heading text-primary-foreground mb-11 font-light tracking-tight [font-size:clamp(3rem,2.143rem_+_2.857cqi,4.5rem)]"
            />
          ) : isPageEditing ? (
            <Text
              tag="h2"
              field={{ value: 'Click to edit title' }}
              className="font-heading text-primary-foreground mb-11 font-light tracking-tight [font-size:clamp(3rem,2.143rem_+_2.857cqi,4.5rem)]"
            />
          ) : null}

          {/* Empty State Message in Editing Mode */}
          {isPageEditing && !hasLogos ? (
            <div className="text-center text-white">
              <p className="text-lg opacity-70">Add a logo tab item to edit.</p>
            </div>
          ) : (
            <>
              {/* If in editing mode with data, display all items stacked */}
              {isPageEditing && hasLogos ? (
                <div className="space-y-10">
                  {logosData.map((logo, index) => (
                    <div
                      key={index}
                      className="border-b border-white/20 pb-10 last:border-0"
                    >
                      <div className="mb-6 flex items-center">
                        <div className="rounded-[20px] bg-white px-6 py-3 shadow-lg">
                          <Image
                            field={getFieldValue(logo?.logo)}
                            className="h-6 w-auto"
                          />
                        </div>
                        <div className="ml-4 text-lg text-white opacity-70">
                          <Text field={getFieldValue(logo?.title)} />
                        </div>
                      </div>

                      <div className="max-w-lg">
                        <Text
                          tag="h3"
                          field={
                            getFieldValue(contentData[index]?.heading) || {
                              value: 'Click to edit content',
                            }
                          }
                          className="font-heading text-primary-foreground mb-4 text-2xl font-medium leading-tight md:text-3xl"
                        />
                        <Button
                          buttonLink={
                            getFieldValue(contentData[index]?.cta) ??
                            editingCtaFallback
                          }
                          variant="rounded-white"
                          className="font-heading px-8 py-2.5 text-sm font-medium"
                          isPageEditing={isPageEditing}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Logo Navigation Container */}
                  {(!isPageEditing ||
                    (isPageEditing && logosData.length > 0)) && (
                    <>
                      <div className="@container mb-28">
                        {/* Logo Navigation */}
                        <div
                          role="tablist"
                          aria-label={titleField?.value || 'Brand tabs'}
                          className="@md:flex-row @md:justify-between flex w-full flex-col gap-4"
                          onKeyDown={handleKeyDown}
                        >
                          {logosData.map((logo, index) => (
                            <LogoItem
                              key={index}
                              {...logo}
                              isActive={activeTabIndex === index}
                              onClick={() => setActiveTabIndex(index)}
                              id={`tab-${index}`}
                              controls={`panel-${index}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Tab Panels Container */}
                      <div aria-live="polite">
                        {contentData
                          .slice(0, logosData.length)
                          .map((content, index) => (
                            <div
                              key={index}
                              role="tabpanel"
                              id={`panel-${index}`}
                              aria-labelledby={`tab-${index}`}
                              className={cn(
                                'max-w-lg transition-[visibility,opacity] duration-300',
                                activeTabIndex === index
                                  ? 'visible opacity-100'
                                  : 'invisible absolute opacity-0',
                              )}
                              hidden={activeTabIndex !== index}
                            >
                              <Text
                                tag="h3"
                                field={getFieldValue(content.heading)}
                                className="font-heading text-primary-foreground mb-4 text-2xl font-medium leading-tight md:text-3xl"
                              />
                              {getFieldValue(content.cta) ? (
                                <Button
                                  buttonLink={getFieldValue(content.cta)!}
                                  variant="rounded-white"
                                  className="font-heading px-8 py-2.5 text-sm font-medium"
                                  isPageEditing={isPageEditing}
                                />
                              ) : null}
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return <NoDataFallback componentName="LogoTabs" />;
};
