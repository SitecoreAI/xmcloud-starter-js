import { Default as ArticleCtaSlot } from '@/components/article-cta-slot/ArticleCtaSlot';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  emptyArticleCtaSlotProps,
  emptyEditingArticleCtaSlotProps,
  populatedArticleCtaSlotProps,
} from './article-cta-slot.mock.props';

jest.mock('@/components/flex/Flex.dev', () => ({
  Flex: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="flex-container" className={className}>
      {children}
    </div>
  ),
  FlexItem: ({
    children,
    basis,
  }: {
    children: React.ReactNode;
    basis?: string;
  }) => (
    <div data-testid="flex-item" data-basis={basis}>
      {children}
    </div>
  ),
}));

describe('ArticleCtaSlot', () => {
  it('renders its dedicated dynamic placeholder when populated', () => {
    render(<ArticleCtaSlot {...populatedArticleCtaSlotProps} />);

    expect(screen.getByTestId('sitecore-placeholder')).toHaveAttribute(
      'data-placeholder-name',
      'kirkland-article-cta-main',
    );
    expect(screen.getByTestId('flex-item')).toHaveAttribute(
      'data-basis',
      'full',
    );
  });

  it('does not render an empty slot outside editing mode', () => {
    const { container } = render(
      <ArticleCtaSlot {...emptyArticleCtaSlotProps} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when Sitecore supplies an empty placeholder array', () => {
    const propsWithLiveEmptyPlaceholder = {
      ...emptyArticleCtaSlotProps,
      rendering: {
        ...emptyArticleCtaSlotProps.rendering,
        placeholders: {
          'kirkland-article-cta-empty': [],
        },
      },
    };

    const { container } = render(
      <ArticleCtaSlot {...propsWithLiveEmptyPlaceholder} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders an empty drop zone in editing mode', () => {
    const { container } = render(
      <ArticleCtaSlot {...emptyEditingArticleCtaSlotProps} />,
    );

    expect(screen.getByTestId('sitecore-placeholder')).toHaveAttribute(
      'data-placeholder-name',
      'kirkland-article-cta-empty',
    );
    expect(
      container.querySelector('[data-component="ArticleCtaSlot"]'),
    ).toHaveClass('min-h-20');
  });

  it('applies authored styles', () => {
    const { container } = render(
      <ArticleCtaSlot {...populatedArticleCtaSlotProps} />,
    );

    expect(
      container.querySelector('[data-component="ArticleCtaSlot"]'),
    ).toHaveClass('custom-article-cta-slot');
  });

  it('preserves the established secondary CTA treatment by default', () => {
    const { container } = render(
      <ArticleCtaSlot {...populatedArticleCtaSlotProps} />,
    );

    expect(
      container.querySelector('[data-component="ArticleCtaSlot"]'),
    ).toHaveClass('bg-secondary', 'py-4', 'sm:py-16');
  });
});
