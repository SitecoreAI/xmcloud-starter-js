import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Default as AnimatedSection } from '../../../components/animated-section/AnimatedSection.dev';

describe('AnimatedSection', () => {
  it('renders children', () => {
    render(
      <AnimatedSection>
        <div>Test Content</div>
      </AnimatedSection>,
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <AnimatedSection className="custom-class">
        <div>Test Content</div>
      </AnimatedSection>,
    );
    const container = screen.getByText('Test Content').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('keeps content visible in Page Builder before intersection', () => {
    render(
      <AnimatedSection isPageEditing>
        <div>Editable Content</div>
      </AnimatedSection>,
    );

    expect(screen.getByText('Editable Content').parentElement).toHaveStyle({
      opacity: '1',
      transform: 'translate(0, 0)',
      transition: 'none',
    });
  });
});
