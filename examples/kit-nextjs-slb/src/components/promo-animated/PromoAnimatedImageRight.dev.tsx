'use client';

import { PromoAnimatedProps } from './promo-animated.props';
import { PromoAnimatedEditorial } from './promo-animated-editorial.util';

export const PromoAnimatedImageRight: React.FC<PromoAnimatedProps> = (
  props,
) => (
  <PromoAnimatedEditorial
    {...props}
    imageRight
    fallbackName="Promo Animated: Image Right"
  />
);
