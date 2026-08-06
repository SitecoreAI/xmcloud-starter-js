'use client';
import type React from 'react';
import type { GlobalHeaderProps } from './global-header.props';
import { GlobalHeaderDefault } from './GlobalHeaderDefault.dev';
import { GlobalHeaderCentered } from './GlobalHeaderCentered.dev';
import { GlobalHeaderNwn } from './GlobalHeaderNwn.dev';
// Data source checks are done in the child components

// Default display of the component
export const Default: React.FC<GlobalHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;

  return <GlobalHeaderNwn {...props} isPageEditing={isEditing} />;
};

// Original starter-kit presentation retained for authored legacy variants.
export const StarterDefault: React.FC<GlobalHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;

  return <GlobalHeaderDefault {...props} isPageEditing={isEditing} />;
};

// Variants
export const Centered: React.FC<GlobalHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;

  return <GlobalHeaderNwn {...props} isPageEditing={isEditing} />;
};

export const StarterCentered: React.FC<GlobalHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;

  return <GlobalHeaderCentered {...props} isPageEditing={isEditing} />;
};

export const Nwn: React.FC<GlobalHeaderProps> = (props) => {
  const { isEditing } = props.page.mode;

  return <GlobalHeaderNwn {...props} isPageEditing={isEditing} />;
};
