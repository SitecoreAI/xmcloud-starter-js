'use client';
import type React from 'react';
import type { PageHeaderProps } from './page-header.props';
import { PageHeaderDefault } from './PageHeaderDefault.dev';
import { PageHeaderBlueText } from './PageHeaderBlueText.dev';
import { PageHeaderFiftyFifty } from './PageHeaderFiftyFifty.dev';
import { PageHeaderBlueBackground } from './PageHeaderBlueBackground.dev';
import { PageHeaderCentered } from './PageHeaderCentered.dev';
import { PageHeaderOfficeBanner } from './PageHeaderOfficeBanner.dev';
import { PageHeaderLawyerProfile } from './PageHeaderLawyerProfile.dev';

/* 
  This component is a page header with multiple variants:
  - Default: Shows the header as per the provided design
  - BlueText: Modified version with blue text styling (to be implemented)
  - 50-50: Equal width layout for the left and right content (to be implemented)
*/

// Default display of the component
export const Default: React.FC<PageHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;
  const itemPath = props.page.layout.sitecore.context.itemPath;
  const normalizedItemPath =
    typeof itemPath === 'string' ? itemPath.replace(/\/+$/, '') : '';
  const isOfficeDetailPage = /(?:^|\/)locations\/.+/i.test(normalizedItemPath);
  const isLawyerDetailPage = /(?:^|\/)lawyers\/.+/i.test(normalizedItemPath);

  // Existing office pages predate this variant. Keep them visually correct until
  // authors explicitly select OfficeBanner in the Styling panel.
  if (isOfficeDetailPage) {
    return <PageHeaderOfficeBanner {...props} isPageEditing={isEditing} />;
  }

  // Lawyer profiles use the same authorable page fields as other detail pages,
  // but arrange the portrait and overview as one responsive profile header.
  if (isLawyerDetailPage) {
    return <PageHeaderLawyerProfile {...props} isPageEditing={isEditing} />;
  }

  return <PageHeaderDefault {...props} isPageEditing={isEditing} />;
};

// Variants
export const BlueText: React.FC<PageHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <PageHeaderBlueText {...props} isPageEditing={isEditing} />;
};

export const FiftyFifty: React.FC<PageHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <PageHeaderFiftyFifty {...props} isPageEditing={isEditing} />;
};

export const BlueBackground: React.FC<PageHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <PageHeaderBlueBackground {...props} isPageEditing={isEditing} />;
};

export const Centered: React.FC<PageHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <PageHeaderCentered {...props} isPageEditing={isEditing} />;
};

export const OfficeBanner: React.FC<PageHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <PageHeaderOfficeBanner {...props} isPageEditing={isEditing} />;
};
