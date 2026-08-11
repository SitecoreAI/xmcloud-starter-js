import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Page } from '@sitecore-content-sdk/nextjs';
import { Default as NwnUtilityAlert } from '@/components/nwn-utility-alert/NwnUtilityAlert';
import type { NwnUtilityAlertProps } from '@/components/nwn-utility-alert/nwn-utility-alert.props';

jest.mock('lucide-react', () => {
  const Icon = (props: React.HTMLAttributes<HTMLSpanElement>) => (
    <span {...props} />
  );
  return {
    AlertTriangle: Icon,
    Info: Icon,
    Wrench: Icon,
  };
});

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({
    field,
    tag = 'span',
    className,
  }: {
    field?: { value?: string };
    tag?: string;
    className?: string;
  }) => React.createElement(tag, { className }, field?.value || ''),
  RichText: ({ field }: { field?: { value?: string } }) => (
    <div dangerouslySetInnerHTML={{ __html: field?.value || '' }} />
  ),
}));

jest.mock('@/components/button-component/ButtonComponent', () => ({
  EditableButton: ({
    buttonLink,
  }: {
    buttonLink: { value?: { href?: string; text?: string } };
  }) => <a href={buttonLink?.value?.href}>{buttonLink?.value?.text}</a>,
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
    eyebrow: { value: 'Emergency information' },
    title: { value: 'Smell natural gas?' },
    message: {
      value: '<p>Leave immediately and call from a safe location.</p>',
    },
    primaryLink: {
      value: {
        href: 'tel:8008823377',
        text: 'Call 800-882-3377',
        linktype: 'external',
      },
    },
    tone: { value: 'emergency' },
  },
  params: {},
  rendering: { componentName: 'NwnUtilityAlert' },
  page,
} as NwnUtilityAlertProps;

describe('NwnUtilityAlert', () => {
  it('uses assertive alert semantics and the emergency treatment', () => {
    render(<NwnUtilityAlert {...props} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('data-tone', 'emergency');
    expect(screen.getByText('Smell natural gas?')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Call 800-882-3377' }),
    ).toHaveAttribute('href', 'tel:8008823377');
  });

  it('vertically centers the icon and actions within the advisory', () => {
    render(<NwnUtilityAlert {...props} />);

    const shell = screen
      .getByRole('alert')
      .querySelector('.nwn-content-shell');

    expect(shell).toHaveClass('lg:items-center');
    expect(shell).not.toHaveClass('lg:items-start');
  });

  it('does not render an empty secondary link as a button', () => {
    render(
      <NwnUtilityAlert
        {...props}
        fields={{
          ...props.fields,
          secondaryLink: { value: {} },
        }}
      />,
    );

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(
      screen.getByRole('link', { name: 'Call 800-882-3377' }),
    ).toBeInTheDocument();
  });

  it('does not render an empty alert outside editing mode', () => {
    const { container } = render(
      <NwnUtilityAlert {...props} fields={{ tone: { value: 'service' } }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('hides an unattached datasource outside editing mode', () => {
    const { container } = render(
      <NwnUtilityAlert {...props} fields={undefined} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
