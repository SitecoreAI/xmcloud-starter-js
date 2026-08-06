import type {
  Field,
  LinkField,
  RichTextField,
} from '@sitecore-content-sdk/nextjs';
import type { OptionalComponentProps } from '@/lib/component-props';

export type NwnUtilityAlertTone = 'information' | 'service' | 'emergency';

export interface NwnUtilityAlertFields {
  eyebrow?: Field<string>;
  title?: Field<string>;
  message?: RichTextField;
  primaryLink?: LinkField;
  secondaryLink?: LinkField;
  tone?: Field<string>;
}

export interface NwnUtilityAlertProps extends OptionalComponentProps {
  fields?: NwnUtilityAlertFields;
}
