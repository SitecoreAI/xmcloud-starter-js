import type { ComponentProps } from 'lib/component-props';
import type { TextValue } from 'lib/allianz-fields';
export type AllianzRateTableProps = ComponentProps & { fields?: { data?: { datasource?: {
  heading?: TextValue;
  body?: TextValue;
  tableBody?: TextValue;
  captionText?: TextValue;
  emptyState?: TextValue;
} } } };
