'use client';

import { useId, useState } from 'react';
import AccessibleDialog from 'components/content-sdk/AccessibleDialog';
import type { AllianzFormProps } from './allianz-form.props';
import { formDefinitions } from './form-rules.props';
import type { MigrationFormConfig } from './migration-form-config.props';
import './ContactUsForm.css';

const definitions = formDefinitions('contact-us');

/** Disabled source presentation. Only the local account-access dialog is interactive. */
export default function ContactUsForm({ config, params = {} }: {
  config: MigrationFormConfig;
  params?: AllianzFormProps['params'];
}) {
  const instance = useId().replace(/:/g, '');
  const [accountOpen, setAccountOpen] = useState(false);
  const dialogTitle = `${instance}-contact-account-title`;
  const loginCopy = (text: string, word: 'log in' | 'login') => {
    const position = text.indexOf(word);
    if (position < 0) return text;
    return <>{text.slice(0, position)}<button type="button" className="a-azLink allianz-text-button" onClick={() => setAccountOpen(true)}>{word}</button>{text.slice(position + word.length)}</>;
  };

  return <section className="allianz-contact-us" data-form-id={config.id} id={params.RenderingIdentifier} aria-label="Contact Allianz">
    <p className="allianz-contact-us-notice">{loginCopy(config.copy.body ?? '', 'log in')}</p>
    {definitions.map((field) => {
      const id = `${instance}-contact-${field.name}`;
      if (field.inputType === 'radio') return <fieldset key={field.name} className="allianz-contact-us-reasons">
        <legend>{field.label}</legend>
        {field.options.map((option, index) => <div className="allianz-contact-us-reason" key={option.value}>
          <input id={`${id}-${index}`} type="radio" disabled aria-labelledby={`${id}-${index}-label`} />
          <span id={`${id}-${index}-label`}>{loginCopy(option.label, 'login')}</span>
        </div>)}
      </fieldset>;
      return <div className="m-form-group allianz-contact-us-field" key={field.name}>
        <label className="a-input__label" htmlFor={id}>{field.label}</label>
        {field.inputType === 'textarea'
          ? <textarea className="a-input" id={id} rows={5} disabled required={field.required} autoComplete="off" />
          : <input className="a-input" id={id} type={field.inputType} disabled required={field.required} autoComplete="off" aria-describedby={field.helperText ? `${id}-help` : undefined} />}
        {field.helperText && <p id={`${id}-help`} className="allianz-contact-us-help">{field.helperText}</p>}
      </div>;
    })}
    <button type="button" className="m-axlButton m-axlButton--direct" disabled>{config.copy.submitLabel}</button>
    {accountOpen && <AccessibleDialog titleId={dialogTitle} onClose={() => setAccountOpen(false)}>
      <h2 id={dialogTitle}>Account access</h2>
      <p>Online account access is unavailable on this site. Please contact customer service for assistance.</p>
      <button type="button" className="m-axlButton m-axlButton--direct" onClick={() => setAccountOpen(false)}>Close</button>
    </AccessibleDialog>}
  </section>;
}
