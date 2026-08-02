import { ContainerFullBleedParams } from '@/components/container/container-full-bleed/container-full-bleed.props';
import { PlaceholderComponentProps } from '@/lib/component-props';
import { PlaceholderProps } from '@/types/Placeholder.props';

/**
 * Props for the Kirkland article CTA authoring slot.
 *
 * The component has no datasource. It reuses the Full Bleed rendering parameters
 * while exposing a dedicated placeholder that Sitecore restricts to CTA Banner.
 */
export type ArticleCtaSlotProps = PlaceholderComponentProps &
  PlaceholderProps &
  ContainerFullBleedParams;
