'use client';

import type React from 'react';
import { useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Facebook, Linkedin, Twitter, Link, Check, Mail } from 'lucide-react';
import { DateField, Text } from '@sitecore-content-sdk/nextjs';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { Badge } from '@/components/ui/badge';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { ButtonBase } from '../button-component/ButtonComponent';
import { FloatingDock } from '@/components/floating-dock/floating-dock.dev';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { getFieldValue } from '@/lib/component-props';
import type {
  ArticleHeaderDatasource,
  ArticleHeaderProps,
  ArticleReferenceItem,
  ArticleHeaderRouteFields,
} from './article-header.props';
import { hasDocument, hasNavigator, isBrowser } from '@/utils/browser';

const formatArticleDate = (date: Date | null, locale: string): string => {
  if (!date || Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

const getReferenceTitle = (item?: ArticleReferenceItem | null): string => {
  const pageTitleField = getFieldValue(item?.fields?.pageHeaderTitle);
  const titleField = getFieldValue(item?.fields?.titleRequired);
  const title = titleField?.value?.toString();

  if (title?.trim().toLowerCase() === 'source material') {
    return item?.displayName || item?.name || title;
  }

  return (
    pageTitleField?.value?.toString() ||
    title ||
    item?.displayName ||
    item?.name ||
    ''
  );
};

const getReferenceHref = (item?: ArticleReferenceItem | null): string => {
  if (!item?.url) return '';

  return typeof item.url === 'string' ? item.url : item.url.href || '';
};

const getLanguageLabel = (locale?: string): string => {
  const languageCode = locale?.toLowerCase().split('-')[0];

  const labels: Record<string, string> = {
    de: 'German',
    en: 'English',
    fr: 'French',
    ja: 'Japanese',
  };

  return labels[languageCode || 'en'] || locale || 'English';
};

export const Default: React.FC<ArticleHeaderProps> = (props) => {
  const { fields, page } = props;
  const datasource: ArticleHeaderDatasource | undefined =
    fields?.data?.datasource;
  const queriedFields = fields?.data?.externalFields;
  const routeFields = page.layout.sitecore.route
    ?.fields as ArticleHeaderRouteFields;
  const externalFields = routeFields
    ? {
        pageHeaderTitle: routeFields.pageHeaderTitle,
        pageSummary: routeFields.pageSummary,
        pageReadTime: routeFields.pageReadTime,
        pageDisplayDate: routeFields.pageDisplayDate,
        pageAuthor: routeFields.taxAuthor,
        contentType: routeFields.taxContentType,
        topics: routeFields.taxTopic,
        relatedPractice: routeFields.relatedPractice,
        relatedOffice: routeFields.relatedOffice,
        sourceItem: routeFields.sourceItem,
        relatedInsights: routeFields.relatedInsights,
      }
    : queriedFields;
  const imageField = getFieldValue(datasource?.imageRequired);
  const eyebrowField = getFieldValue(datasource?.eyebrowOptional);
  const pageHeaderTitleField = getFieldValue(externalFields?.pageHeaderTitle);
  const pageSummaryField = getFieldValue(externalFields?.pageSummary);
  const pageReadTimeField = getFieldValue(externalFields?.pageReadTime);
  const pageDisplayDateField = getFieldValue(externalFields?.pageDisplayDate);
  const pageAuthorField = getFieldValue(externalFields?.pageAuthor);
  const practiceItem = getFieldValue(externalFields?.relatedPractice);
  const officeItem = getFieldValue(externalFields?.relatedOffice);
  const contentTypeItem = getFieldValue(externalFields?.contentType);
  const topicItems = getFieldValue(externalFields?.topics) || [];
  const sourceItem = getFieldValue(externalFields?.sourceItem);
  const sourceDescriptionField = getFieldValue(
    sourceItem?.fields?.descriptionOptional,
  );
  const sourceLinkField = getFieldValue(sourceItem?.fields?.linkOptional);
  const relatedInsights = getFieldValue(externalFields?.relatedInsights) || [];
  const isPageEditing = page.mode.isEditing;
  const hasImage = Boolean(imageField?.value?.src);
  const { toast } = useToast();
  const [copySuccess, setCopySuccess] = useState(false);
  const copyNotificationRef = useRef<HTMLDivElement>(null);

  if (datasource) {
    const handleShare = (platform: string) => {
      if (!isBrowser) return;

      const url = encodeURIComponent(window.location.href);
      const title = encodeURIComponent(hasDocument ? document.title : '');
      let shareUrl = '';

      switch (platform) {
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
          break;
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
          break;
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
          break;
        case 'email':
          shareUrl = `mailto:?subject=${title}&body=${url}`;
          window.location.href = shareUrl;
          return;
        case 'copy':
          if (hasNavigator() && navigator.clipboard) {
            navigator.clipboard
              .writeText(window.location.href)
              .then(() => {
                // Show toast notification
                toast({
                  title: 'Link copied!',
                  description: 'The link has been copied to your clipboard.',
                  duration: 3000, // Explicitly set duration
                });

                setCopySuccess(true);

                if (copyNotificationRef.current) {
                  copyNotificationRef.current.textContent =
                    'Link copied to clipboard';
                }
              })
              .catch((err) => {
                console.error('Failed to copy: ', err);
                toast({
                  title: 'Copy failed',
                  description: 'Could not copy the link to clipboard.',
                  variant: 'destructive',
                });
              });
          }
          return;
      }

      window.open(shareUrl, '_blank', 'width=600,height=400');
    };

    const links = [
      {
        title: 'Share on Facebook',
        icon: (
          <Facebook
            className="h-full w-full text-white dark:text-neutral-300"
            aria-hidden="true"
          />
        ),
        href: '#',
        onClick: () => handleShare('facebook'),
        ariaLabel: 'Share on Facebook',
      },
      {
        title: 'Share on Twitter',
        icon: (
          <Twitter
            className="h-full w-full text-white dark:text-neutral-300"
            aria-hidden="true"
          />
        ),
        href: '#',
        onClick: () => handleShare('twitter'),
        ariaLabel: 'Share on Twitter',
      },
      {
        title: 'Share on LinkedIn',
        icon: (
          <Linkedin
            className="h-full w-full text-white dark:text-neutral-300"
            aria-hidden="true"
          />
        ),
        href: '#',
        onClick: () => handleShare('linkedin'),
        ariaLabel: 'Share on LinkedIn',
      },
      {
        title: 'Share via Email',
        icon: (
          <Mail
            className="h-full w-full text-white dark:text-neutral-300"
            aria-hidden="true"
          />
        ),
        href: '#',
        onClick: () => handleShare('email'),
        ariaLabel: 'Share via Email',
      },
      {
        title: 'Copy Link',
        icon: copySuccess ? (
          <Check
            className="h-full w-full text-green-500 dark:text-green-400"
            aria-hidden="true"
          />
        ) : (
          <Link
            className="h-full w-full text-white dark:text-neutral-300"
            aria-hidden="true"
          />
        ),
        href: '#',
        onClick: () => handleShare('copy'),
        ariaLabel: copySuccess ? 'Link copied' : 'Copy link',
      },
    ];

    const authorFirstName = pageAuthorField?.fields?.personFirstName?.value;
    const authorLastName = pageAuthorField?.fields?.personLastName?.value;
    const authorName = [authorFirstName, authorLastName]
      .filter(Boolean)
      .join(' ');
    const authorInitials = [authorFirstName, authorLastName]
      .filter(Boolean)
      .map((name) => name?.charAt(0))
      .join('');

    return (
      <>
        <header
          data-component="ArticleHeader"
          className="@container/article-header bg-[#090e13] text-white"
        >
          <div className="legal-content-shell py-10 @md/article-header:py-14">
            <ButtonBase
              buttonLink={{
                value: {
                  href: '/News-and-Insights',
                  text: 'Back to News and Insights',
                },
              }}
              className="text-accent hover:text-accent/80 h-auto px-0 text-sm font-medium"
              icon={{ value: 'arrow-left' }}
              variant="link"
              iconPosition="leading"
              isPageEditing={false}
            />

            <div className="mt-10 max-w-5xl">
              {(eyebrowField?.value || isPageEditing) && (
                <Badge className="bg-accent text-accent-foreground hover:bg-accent mb-5 inline-flex text-sm font-medium">
                  <Text field={eyebrowField} />
                </Badge>
              )}
              <Text
                tag="h1"
                className="font-heading max-w-[22ch] text-balance text-[clamp(2.5rem,5cqi,3.875rem)] font-light leading-[1.02] tracking-[-0.025em] antialiased"
                field={pageHeaderTitleField}
              />
              {(pageSummaryField?.value || isPageEditing) && (
                <Text
                  tag="p"
                  className="mt-6 max-w-3xl text-pretty text-lg leading-relaxed text-white/80 antialiased @md/article-header:text-xl"
                  field={pageSummaryField}
                />
              )}
              {(pageReadTimeField?.value ||
                pageDisplayDateField?.value ||
                isPageEditing) && (
                <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
                  {(pageReadTimeField?.value || isPageEditing) && (
                    <Text tag="span" field={pageReadTimeField} />
                  )}
                  {pageReadTimeField?.value && pageDisplayDateField?.value && (
                    <span aria-hidden="true">•</span>
                  )}
                  {pageDisplayDateField &&
                    (pageDisplayDateField.value || isPageEditing) && (
                      <DateField
                        tag="span"
                        field={pageDisplayDateField}
                        render={(date) =>
                          formatArticleDate(date, page.locale || 'en-US')
                        }
                      />
                    )}
                </div>
              )}

              {(practiceItem ||
                officeItem ||
                topicItems.length > 0 ||
                contentTypeItem ||
                isPageEditing) && (
                <dl className="mt-8 grid grid-cols-2 gap-4 rounded-default bg-white/[0.055] p-5 @lg/article-header:grid-cols-5">
                  {(practiceItem || isPageEditing) && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.12em] text-white/55">
                        Practice
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {practiceItem ? (
                          <a
                            className="text-accent underline-offset-4 hover:underline"
                            href={getReferenceHref(practiceItem)}
                          >
                            {getReferenceTitle(practiceItem)}
                          </a>
                        ) : (
                          <span className="text-white/60">
                            Select a practice
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {(officeItem || isPageEditing) && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.12em] text-white/55">
                        Office
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {officeItem ? (
                          <a
                            className="text-accent underline-offset-4 hover:underline"
                            href={getReferenceHref(officeItem)}
                          >
                            {getReferenceTitle(officeItem)}
                          </a>
                        ) : (
                          <span className="text-white/60">
                            Select an office
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {(contentTypeItem || isPageEditing) && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.12em] text-white/55">
                        Content type
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {contentTypeItem ? (
                          getReferenceTitle(contentTypeItem)
                        ) : (
                          <span className="text-white/60">
                            Select a content type
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {(topicItems.length > 0 || isPageEditing) && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.12em] text-white/55">
                        Topic
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {topicItems.length > 0 ? (
                          topicItems
                            .map(getReferenceTitle)
                            .filter(Boolean)
                            .join(', ')
                        ) : (
                          <span className="text-white/60">Select a topic</span>
                        )}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-white/55">
                      Language
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {getLanguageLabel(page.locale)}
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {(hasImage || isPageEditing) && (
              <figure className="relative mt-10 aspect-[16/9] w-full overflow-hidden rounded-default bg-white/5">
                <ImageWrapper
                  image={imageField}
                  className="absolute inset-0 h-full w-full object-cover"
                  wrapperClass="absolute inset-0 h-full w-full"
                  priority
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  page={page}
                />
              </figure>
            )}

            <div className="mt-6 flex flex-col gap-5 pt-5 @md/article-header:flex-row @md/article-header:items-center @md/article-header:justify-between">
              {(authorName || isPageEditing) && (
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={
                        pageAuthorField?.fields?.personProfileImage?.value?.src
                      }
                      alt={authorName}
                    />
                    <AvatarFallback>{authorInitials || 'A'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/60">
                      Author
                    </p>
                    {authorName ? (
                      <p className="truncate font-medium">
                        <Text
                          tag="span"
                          field={pageAuthorField?.fields?.personFirstName}
                        />{' '}
                        <Text
                          tag="span"
                          field={pageAuthorField?.fields?.personLastName}
                        />
                      </p>
                    ) : (
                      <p className="font-medium text-white/60">
                        Select an author
                      </p>
                    )}
                    {pageAuthorField?.fields?.personJobTitle && (
                      <Text
                        tag="p"
                        field={pageAuthorField.fields.personJobTitle}
                        className="text-sm text-white/60"
                      />
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 @md/article-header:ml-auto">
                <span className="text-sm text-white/60">Share</span>
                <FloatingDock items={links} forceCollapse />
              </div>
            </div>

            {(sourceItem || relatedInsights.length > 0 || isPageEditing) && (
              <div className="mt-8 grid gap-7 rounded-default bg-white/[0.055] p-6 @lg/article-header:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-white/55">
                    Source material
                  </p>
                  {sourceItem ? (
                    <>
                      <p className="mt-2 font-medium">
                        {getReferenceTitle(sourceItem)}
                      </p>
                      {sourceDescriptionField?.value && (
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                          {sourceDescriptionField.value}
                        </p>
                      )}
                      {sourceLinkField?.value?.href && (
                        <a
                          className="text-accent mt-3 inline-flex text-sm font-medium underline-offset-4 hover:underline"
                          href={sourceLinkField.value.href}
                          target={sourceLinkField.value.target || undefined}
                          rel="noreferrer"
                        >
                          {sourceLinkField.value.text || 'View source'}
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-white/60">
                      Select source material in the Content panel.
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-white/55">
                    Related insights
                  </p>
                  {relatedInsights.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {relatedInsights.map((item) => (
                        <li key={item.id}>
                          <a
                            className="text-accent text-sm font-medium underline-offset-4 hover:underline"
                            href={getReferenceHref(item)}
                          >
                            {getReferenceTitle(item)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-white/60">
                      Select related insights in the Content panel.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Screen reader notification */}
          <div
            ref={copyNotificationRef}
            className="sr-only"
            aria-live="polite"
          ></div>
        </header>
        <Toaster />
      </>
    );
  }

  return <NoDataFallback componentName="ArticleHeader" />;
};
