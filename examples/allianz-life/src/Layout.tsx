import React, { JSX } from 'react';
import { AppPlaceholder, DesignLibraryApp, type Field, type ImageField, type Page } from '@sitecore-content-sdk/nextjs';
import Scripts from 'src/Scripts';
import SitecoreStyles from 'components/content-sdk/SitecoreStyles';
import ConsentControls from 'components/content-sdk/ConsentControls';
import ServiceUnavailable from 'components/content-sdk/ServiceUnavailable';
import componentMap from '.sitecore/component-map';
import sourceBodyClasses from 'src/content/source-body-classes.json';
import { collectionsComplete } from 'lib/collection-completeness';

interface LayoutProps { page: Page }
export interface RouteFields {
  [key: string]: unknown;
  Title?: Field;
  metadataTitle?: Field;
  metadataKeywords?: Field;
  pageTitle?: Field;
  metadataDescription?: Field;
  metaDescription?: Field;
  pageSummary?: Field;
  ogTitle?: Field;
  ogDescription?: Field;
  ogImage?: ImageField;
  thumbnailImage?: ImageField;
}
const Layout = ({ page }: LayoutProps): JSX.Element => {
  const { layout, mode } = page;
  const { route } = layout.sitecore;
  if (!collectionsComplete(layout, process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE === 'connected')) {
    return <div className="allianz-missing-data" role="alert">Some page content is temporarily unavailable. Please try again later.</div>;
  }
  const fields = route?.fields as RouteFields | undefined;
  const scalar = (key: string) => (fields?.[key] as Field<string> | undefined)?.value || '';
  const legacy = scalar('shellFamily') === 'legacy' || route?.placeholders['headless-header']?.some((item) => 'componentName' in item && item.componentName === 'AllianzLegacyHeader');
  const ny = scalar('legacySharedKey') === 'new-york';
  const sourceBodyId = /^[A-Za-z][\w$-]*$/.test(scalar('sourceBodyId')) ? scalar('sourceBodyId') : undefined;
  const classes = scalar('sourceBodyClasses').split(/\s+/).filter((name) => sourceBodyClasses.includes(name)).join(' ');
  const placeholder = (name: string) => route && <AppPlaceholder page={page} componentMap={componentMap} name={name} rendering={route} />;
  const header = <div id="header">{placeholder('headless-header')}</div>;
  const footer = <div id="footer">{placeholder('headless-footer')}</div>;
  const sidebar = !!route?.placeholders['headless-sidebar']?.length;
  return <>
    <Scripts />
    {mode.isEditing && <SitecoreStyles layoutData={layout} />}
    <div id={sourceBodyId} className={`${mode.isEditing ? 'editing-mode' : 'prod-mode'} ${legacy ? `allianz-legacy ${ny ? 'new-york' : ''}` : 'allianz-modern'} ${classes}`}>
      {mode.isDesignLibrary ? route && <DesignLibraryApp page={page} rendering={route} componentMap={componentMap} loadServerImportMap={() => import('.sitecore/import-map.server')} /> : <>
        {header}
        {legacy ? <main id="main" className="container-fluid azl-contents"><div className="row">
          {sidebar && <aside className="col-md-2 col-sm-3 left-column">{placeholder('headless-sidebar')}</aside>}
          <div id="content-body" className={sidebar ? 'col-md-8 col-sm-9 center-column' : 'col-md-10 col-md-offset-1 center-column'}>{placeholder('headless-main')}</div>
        </div></main> : <main id="main"><div id="content">{placeholder('headless-main')}</div></main>}
        {footer}
        <ConsentControls />
        <ServiceUnavailable />
      </>}
    </div>
  </>;
};
export default Layout;
