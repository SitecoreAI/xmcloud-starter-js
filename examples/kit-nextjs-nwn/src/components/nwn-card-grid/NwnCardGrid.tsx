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
      aria-labelledby={fields?.sectionTitle?.value ? headingId : undefined}
      className={cn('nwn-card-grid bg-[#f4f5f7] py-14 sm:py-20', params.styles)}
    >
      <div className="nwn-content-shell">
        {(fields || isPageEditing) && (
          <div className="mb-10 grid gap-5 lg:grid-cols-[1fr_0.85fr] lg:items-end">
            <Text
              id={headingId}
              tag="h2"
              field={fields?.sectionTitle}
              className="max-w-[16ch] text-balance font-heading text-[clamp(2.5rem,5vw,3.5rem)] font-medium leading-[1.04] text-slate-900"
            />
            <RichText
              field={fields?.intro}
              className="max-w-2xl text-pretty text-lg leading-8 text-slate-600"
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
