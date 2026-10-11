import type { ComponentProps } from 'lib/component-props';

export type VenturesTeamProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: { id?: string } } };
};
