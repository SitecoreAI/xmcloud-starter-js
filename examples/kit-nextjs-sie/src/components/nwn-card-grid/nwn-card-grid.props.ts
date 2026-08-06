import type { Field, RichTextField } from '@sitecore-content-sdk/nextjs';
import type { PlaceholderComponentProps } from '@/lib/component-props';

export interface NwnCardGridFields {
  sectionTitle?: Field<string>;
  intro?: RichTextField;
}

export interface NwnCardGridParams {
  [key: string]: string | undefined;
  RenderingIdentifier?: string;
  styles?: string;
  DynamicPlaceholderId?: string;
  columns?: '2' | '3' | '4';
}

export interface NwnCardGridProps
  extends Omit<PlaceholderComponentProps, 'params'> {
  params: NwnCardGridParams;
  fields?: NwnCardGridFields;
}
