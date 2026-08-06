import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Page } from '@sitecore-content-sdk/nextjs';
import { Default as NwnCardGrid } from '@/components/nwn-card-grid/NwnCardGrid';
import type { NwnCardGridProps } from '@/components/nwn-card-grid/nwn-card-grid.props';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  AppPlaceholder: ({ name }: { name: string }) => (
    <div data-testid="app-placeholder" data-name={name} />
  ),
  Text: ({
    field,
    tag = 'span',
    id,
  }: {
    field?: { value?: string };
    tag?: string;
    id?: string;
  }) => React.createElement(tag, { id }, field?.value || ''),
  RichText: ({ field }: { field?: { value?: string } }) => (
    <div>{field?.value || ''}</div>
  ),
}));

const page = {
  mode: {
    isEditing: false,
    isPreview: false,
    isNormal: true,
    name: 'normal',
    designLibrary: { isVariantGeneration: false },
    isDesignLibrary: false,
  },
  layout: { sitecore: { context: {}, route: null } },
  locale: 'en',
} as Page;

const props = {
  fields: {
    sectionTitle: { value: 'Customer resources' },
    intro: { value: 'Helpful ways to manage service and save energy.' },
  },
  params: { DynamicPlaceholderId: '7', columns: '3' },
  rendering: {
    componentName: 'NwnCardGrid',
    placeholders: { 'nwn-card-grid-7': [] },
  },
  componentMap: new Map(),
  page,
} as NwnCardGridProps;

describe('NwnCardGrid', () => {
  it('renders an accessible heading and exact dynamic placeholder key', () => {
    render(<NwnCardGrid {...props} />);

    const section = screen.getByRole('region', { name: 'Customer resources' });
    expect(section).toHaveAttribute('data-placeholder-key', 'nwn-card-grid-7');
    expect(screen.getByTestId('app-placeholder')).toHaveAttribute(
      'data-name',
      'nwn-card-grid-7',
    );
  });

  it('hides a completely empty grid outside editing mode', () => {
    const { container } = render(
      <NwnCardGrid
        {...props}
        fields={{}}
        rendering={{ componentName: 'NwnCardGrid', placeholders: {} }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
