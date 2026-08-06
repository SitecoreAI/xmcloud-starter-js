import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SubmissionFormCentered } from '@/components/submission-form/SubmissionFormCentered.dev';

import {
  mockSubmissionFormPropsCentered,
  mockSubmissionFormPropsContact,
} from './submission-form.mock.props';

jest.mock('@/components/submission-form/SubmissionFormDefault.dev', () => ({
  SubmissionFormDefault: ({
    fields,
    params,
  }: {
    fields: { title: { value: string } };
    params: { styles?: string };
  }) => (
    <div data-testid="contact-form" data-styles={params.styles}>
      {fields.title.value}
    </div>
  ),
}));

describe('SubmissionFormCentered', () => {
  it('uses the contact experience with a safe centered default', () => {
    render(<SubmissionFormCentered {...mockSubmissionFormPropsCentered} />);

    expect(screen.getByTestId('contact-form')).toHaveAttribute(
      'data-styles',
      'position-center',
    );
  });

  it('preserves an explicitly selected position style', () => {
    render(<SubmissionFormCentered {...mockSubmissionFormPropsContact} />);

    expect(screen.getByTestId('contact-form')).toHaveAttribute(
      'data-styles',
      'position-right',
    );
  });
});
