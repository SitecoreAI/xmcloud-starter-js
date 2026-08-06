import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ImageField } from '@sitecore-content-sdk/nextjs';

import { PageHeaderNwnEditorial } from '@/components/page-header/PageHeaderNwnEditorial.dev';
import { mockPageHeaderProps } from './page-header.mock.props';

const emptyEditingImageField = {
  value: {},
  metadata: { fieldName: 'imageRequired' },
} as unknown as ImageField;

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({
    field,
    tag = 'span',
    ...attributes
  }: {
    field?: { value?: string };
    tag?: React.ElementType;
  }) => React.createElement(tag, attributes, field?.value || ''),
  RichText: ({ field, ...attributes }: { field?: { value?: string } }) => (
    <div
      {...attributes}
      dangerouslySetInnerHTML={{ __html: field?.value || '' }}
    />
  ),
}));

jest.mock('@/components/button-component/ButtonComponent', () => ({
  EditableButton: ({
    buttonLink,
  }: {
    buttonLink?: { value?: { href?: string; text?: string } };
  }) => <a href={buttonLink?.value?.href}>{buttonLink?.value?.text}</a>,
}));

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  Default: ({
    image,
  }: {
    image?: { value?: { src?: string; alt?: string }; metadata?: unknown };
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="page-header-image-field"
      data-field-metadata={String(Boolean(image?.metadata))}
      src={image?.value?.src || undefined}
      alt={image?.value?.alt || ''}
    />
  ),
}));

jest.mock('@/utils/NoDataFallback', () => ({
  NoDataFallback: ({ componentName }: { componentName: string }) => (
    <div data-testid="no-data-fallback">{componentName}</div>
  ),
}));

describe('PageHeaderNwnEditorial', () => {
  it('renders an authored DAM image when assigned', () => {
    render(
      <PageHeaderNwnEditorial
        {...mockPageHeaderProps}
        isPageEditing={false}
        fields={{
          ...mockPageHeaderProps.fields,
          data: {
            ...mockPageHeaderProps.fields.data,
            datasource: {
              ...mockPageHeaderProps.fields.data.datasource,
              imageRequired: {
                jsonValue: {
                  value: {
                    src: 'https://dam.example/page-header.jpg',
                    alt: 'NW Natural customer service representative',
                  },
                },
              },
            },
          },
        }}
      />,
    );

    expect(
      screen.getByRole('img', {
        name: 'NW Natural customer service representative',
      }),
    ).toHaveAttribute('src', 'https://dam.example/page-header.jpg');
  });

  it('omits the image region for visitors when the field is empty', () => {
    const { container } = render(
      <PageHeaderNwnEditorial
        {...mockPageHeaderProps}
        isPageEditing={false}
        fields={{
          ...mockPageHeaderProps.fields,
          data: {
            ...mockPageHeaderProps.fields.data,
            datasource: {
              ...mockPageHeaderProps.fields.data.datasource,
              imageRequired: { jsonValue: { value: {} } },
            },
          },
        }}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('[style]')).not.toBeInTheDocument();
  });

  it('preserves the empty image field in Page Builder', () => {
    render(
      <PageHeaderNwnEditorial
        {...mockPageHeaderProps}
        isPageEditing
        fields={{
          ...mockPageHeaderProps.fields,
          data: {
            ...mockPageHeaderProps.fields.data,
            datasource: {
              ...mockPageHeaderProps.fields.data.datasource,
              imageRequired: {
                jsonValue: emptyEditingImageField,
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByTestId('page-header-image-field')).toHaveAttribute(
      'data-field-metadata',
      'true',
    );
    expect(screen.getByTestId('page-header-image-field')).not.toHaveAttribute(
      'src',
    );
  });
});
