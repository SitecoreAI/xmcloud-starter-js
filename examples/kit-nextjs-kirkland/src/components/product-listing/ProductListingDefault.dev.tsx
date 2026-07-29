'use client';

import { Text } from '@sitecore-content-sdk/nextjs';
import React, { useState } from 'react';
import { NoDataFallback } from '@/utils/NoDataFallback';
import { Default as AnimatedSection } from '@/components/animated-section/AnimatedSection.dev';
import { ProductListingProps, ProductItemProps } from './product-listing.props';
import { ProductListingCard } from './ProductListingCard.dev';
import { useMatchMedia } from '@/hooks/use-match-media';
import { cn } from '@/lib/utils';

export const ProductListingDefault: React.FC<ProductListingProps> = (props) => {
  const isReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const { fields, isPageEditing } = props;

  const { title, viewAllLink, products } = fields?.data?.datasource ?? {};

  const sitecoreProducts = products?.targetItems || [];

  if (fields && sitecoreProducts.length === 0) {
    return null;
  }

  if (fields) {
    const getCardClasses = (productId: string) => {
      if (isReducedMotion) {
        // Reduced motion version - no scaling, blur, or complex animations
        return cn(
          'transition-opacity duration-150',
          activeCard !== null && activeCard !== productId ? 'opacity-60' : '',
          activeCard === productId ? 'z-10' : '',
        );
      } else {
        // Full motion version
        return cn(
          'transition-all duration-500 ease-in-out',
          activeCard !== null && activeCard !== productId
            ? 'opacity-50 scale-95 blur-[2px]'
            : '',
          activeCard === productId ? 'scale-105 z-10' : '',
        );
      }
    };

    const finalAllProducts = sitecoreProducts;

    // Limit to 3 products
    const visibleProducts = finalAllProducts.slice(0, 3);

    // Layout: Left gets 1, Right gets the rest (max 3 products total)
    const leftCount = 1;

    const leftColumnProducts = visibleProducts.slice(0, leftCount);
    const rightColumnProducts = visibleProducts.slice(leftCount);
    return (
      <section
        className={cn(
          '@container transform-gpu border-b-2 border-t-2 [.border-b-2+&]:border-t-0',
          {
            [props?.params?.styles]: props?.params?.styles,
          },
        )}
        aria-labelledby="product-listing-heading"
      >
        <div className="legal-content-shell @md:py-20 @xl:py-28 py-12">
          <div className="@md:grid-cols-2 @md:gap-[68px] grid grid-cols-1 gap-[40px]">
            <div className="@md:col-span-1">
              <AnimatedSection
                direction="down"
                duration={400}
                reducedMotion={isReducedMotion}
                className="mb-16"
                isPageEditing={isPageEditing}
              >
                <Text
                  tag="h2"
                  id="product-listing-heading"
                  className="legal-display-heading w-full max-w-[18ch] text-pretty text-[clamp(2rem,4.25vw,3.5rem)] font-light tracking-tight antialiased"
                  field={title?.jsonValue}
                />
              </AnimatedSection>

              {leftColumnProducts.length > 0 && (
                <div className="flex flex-col gap-[60px]">
                  {leftColumnProducts.map(
                    (product: ProductItemProps, index: number) => (
                      <AnimatedSection
                        key={JSON.stringify(`${product.productName}-${index}`)}
                        direction="up"
                        delay={index * 150}
                        duration={400}
                        reducedMotion={isReducedMotion}
                        isPageEditing={isPageEditing}
                      >
                        <div
                          className={getCardClasses(`left-${index}`)}
                          onMouseEnter={() => setActiveCard(`left-${index}`)}
                          onMouseLeave={() => setActiveCard(null)}
                          onFocus={() => setActiveCard(`left-${index}`)}
                          onBlur={() => setActiveCard(null)}
                        >
                          <ProductListingCard
                            product={product}
                            link={viewAllLink?.jsonValue}
                            prefersReducedMotion={isReducedMotion}
                            isPageEditing={isPageEditing}
                            page={props.page}
                          />
                        </div>
                      </AnimatedSection>
                    ),
                  )}
                </div>
              )}
            </div>

            {rightColumnProducts.length > 0 && (
              <div className="@md:col-span-1 @md:pt-16">
                <div className="flex flex-col gap-[60px]">
                  {rightColumnProducts.map(
                    (product: ProductItemProps, index: number) => (
                      <AnimatedSection
                        key={JSON.stringify(`${product.productName}-${index}`)}
                        direction="up"
                        delay={index * 150}
                        duration={400}
                        reducedMotion={isReducedMotion}
                        isPageEditing={isPageEditing}
                      >
                        <div
                          className={getCardClasses(`right-${index}`)}
                          onMouseEnter={() => setActiveCard(`right-${index}`)}
                          onMouseLeave={() => setActiveCard(null)}
                          onFocus={() => setActiveCard(`right-${index}`)}
                          onBlur={() => setActiveCard(null)}
                        >
                          <ProductListingCard
                            product={product}
                            link={viewAllLink?.jsonValue}
                            prefersReducedMotion={isReducedMotion}
                            isPageEditing={isPageEditing}
                            page={props.page}
                          />
                        </div>
                      </AnimatedSection>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return <NoDataFallback componentName="ProductListing" />;
};
