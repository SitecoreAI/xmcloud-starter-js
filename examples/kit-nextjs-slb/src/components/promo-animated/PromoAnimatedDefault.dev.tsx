'use client';

import { PromoAnimatedProps } from './promo-animated.props';
import { PromoAnimatedEditorial } from './promo-animated-editorial.util';

export const PromoAnimatedDefault: React.FC<PromoAnimatedProps> = (props) => (
  <PromoAnimatedEditorial {...props} fallbackName="Promo Animated" />
);
