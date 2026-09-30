import type { ComponentProps } from 'lib/component-props';
import type { TextValue } from 'lib/allianz-fields';
import type { AllianzFormField } from 'components/allianz-form/allianz-form.props';

export interface CalculatorInput extends AllianzFormField {
  minValue?: TextValue;
  maxValue?: TextValue;
  initialValue?: TextValue;
  footnote?: TextValue;
}
export type AllianzCalculatorProps = ComponentProps & { fields?: { data?: { datasource?: {
  heading?: TextValue;
  body?: TextValue;
  schemaKey?: TextValue;
  sampleResult?: TextValue;
  disclaimer?: TextValue;
  submitLabel?: TextValue;
  resultLabel?: TextValue;
  initialResult?: TextValue;
  children?: { results: CalculatorInput[] };
} } } };

/** The only captured calculator with a server-rendered input UI. Financial formula is unverified. */
export const RETIREMENT_INPUTS: CalculatorInput[] = [
  { id: 'principal', name: { jsonValue: { value: 'principal' } }, label: { jsonValue: { value: 'Enter the amount you like to withdraw each month' } }, initialValue: { jsonValue: { value: '$0.00' } }, footnote: { jsonValue: { value: '1' } }, minValue: { jsonValue: { value: '0' } } },
  { id: 'interest', name: { jsonValue: { value: 'interest' } }, label: { jsonValue: { value: 'Enter the assumed average annual rate of return' } }, initialValue: { jsonValue: { value: '0.00%' } }, footnote: { jsonValue: { value: '2' } } },
  { id: 'payments', name: { jsonValue: { value: 'payments' } }, label: { jsonValue: { value: 'Enter the number of years you would like to make the monthly withdrawals' } }, initialValue: { jsonValue: { value: '' } }, minValue: { jsonValue: { value: '1' } } },
];

/** Input checks establish a usable local flow; they do not calculate or imply source results. */
export function validateCalculator(inputs: CalculatorInput[], values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const input of inputs) {
    const name = input.name?.jsonValue?.value || input.id;
    const raw = (values[name] || '').trim();
    const numeric = raw.replace(/[$,%\s]/g, '');
    if (!numeric || !/^-?\d+(?:\.\d+)?$/.test(numeric)) { errors[name] = 'Please enter a valid number.'; continue; }
    const value = Number(numeric);
    const min = input.minValue?.jsonValue?.value;
    const max = input.maxValue?.jsonValue?.value;
    if (min && value < Number(min)) errors[name] = `Enter a number of at least ${min}.`;
    else if (max && value > Number(max)) errors[name] = `Enter a number no greater than ${max}.`;
    else if (name === 'payments' && !Number.isInteger(value)) errors[name] = 'Please enter a whole number of years.';
  }
  return errors;
}
