import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Page } from '@sitecore-content-sdk/nextjs';
import { Default as NwnAlertSlot } from '@/components/nwn-alert-slot/NwnAlertSlot';
import type { NwnAlertSlotProps } from '@/components/nwn-alert-slot/nwn-alert-slot.props';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  AppPlaceholder: ({
    name,
    rendering,
    renderEmpty,
  }: {
    name: string;
    rendering: {
      uid?: string;
      placeholders?: Record<string, unknown[]>;
    };
    renderEmpty?: unknown;
  }) => (
    <div
      data-testid="app-placeholder"
      data-name={name}
      data-rendering-uid={rendering.uid}
      data-placeholder-registered={String(
        Object.prototype.hasOwnProperty.call(
          rendering.placeholders ?? {},
          name,
        ),
      )}
      data-placeholder-size={String(
        rendering.placeholders?.[name]?.length ?? 0,
      )}
      data-custom-render-empty={String(Boolean(renderEmpty))}
    />
  ),
}));

const renderingUid = '11111111-1111-1111-1111-111111111111';

const createPage = (isEditing: boolean): Page =>
  ({
    mode: {
      isEditing,
      isPreview: false,
      isNormal: !isEditing,
      name: isEditing ? 'edit' : 'normal',
      designLibrary: { isVariantGeneration: false },
      isDesignLibrary: false,
    },
    layout: { sitecore: { context: {}, route: null } },
    locale: 'en',
  }) as Page;

const createProps = (
  isEditing: boolean,
  placeholders: NwnAlertSlotProps['rendering']['placeholders'] = {},
): NwnAlertSlotProps => ({
  rendering: {
    uid: renderingUid,
    componentName: 'NwnAlertSlot',
    placeholders,
  },
  params: {},
  page: createPage(isEditing),
  componentMap: new Map(),
});

describe('NwnAlertSlot', () => {
  it('renders nothing publicly when the governed slot is empty', () => {
    const { container } = render(<NwnAlertSlot {...createProps(false)} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('registers the empty child chrome without visible helper copy while editing', () => {
    render(<NwnAlertSlot {...createProps(true)} />);

    expect(
      screen.queryByText('Governed home alert slot — NWN Utility Alert only'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('app-placeholder')).toHaveAttribute(
      'data-name',
      'nwn-home-alert',
    );
    expect(screen.getByTestId('app-placeholder')).toHaveAttribute(
      'data-rendering-uid',
      renderingUid,
    );
    expect(screen.getByTestId('app-placeholder')).toHaveAttribute(
      'data-placeholder-registered',
      'true',
    );
    expect(screen.getByTestId('app-placeholder')).toHaveAttribute(
      'data-custom-render-empty',
      'false',
    );
  });

  it('renders a populated slot publicly', () => {
    render(
      <NwnAlertSlot
        {...createProps(false, {
          'nwn-home-alert': [
            {
              uid: '22222222-2222-2222-2222-222222222222',
              componentName: 'NwnUtilityAlert',
            },
          ],
        })}
      />,
    );

    expect(
      screen.queryByText('Governed home alert slot — NWN Utility Alert only'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('app-placeholder')).toHaveAttribute(
      'data-placeholder-size',
      '1',
    );
  });
});
