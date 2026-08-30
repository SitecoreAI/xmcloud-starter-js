import React from 'react';
import { render, screen } from '@testing-library/react';

jest.unmock('@/utils/NoDataFallback');

jest.mock('change-case', () => ({
  kebabCase: (value: string) => value.toLocaleLowerCase().replace(/\s+/g, '-'),
  capitalCase: (value: string) => value.toLocaleLowerCase(),
}));

const mockUseSitecore = jest.fn();
jest.mock('@sitecore-content-sdk/nextjs', () => ({
  useSitecore: () => mockUseSitecore(),
}));

import { NoDataFallback } from '@/utils/NoDataFallback';

describe('NoDataFallback', () => {
  it('keeps datasource instructions out of public output', () => {
    mockUseSitecore.mockReturnValue({
      page: { mode: { isEditing: false } },
    });

    const { container } = render(
      <NoDataFallback componentName="Rich Text Block" />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByText(/requires a datasource/i),
    ).not.toBeInTheDocument();
  });

  it('retains datasource guidance in the editor', () => {
    mockUseSitecore.mockReturnValue({
      page: { mode: { isEditing: true } },
    });

    render(<NoDataFallback componentName="Rich Text Block" />);

    expect(
      screen.getByText(/rich text block requires a datasource item assigned/i),
    ).toBeInTheDocument();
  });
});
