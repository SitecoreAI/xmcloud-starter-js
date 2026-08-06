import type { OptionalComponentProps } from '@/lib/component-props';

export type SearchExperienceParams = {
  GridParameters?: string;
  RenderingIdentifier?: string;
  styles?: string;
  [key: string]: string | undefined;
};

export type SearchExperienceProps = OptionalComponentProps & {
  params: SearchExperienceParams;
};
