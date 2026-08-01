'use client';
import type { TextBannerProps } from './text-banner.props';
import { TextBannerDefault } from './TextBannerDefault.dev';
import { TextBannerTextTop } from './TextBannerTextTop.dev';
import { TextBannerBlueTitleRight } from './TextBannerBlueTitleRight.dev';

import { TextBanner01 as TextBannerVariant01 } from './TextBanner01.dev';
import { TextBanner02 as TextBannerVariant02 } from './TextBanner02.dev';
// Data source checks are done in the child components

// Default display of the component
export const Default: React.FC<TextBannerProps> = (props) => {
  const { isEditing } = props.page.mode;
  const itemPath = props.page.layout.sitecore.context.itemPath;
  const dataSource = props.rendering.dataSource ?? '';
  const heading = props.fields?.heading?.value?.trim() ?? '';
  const isOfficeDetailPage =
    typeof itemPath === 'string' &&
    /(?:^|\/)locations\/.+/i.test(itemPath.replace(/\/+$/, ''));
  const isLawyerDetailPage =
    typeof itemPath === 'string' &&
    /(?:^|\/)lawyers\/.+/i.test(itemPath.replace(/\/+$/, ''));

  // Lawyer overview copy now lives in the page-level summary field and renders
  // directly in the profile header. Suppress the legacy banner left on existing
  // profiles and in the approved page branch so the copy is not duplicated.
  const isLegacyLawyerOverview =
    /^overview$/i.test(heading) ||
    /profile[_ -]?(?:overview|introduction)$/i.test(dataSource) ||
    /17ca14e4-59a7-482d-92ce-0402eb6c2eb3/i.test(dataSource);

  if (isLawyerDetailPage && isLegacyLawyerOverview) {
    return null;
  }

  if (isOfficeDetailPage) {
    const isOfficeDetails =
      /office[_ -]?details$/i.test(dataSource) || /^visit our\b/i.test(heading);

    return isOfficeDetails ? (
      <TextBannerVariant01 {...props} isPageEditing={isEditing} />
    ) : (
      <TextBannerVariant02 {...props} isPageEditing={isEditing} />
    );
  }

  return <TextBannerDefault {...props} isPageEditing={isEditing} />;
};

// Variants
export const TextBanner01: React.FC<TextBannerProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <TextBannerVariant01 {...props} isPageEditing={isEditing} />;
};

export const TextBanner02: React.FC<TextBannerProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <TextBannerVariant02 {...props} isPageEditing={isEditing} />;
};

export const TextTop: React.FC<TextBannerProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <TextBannerTextTop {...props} isPageEditing={isEditing} />;
};

export const BlueTitleRight: React.FC<TextBannerProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <TextBannerBlueTitleRight {...props} isPageEditing={isEditing} />;
};
