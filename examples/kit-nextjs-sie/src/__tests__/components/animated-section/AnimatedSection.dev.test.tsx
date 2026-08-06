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

  it('keeps editing-mode content visible without animation', () => {
    render(
      <AnimatedSection isPageEditing direction="right">
        <div>Editing Content</div>
      </AnimatedSection>,
    );

    const container = screen.getByText('Editing Content').parentElement;
    expect(container).toHaveStyle({
      opacity: '1',
      transform: 'translate(0, 0)',
      transition: 'none',
    });
  });

  it('keeps reduced-motion content visible without animation', () => {
    render(
      <AnimatedSection reducedMotion direction="left">
        <div>Reduced Motion Content</div>
      </AnimatedSection>,
    );

    const container = screen.getByText('Reduced Motion Content').parentElement;
    expect(container).toHaveStyle({
      opacity: '1',
      transform: 'translate(0, 0)',
      transition: 'none',
    });
  });
});
