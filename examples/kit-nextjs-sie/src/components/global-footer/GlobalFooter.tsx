'use client';

import type React from 'react';
import type { GlobalFooterProps } from './global-footer.props';
import { GlobalFooterDefault } from './GlobalFooterDefault.dev';
import { GlobalFooterBlackCompact } from './GlobalFooterBlackCompact.dev';
import { GlobalFooterBlackLarge } from './GlobalFooterBlackLarge.dev';
import { GlobalFooterBlueCentered } from './GlobalFooterBlueCentered.dev';
import { GlobalFooterBlueCompact } from './GlobalFooterBlueCompact.dev';
import { GlobalFooterNwn } from './GlobalFooterNwn.dev';
import { useTranslations } from 'next-intl';
import { dictionaryKeys } from '@/variables/dictionary';
// Data source checks are done in the child components

const resolveDictionaryValue = (
  value: string,
  key: string,
  fallback: string,
) => (value && value !== key ? value : fallback);

const createFooterDictionary = (t: ReturnType<typeof useTranslations>) => ({
  FOOTER_EmailSubmitLabel: resolveDictionaryValue(
    t(dictionaryKeys.FOOTER_EmailSubmitLabel),
    dictionaryKeys.FOOTER_EmailSubmitLabel,
    'Subscribe',
  ),
  FOOTER_EmailPlaceholder: resolveDictionaryValue(
    t(dictionaryKeys.FOOTER_EmailPlaceholder),
    dictionaryKeys.FOOTER_EmailPlaceholder,
    'Enter your email address',
  ),
  FOOTER_EmailErrorMessage: resolveDictionaryValue(
    t(dictionaryKeys.FOOTER_EmailErrorMessage),
    dictionaryKeys.FOOTER_EmailErrorMessage,
    'Please enter a valid email address',
  ),
  FOOTER_EmailSuccessMessage: resolveDictionaryValue(
    t(dictionaryKeys.FOOTER_EmailSuccessMessage),
    dictionaryKeys.FOOTER_EmailSuccessMessage,
    'Thank you for subscribing!',
  ),
});

// Default display of the component
export const Default: React.FC<GlobalFooterProps> = (props) => {
  const { isEditing } = props.page.mode;
  const t = useTranslations();
  const dictionary = createFooterDictionary(t);
  props.fields.dictionary = dictionary;

  return <GlobalFooterNwn {...props} isPageEditing={isEditing} />;
};

export const StarterDefault: React.FC<GlobalFooterProps> = (props) => {
  const { isEditing } = props.page.mode;
  const t = useTranslations();
  const dictionary = createFooterDictionary(t);
  props.fields.dictionary = dictionary;

  return <GlobalFooterDefault {...props} isPageEditing={isEditing} />;
};

// Variants
export const BlackCompactVariant: React.FC<GlobalFooterProps> = (props) => {
  const { isEditing } = props.page.mode;
  const t = useTranslations();
  const dictionary = createFooterDictionary(t);
  props.fields.dictionary = dictionary;

  return <GlobalFooterNwn {...props} isPageEditing={isEditing} />;
};

export const BlackLargeVariant: React.FC<GlobalFooterProps> = (props) => {
  const { isEditing } = props.page.mode;
  const t = useTranslations();
  const dictionary = createFooterDictionary(t);
  props.fields.dictionary = dictionary;

  return <GlobalFooterNwn {...props} isPageEditing={isEditing} />;
};

export const BlueCenteredVariant: React.FC<GlobalFooterProps> = (props) => {
  const { isEditing } = props.page.mode;
  const t = useTranslations();
  const dictionary = createFooterDictionary(t);
  props.fields.dictionary = dictionary;

  return <GlobalFooterNwn {...props} isPageEditing={isEditing} />;
};

export const BlueCompactVariant: React.FC<GlobalFooterProps> = (props) => {
  const { isEditing } = props.page.mode;
  const t = useTranslations();
  const dictionary = createFooterDictionary(t);
  props.fields.dictionary = dictionary;

  return <GlobalFooterNwn {...props} isPageEditing={isEditing} />;
};

export const StarterBlackCompactVariant: React.FC<GlobalFooterProps> = (
  props,
) => {
  const { isEditing } = props.page.mode;
  return <GlobalFooterBlackCompact {...props} isPageEditing={isEditing} />;
};

export const StarterBlackLargeVariant: React.FC<GlobalFooterProps> = (
  props,
) => {
  const { isEditing } = props.page.mode;
  return <GlobalFooterBlackLarge {...props} isPageEditing={isEditing} />;
};

export const StarterBlueCenteredVariant: React.FC<GlobalFooterProps> = (
  props,
) => {
  const { isEditing } = props.page.mode;
  return <GlobalFooterBlueCentered {...props} isPageEditing={isEditing} />;
};

export const StarterBlueCompactVariant: React.FC<GlobalFooterProps> = (
  props,
) => {
  const { isEditing } = props.page.mode;
  return <GlobalFooterBlueCompact {...props} isPageEditing={isEditing} />;
};

export const Nwn: React.FC<GlobalFooterProps> = (props) => {
  const { isEditing } = props.page.mode;
  const t = useTranslations();
  const dictionary = createFooterDictionary(t);
  props.fields.dictionary = dictionary;

  return <GlobalFooterNwn {...props} isPageEditing={isEditing} />;
};
