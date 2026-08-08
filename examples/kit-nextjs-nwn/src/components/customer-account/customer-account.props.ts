import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';

import type { OptionalComponentProps } from '@/lib/component-props';

export interface CustomerAccountFields {
  title?: Field<string>;
  description?: Field<string>;
  submitLabel?: Field<string>;
  successTitle?: Field<string>;
  successMessage?: Field<string>;
  secondaryPrompt?: Field<string>;
  secondaryLink?: LinkField;
}

export interface CustomerAccountProps extends OptionalComponentProps {
  fields?: CustomerAccountFields;
}
