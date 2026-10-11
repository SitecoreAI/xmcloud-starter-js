'use client';

import { Image, Link, RichText } from '@sitecore-content-sdk/nextjs';
import { useId, useState, type MouseEvent } from 'react';
import AccessibleDialog from 'components/content-sdk/AccessibleDialog';
import { DOCUMENT_LOGIN_COPY } from 'components/allianz-legacy-document-services/allianz-legacy-document-services.props';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { AllianzDatasource, AllianzProps } from 'lib/allianz-fields';

/** The source homepage login column is distinct from the legacy rail dropdown. */
const NewYorkHomeLogin = () => {
  const instance = useId().replace(/:/g, '');
  const [accountOpen, setAccountOpen] = useState(false);
  const titleId = `${instance}-ny-home-account-title`;
  const unavailableId = `${instance}-ny-home-unavailable`;
  const openAccount = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.focus();
    setAccountOpen(true);
  };
  const action = (label: string, className: string) => <button type="button" className={className} onClick={openAccount}>{label}</button>;
  return <div className="col-sm-3 login-col allianz-ny-home-login">
    <div className="cui-portletform clearfix" aria-describedby={unavailableId}>
      <span id={unavailableId} className="sr-only">Account access is unavailable. Do not enter personal information.</span>
      <div className="cui-portlet clearfix">
        <div className="form-group">
          <h2 className="visible-xs">Login / Register</h2>
          <label className="control-label hidden-sm hidden-xs" htmlFor={`${instance}-ny-home-username`}>{DOCUMENT_LOGIN_COPY.usernameLabel}</label>
          <input className="form-control" id={`${instance}-ny-home-username`} type="text" disabled autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder={DOCUMENT_LOGIN_COPY.usernamePlaceholder} aria-label={DOCUMENT_LOGIN_COPY.usernameLabel} />
        </div>
        <div className="form-group">
          <label className="control-label hidden-sm hidden-xs" htmlFor={`${instance}-ny-home-password`}>{DOCUMENT_LOGIN_COPY.passwordLabel}</label>
          <input className="form-control" id={`${instance}-ny-home-password`} type="password" disabled autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder={DOCUMENT_LOGIN_COPY.passwordPlaceholder} aria-label={DOCUMENT_LOGIN_COPY.passwordLabel} />
        </div>
        <div className="checkbox"><label className="checkbox" htmlFor={`${instance}-ny-home-remember`}>
          <input id={`${instance}-ny-home-remember`} type="checkbox" disabled />{DOCUMENT_LOGIN_COPY.rememberLabel}
        </label></div>
        {action(DOCUMENT_LOGIN_COPY.loginLabel, 'btn btn-green col-md-6 col-sm-12 col-xs-12')}
        <ul className="link-list">
          <li>{action(DOCUMENT_LOGIN_COPY.forgotUsernameLabel, 'allianz-text-button allianz-ny-home-link')}</li>
          <li>{action(DOCUMENT_LOGIN_COPY.forgotPasswordLabel, 'allianz-text-button allianz-ny-home-link')}</li>
        </ul>
        {action(DOCUMENT_LOGIN_COPY.registerLabel, 'btn btn-primary col-md-6 col-sm-12 col-xs-12 allianz-ny-home-register')}
      </div>
    </div>
    {accountOpen && <AccessibleDialog titleId={titleId} onClose={() => setAccountOpen(false)}>
      <h2 id={titleId}>Account access</h2>
      <p>Online account access is unavailable on this site. Please contact customer service for assistance.</p>
      <button type="button" className="btn btn-primary" onClick={() => setAccountOpen(false)}>Close</button>
    </AccessibleDialog>}
  </div>;
};

export default function NewYorkHomeHero({ data, params, isEditing }: {
  data: AllianzDatasource;
  params: AllianzProps['params'];
  isEditing: boolean;
}) {
  const desktop = data.desktopImage?.jsonValue;
  const mobile = data.mobileImage?.jsonValue;
  const overlay = shouldRenderTextField(data.heading?.jsonValue, isEditing) || shouldRenderTextField(data.body?.jsonValue, isEditing) || shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing);
  return <div className="row allianz-ny-home-hero" id={params.RenderingIdentifier}>
    <div className="col-sm-9 flexslider-col">
      <div className="notepad-container">
        <picture>
          {mobile?.value?.src && <source media="(max-width: 767px)" srcSet={mobile.value.src} />}
          {shouldRenderImageField(desktop, isEditing) && <Image editable={isEditing} field={desktop} alt={desktop?.value?.alt ?? ''} />}
        </picture>
        {overlay && <div className="notepad no-product-line right col-sm-5">
          <div className="notepad-content">
            {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <RichText editable={isEditing} tag="h1" field={data.heading?.jsonValue} />}
            {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
            {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} />}
          </div><div className="notepad-corner" aria-hidden="true" />
        </div>}
      </div>
      {isEditing && mobile && <div>Mobile image<Image editable field={mobile} /></div>}
    </div>
    <NewYorkHomeLogin />
  </div>;
}
