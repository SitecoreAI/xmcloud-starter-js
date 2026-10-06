'use client';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import type { AllianzFormProps } from './allianz-form.props';
import GenericForm from './GenericForm.props';
import ProductContactForm from './ProductContactForm.props';
import { resolveMigrationForm } from './migration-form-config.props';

/** Native placement remains editable; form definitions and local-only behavior live in code. */
export const Default = (props: AllianzFormProps) => {
  const { page } = useSitecore();
  const config = resolveMigrationForm(props, page);
  if (!config) return <div className="allianz-form-unconfigured" role="status">{page?.mode?.isEditing
    ? 'Select a known formId rendering parameter for this form placement.'
    : 'This form is temporarily unavailable.'}</div>;
  const Component = config.schemaKey === 'product-contact' || config.schemaKey === 'new-york-product-contact' ? ProductContactForm : GenericForm;
  // A route/placement change remounts the local flow and discards all previous sample values.
  return <Component key={config.id} config={config} params={props.params} />;
};
