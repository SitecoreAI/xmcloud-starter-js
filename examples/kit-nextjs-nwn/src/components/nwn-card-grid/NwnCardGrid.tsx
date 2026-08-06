import { AppPlaceholder, RichText, Text } from '@sitecore-content-sdk/nextjs';
import { cn } from '@/lib/utils';
import type { NwnCardGridProps } from './nwn-card-grid.props';

export const Default: React.FC<NwnCardGridProps> = (props) => {
  const { componentMap, fields, page, params, rendering } = props;
  const isPageEditing = page.mode.isEditing;
  const placeholderId =
    params.DynamicPlaceholderId || rendering.uid || 'default';
  const placeholderName = 'nwn-card-grid-' + placeholderId;
  const wildcardPlaceholderName = 'nwn-card-grid-{*}';
  const hasPlaceholderContent = Boolean(
    rendering.placeholders?.[placeholderName] ||
      rendering.placeholders?.[wildcardPlaceholderName],
  );
  const hasSectionTitle = Boolean(fields?.sectionTitle?.value);
  const hasIntroContent = Boolean(
    fields?.sectionTitle?.value || fields?.intro?.value,
  );

  if (!hasPlaceholderContent && !hasIntroContent && !isPageEditing) return null;

  const headingId =
    'nwn-card-grid-heading-' +
    String(params.RenderingIdentifier || placeholderId).replace(
      /[^a-zA-Z0-9_-]/g,
      '',
    );
  const gridColumns =
    params.columns === '2'
      ? 'md:grid-cols-2'
      : params.columns === '4'
        ? 'md:grid-cols-2 xl:grid-cols-4'
        : 'md:grid-cols-2 lg:grid-cols-3';

  return (
    <section
      data-component="NwnCardGrid"
      data-placeholder-key={placeholderName}
      aria-labelledby={hasSectionTitle ? headingId : undefined}
      className={cn('nwn-card-grid bg-[#f4f5f7] py-12 sm:py-16', params.styles)}
    >
      <div className="nwn-content-shell">
        {(hasIntroContent || isPageEditing) && (
          <div
            className={cn('mb-10 grid gap-5', {
              'lg:grid-cols-[1fr_0.85fr] lg:items-end':
                hasSectionTitle || isPageEditing,
            })}
          >
            <Text
              id={headingId}
              tag="h2"
              field={fields?.sectionTitle}
              className={cn(
                'max-w-[16ch] text-balance font-heading text-[clamp(2.125rem,3.5vw,2.75rem)] font-medium leading-[1.04] text-slate-900',
                !hasSectionTitle && !isPageEditing && 'hidden',
              )}
            />
            <RichText
              field={fields?.intro}
              className="max-w-2xl text-pretty text-base leading-7 sm:text-lg sm:leading-8 text-slate-600"
            />
            {!hasIntroContent && isPageEditing && (
              <p className="text-sm text-slate-500">
                Add an optional section title and introduction.
              </p>
            )}
          </div>
        )}

        <div className={cn('grid gap-6', gridColumns)}>
          <AppPlaceholder
            page={page}
            componentMap={componentMap}
            name={placeholderName}
            rendering={rendering}
          />
        </div>
      </div>
    </section>
  );
};
