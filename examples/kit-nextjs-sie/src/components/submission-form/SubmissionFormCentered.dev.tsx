'use client';

import { SubmissionFormDefault } from './SubmissionFormDefault.dev';
import type { SubmissionFormProps } from './submission-form.props';

/**
 * The centered rendering variant uses the same focused contact experience so
 * selecting a legacy variant in Page Builder cannot expose the former form.
 */
export const SubmissionFormCentered: React.FC<SubmissionFormProps> = (
  props,
) => (
  <SubmissionFormDefault
    {...props}
    params={{
      ...props.params,
      styles: props.params?.styles || 'position-center',
    }}
  />
);
