import type { ComponentProps } from 'lib/component-props';
import type { TextValue } from 'lib/allianz-fields';

export interface AllianzFormField {
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
}
export type AllianzFormProps = ComponentProps & {
  fields?: { data?: { datasource?: {
    heading?: TextValue;
    body?: TextValue;
    schemaKey?: TextValue;
    submitLabel?: TextValue;
    successMessage?: TextValue;
    failureMessage?: TextValue;
    reviewHeading?: TextValue;
    secondaryHeading?: TextValue;
    secondaryBody?: TextValue;
    children?: { results: AllianzFormField[] };
  } } };
};
