import type { ComponentProps } from 'lib/component-props';
import type { TextValue } from 'lib/allianz-fields';

type NativeFormFields = { fieldCollection?: { name?: string; jsonValue?: unknown }[] | null };

export interface AllianzFormField extends NativeFormFields {
  id: string;
  name?: TextValue;
  label?: TextValue;
  inputType?: TextValue;
  required?: { jsonValue?: { value?: string | boolean } };
  validationMessage?: TextValue;
  options?: TextValue;
  maxLength?: TextValue;
  pattern?: TextValue;
  placeholder?: TextValue;
  sourceName?: TextValue;
  minValue?: TextValue;
  maxValue?: TextValue;
  initialValue?: TextValue;
  footnote?: TextValue;
}
export interface AllianzFormDatasource extends NativeFormFields {
  id?: string;
  heading?: TextValue;
  body?: TextValue;
  schemaKey?: TextValue;
  submitLabel?: TextValue;
  successMessage?: TextValue;
  failureMessage?: TextValue;
  reviewHeading?: TextValue;
  secondaryHeading?: TextValue;
  secondaryBody?: TextValue;
  children?: {
    total?: number;
    pageInfo?: { hasNext: boolean; endCursor?: string | null };
    results: AllianzFormField[];
  };
}
export type AllianzFormProps = ComponentProps & {
  fields?: { data?: { datasource?: AllianzFormDatasource } };
};

