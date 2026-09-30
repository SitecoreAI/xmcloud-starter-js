import type { ComponentProps } from 'lib/component-props';
import type { TextValue } from 'lib/allianz-fields';

export type AllianzSearchProps = ComponentProps & { fields?: { data?: { datasource?: {
  heading?: TextValue;
  body?: TextValue;
  placeholder?: TextValue;
  resultLabel?: TextValue;
  noResultsMessage?: TextValue;
} } } };
