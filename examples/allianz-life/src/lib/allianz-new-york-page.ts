import type { Field } from '@sitecore-content-sdk/nextjs';

type RouteIdentityFields = Record<string, unknown> | undefined;

/** Exact native source identity; no browser-path or shared NY shell inference. */
const isNewYorkPage = (fields: RouteIdentityFields, bodyId: string): boolean => {
  const value = (name: string) => (fields?.[name] as Field<string> | undefined)?.value;
  const classes = value('sourceBodyClasses');
  return value('shellFamily') === 'legacy' && value('legacySharedKey') === 'new-york' &&
    value('sourceBodyId') === bodyId && typeof classes === 'string' &&
    classes.split(/\s+/).includes(bodyId) && classes.split(/\s+/).includes('new-york');
};

export const isNewYorkHomePage = (fields: RouteIdentityFields): boolean => isNewYorkPage(fields, 'page-new-york');
export const isNewYorkAnnuitiesPage = (fields: RouteIdentityFields): boolean => isNewYorkPage(fields, 'page-annuities');
