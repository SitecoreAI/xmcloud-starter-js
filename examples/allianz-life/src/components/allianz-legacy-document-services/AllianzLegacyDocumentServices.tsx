'use client';
import { Link, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import AccessibleDialog from 'components/content-sdk/AccessibleDialog';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { safeLinkRenderProps } from 'lib/allianz-fields';
import {
  DOCUMENT_SERVICE_TEXT_FIELDS, documentServiceFields, documentSocialClass, toggleDocumentRailPanel,
  type DocumentRailPanel, type DocumentServicesProps, type DocumentServicesViewProps,
  type DocumentServiceTextField,
} from './allianz-legacy-document-services.props';
import './AllianzLegacyDocumentServices.css';

/** Isolated legacy rail: no form, credential state, production handlers or network requests. */
const DocumentServicesView = ({ fields, params, withLogin, isEditing }: DocumentServicesViewProps) => {
  const instanceId = useId();
  const root = useRef<HTMLUListElement>(null);
  const openingControl = useRef<HTMLButtonElement | null>(null);
  const [panel, setPanel] = useState<DocumentRailPanel>(null);
  const [notice, setNotice] = useState('');
  const raw = fields?.data?.datasource;
  const data = raw && documentServiceFields(raw, [...DOCUMENT_SERVICE_TEXT_FIELDS, 'contactLink']);
  const accountId = `${instanceId}-account`;
  const socialId = `${instanceId}-social`;
  const noticeId = `${instanceId}-notice`;
  const unavailableId = `${instanceId}-unavailable`;

  useEffect(() => {
    if (isEditing) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!notice && event.target instanceof Node && !root.current?.contains(event.target)) setPanel(null);
    };
    const dismissNavigation = () => { setPanel(null); setNotice(''); };
    document.addEventListener('pointerdown', dismissOutside);
    window.addEventListener('popstate', dismissNavigation);
    window.addEventListener('hashchange', dismissNavigation);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      window.removeEventListener('popstate', dismissNavigation);
      window.removeEventListener('hashchange', dismissNavigation);
    };
  }, [isEditing, notice]);

  if (!data) return <NoDataFallback componentName="AllianzLegacyDocumentServices" />;
  const visible = (name: DocumentServiceTextField) => shouldRenderTextField(data[name]?.jsonValue, isEditing);
  const text = (name: DocumentServiceTextField, tag?: string, className?: string) =>
    visible(name) ? <Text editable={isEditing} field={data[name]?.jsonValue} tag={tag} className={className} /> : null;
  const value = (name: DocumentServiceTextField) => data[name]?.jsonValue?.value || '';
  const toggle = (requested: Exclude<DocumentRailPanel, null>, control: HTMLButtonElement) => {
    if (isEditing) return;
    openingControl.current = control;
    setPanel((current) => toggleDocumentRailPanel(current, requested));
  };
  const openNotice = (event: MouseEvent<HTMLElement>, label: string) => {
    if (isEditing) { event.preventDefault(); return; }
    // Local dialog ownership is also marked on social links for the document listener.
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    setNotice(label || 'Online service');
  };
  const socialLinks = (data.children?.results || []).map((item) => documentServiceFields(item, ['heading', 'link']));
  const accountOpen = isEditing || panel === 'account';
  const socialOpen = isEditing || panel === 'social';
  const accountVisible = visible('accountLabel');
  const socialVisible = visible('socialLabel') || visible('mobileSocialLabel');
  const action = (name: DocumentServiceTextField, className?: string) => visible(name)
    ? <button type="button" className={className} onClick={(event) => openNotice(event, value(name))}>{text(name)}</button> : null;

  return <>
    <div className="right-column-flex-space" />
    <ul ref={root} id={params?.RenderingIdentifier}
      className={`nav navbar-nav right-nav allianz-legacy-document-services${isEditing ? ' allianz-legacy-document-services--editing' : ''}`}
      onBlur={(event) => {
        if (!isEditing && !notice && !event.currentTarget.contains(event.relatedTarget)) setPanel(null);
      }}
      onKeyDown={(event) => {
        if (!isEditing && panel && event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); setPanel(null); openingControl.current?.focus();
        }
      }}>
      {accountVisible && <li className={`dropdown login${!isEditing ? ' hidden-xs' : ''}${accountOpen ? ' open' : ''}`}>
        <button type="button" className="dropdown-toggle allianz-document-services-trigger"
          aria-expanded={accountOpen} aria-controls={accountId}
          onClick={(event) => toggle('account', event.currentTarget)}>
          {text('accountLabel')}{' '}<span className="caret" aria-hidden="true" />
        </button>
        <ul id={accountId} className="dropdown-menu dropdown-menu-right" hidden={!accountOpen}>
          <li><div className="dropdown-box">
            {withLogin && <div className="allianz-document-login cui-portletform clearfix" aria-describedby={unavailableId}>
              <span id={unavailableId} className="sr-only">Demonstration only. Account access is unavailable. Do not enter personal information.</span>
              <div className="cui-portlet clearfix">
                <div className="form-group">
                  <label className="control-label hidden-sm hidden-xs" htmlFor={`${instanceId}-username`}>{text('usernameLabel')}</label>
                  <input id={`${instanceId}-username`} className="form-control" type="text" disabled autoComplete="off"
                    placeholder={value('usernamePlaceholder')} aria-label={value('usernameLabel') || 'Unavailable account username'} />
                  {isEditing && text('usernamePlaceholder', 'span', 'allianz-document-placeholder-label')}
                </div>
                <div className="form-group">
                  <label className="control-label hidden-sm hidden-xs" htmlFor={`${instanceId}-password`}>{text('passwordLabel')}</label>
                  <input id={`${instanceId}-password`} className="form-control" type="password" disabled autoComplete="off"
                    placeholder={value('passwordPlaceholder')} aria-label={value('passwordLabel') || 'Unavailable account password'} />
                  {isEditing && text('passwordPlaceholder', 'span', 'allianz-document-placeholder-label')}
                </div>
                <div className="checkbox"><label className="checkbox" htmlFor={`${instanceId}-remember`}>
                  <input id={`${instanceId}-remember`} type="checkbox" disabled />{text('rememberLabel')}
                </label></div>
                {action('loginLabel', 'btn btn-green col-md-6 col-sm-12 col-xs-12')}
                <ul className="link-list">
                  {visible('forgotUsernameLabel') && <li>{action('forgotUsernameLabel', 'allianz-document-services-link')}</li>}
                  {visible('forgotPasswordLabel') && <li>{action('forgotPasswordLabel', 'allianz-document-services-link')}</li>}
                </ul>
                {action('registerLabel', 'btn btn-primary col-md-6 col-sm-12 col-xs-12 allianz-document-register')}
              </div>
            </div>}
          </div></li>
        </ul>
      </li>}
      {visible('contactLabel') && shouldRenderLinkField(data.contactLink?.jsonValue, isEditing) && <li className="contact-us">
        {isEditing ? <>{text('contactLabel')}<Link editable field={allianzLinkField(data.contactLink?.jsonValue, true)} /></>
          : <Link editable={false} {...safeLinkRenderProps(data.contactLink?.jsonValue)}>
            {text('contactLabel', 'span', 'btn-icon-mail')}
          </Link>}
      </li>}
      {socialVisible && <>
        {visible('mobileSocialLabel') && <li className="visible-xs social-media-xs">
          <button type="button" className="allianz-document-services-trigger" aria-expanded={socialOpen} aria-controls={socialId}
            onClick={(event) => toggle('social', event.currentTarget)}>{text('mobileSocialLabel')}</button>
        </li>}
        <li className={`dropdown social-media${socialOpen ? ' open' : ''}`}>
          {visible('socialLabel') && <button type="button" className="dropdown-toggle allianz-document-services-trigger hidden-xs"
            aria-expanded={socialOpen} aria-controls={socialId} onClick={(event) => toggle('social', event.currentTarget)}>
            {text('socialLabel')}{' '}<span className="caret" aria-hidden="true" />
          </button>}
          <ul id={socialId} className="dropdown-menu dropdown-menu-right" hidden={!socialOpen}>
            <li><div className="dropdown-box"><div className="dropdown-content"><div className="social">
              {text('socialHeading', 'h3')}{text('socialBody', 'p')}
              <ul className="social-follow">{socialLinks.map((item) => {
                const nativeLink = item.link?.jsonValue;
                if (!shouldRenderLinkField(nativeLink, isEditing) || (!isEditing && !item.heading?.jsonValue?.value && !nativeLink?.value?.text)) return null;
                const normalized = allianzLinkField(nativeLink, false);
                const rendered = safeLinkRenderProps(normalized);
                const opensLocalNotice = normalized.value.href?.endsWith('#service-unavailable');
                return <li key={item.id} className={documentSocialClass(nativeLink?.value?.href)}>
                  {isEditing ? <>
                    {shouldRenderTextField(item.heading?.jsonValue, true) && <Text editable field={item.heading?.jsonValue} />}
                    <Link editable field={allianzLinkField(nativeLink, true)} />
                  </> : <Link editable={false} {...rendered} data-allianz-local-service-dialog={opensLocalNotice ? 'true' : undefined} onClick={(event) => {
                    if (opensLocalNotice) openNotice(event, item.heading?.jsonValue?.value || nativeLink?.value?.text || 'Social');
                  }}>
                    {shouldRenderTextField(item.heading?.jsonValue, false)
                      ? <Text editable={false} field={item.heading?.jsonValue} /> : nativeLink?.value?.text}
                  </Link>}
                </li>;
              })}</ul>
            </div></div></div></li>
          </ul>
        </li>
      </>}
    </ul>
    {notice && <AccessibleDialog titleId={noticeId} onClose={() => setNotice('')}>
      <h2 id={noticeId}>{notice}</h2><p>This service is unavailable on this website. Please contact customer service for assistance.</p>
      <button type="button" className="btn btn-primary" onClick={() => setNotice('')}>Close</button>
    </AccessibleDialog>}
  </>;
};

const DocumentServices = (props: DocumentServicesProps & { withLogin: boolean }) => {
  const { page } = useSitecore();
  const pathname = usePathname();
  const isEditing = page?.mode?.isEditing ?? false;
  // Replacing a route or editing mode cannot retain an open panel from the prior page.
  return <DocumentServicesView key={`${pathname}:${isEditing}:${props.withLogin}`} {...props} isEditing={isEditing} />;
};

/** Four source routes contain a deliberately empty account dropdown. */
export const Default = (props: DocumentServicesProps) => <DocumentServices {...props} withLogin={false} />;
/** Five source prospectus routes contain a visual account widget with inert credential controls. */
export const LoginWidget = (props: DocumentServicesProps) => <DocumentServices {...props} withLogin />;
