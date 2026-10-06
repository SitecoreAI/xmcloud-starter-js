import registry from './migration-forms.json';
import type { AllianzFormDatasource, AllianzFormProps } from './allianz-form.props';
import type { FormValues, SchemaKey } from './form-rules.props';

export interface MigrationFormConfig {
  id: string;
  schemaKey: SchemaKey;
  routes: string[];
  pageIds: string[];
  renderingIds: string[];
  datasourceIds: string[];
  sourceHidden: boolean;
  fieldNames?: string[];
  hiddenFields?: string[];
  initialValues?: FormValues;
  copy: Partial<Record<'heading' | 'body' | 'secondaryHeading' | 'secondaryBody' | 'submitLabel' | 'reviewHeading' | 'successMessage' | 'failureMessage', string>>;
}
export const MIGRATION_FORMS = registry as MigrationFormConfig[];
const id = (value: unknown) => typeof value === 'string' ? value.replace(/[{}-]/g, '').toLowerCase() : '';
const path = (value: unknown) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '';
  // Native context paths and exact public routes are valid even at /api/editing/render.
  const normalized = value.replace(/^\/sitecore\/content\/allianz\/allianz-life\/home(?=\/|$)/i, '').replace(/\/$/, '') || '/';
  return normalized.toLowerCase();
};

/** Exact manifest matching only. A page with two forms requires an instance or explicit formId. */
export function resolveMigrationForm(props: Partial<AllianzFormProps>, page?: AllianzFormProps['page']): MigrationFormConfig | undefined {
  const explicit = props.params?.formId;
  if (explicit !== undefined) return MIGRATION_FORMS.find((form) => form.id === explicit);
  const context = page?.layout?.sitecore;
  const pageId = id(context?.route?.itemId);
  const routePath = path(context?.context?.itemPath);
  const pageMatches = pageId ? MIGRATION_FORMS.filter((form) => form.pageIds.some((value) => id(value) === pageId)) : [];
  const pathMatches = routePath ? MIGRATION_FORMS.filter((form) => form.routes.some((value) => path(value) === routePath)) : [];
  if (pageMatches.length && pathMatches.length && !pageMatches.some((form) => pathMatches.includes(form))) return undefined;
  const routeMatches = pageMatches.length ? pageMatches : pathMatches;
  const uid = id(props.rendering?.uid);
  const datasource = id(props.rendering?.dataSource ?? props.fields?.data?.datasource?.id);
  const uidMatch = MIGRATION_FORMS.find((form) => form.renderingIds.some((value) => id(value) === uid));
  const dataMatch = MIGRATION_FORMS.find((form) => form.datasourceIds.some((value) => id(value) === datasource));
  if (uidMatch && dataMatch && uidMatch !== dataMatch) return undefined;
  const instance = uidMatch || dataMatch;
  if (instance) return routeMatches.length && !routeMatches.includes(instance) ? undefined : instance;
  if (routeMatches.length) return routeMatches.length === 1 ? routeMatches[0] : undefined;
  // Unknown or ambiguous placements must be configured explicitly. Legacy labels,
  // schema keys and collection contents never guess an unrelated form's identity.
  return undefined;
}

/** Static SDK-shaped display values have no authoring metadata and never read CMS form fields. */
export function migrationFormCopy(config: MigrationFormConfig): AllianzFormDatasource {
  return Object.fromEntries(Object.entries(config.copy).map(([name, value]) => [name, { jsonValue: { value } }]));
}
