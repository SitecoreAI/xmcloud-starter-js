// Below are built-in components that are available in the app, it's recommended to keep them as is

import { BYOCServerWrapper, NextjsContentSdkComponent, FEaaSServerWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

// end of built-in components
import * as PartialDesignDynamicPlaceholder from 'src/components/partial-design-dynamic-placeholder/PartialDesignDynamicPlaceholder';
import * as AllianzVideo from 'src/components/allianz-video/AllianzVideo';
import * as AllianzTimeline from 'src/components/allianz-timeline/AllianzTimeline';
import * as AllianzSearch from 'src/components/allianz-search/AllianzSearch';
import * as AllianzRichText from 'src/components/allianz-rich-text/AllianzRichText';
import * as AllianzRateTable from 'src/components/allianz-rate-table/AllianzRateTable';
import * as AllianzRateSnapshot from 'src/components/allianz-rate-snapshot/AllianzRateSnapshot';
import * as AllianzLegacySidebar from 'src/components/allianz-legacy-sidebar/AllianzLegacySidebar';
import * as AllianzLegacyRichText from 'src/components/allianz-legacy-rich-text/AllianzLegacyRichText';
import * as AllianzLegacyPageHeader from 'src/components/allianz-legacy-page-header/AllianzLegacyPageHeader';
import * as AllianzLegacyLinkList from 'src/components/allianz-legacy-link-list/AllianzLegacyLinkList';
import * as AllianzLegacyHero from 'src/components/allianz-legacy-hero/AllianzLegacyHero';
import * as AllianzLegacyHeader from 'src/components/allianz-legacy-header/AllianzLegacyHeader';
import * as AllianzLegacyFooter from 'src/components/allianz-legacy-footer/AllianzLegacyFooter';
import * as AllianzLegacyCardGrid from 'src/components/allianz-legacy-card-grid/AllianzLegacyCardGrid';
import * as AllianzLegacyBreadcrumbs from 'src/components/allianz-legacy-breadcrumbs/AllianzLegacyBreadcrumbs';
import * as AllianzLegacyAccordion from 'src/components/allianz-legacy-accordion/AllianzLegacyAccordion';
import * as AllianzIndexDefinitions from 'src/components/allianz-index-definitions/AllianzIndexDefinitions';
import * as AllianzHero from 'src/components/allianz-hero/AllianzHero';
import * as AllianzHeader from 'src/components/allianz-header/AllianzHeader';
import * as AllianzForm from 'src/components/allianz-form/AllianzForm';
import * as AllianzFooter from 'src/components/allianz-footer/AllianzFooter';
import * as AllianzDocumentList from 'src/components/allianz-document-list/AllianzDocumentList';
import * as AllianzCTA from 'src/components/allianz-cta/AllianzCTA';
import * as AllianzCardGrid from 'src/components/allianz-card-grid/AllianzCardGrid';
import * as AllianzCalculator from 'src/components/allianz-calculator/AllianzCalculator';
import * as AllianzBreadcrumbs from 'src/components/allianz-breadcrumbs/AllianzBreadcrumbs';
import * as AllianzArticle from 'src/components/allianz-article/AllianzArticle';
import * as AllianzAccordion from 'src/components/allianz-accordion/AllianzAccordion';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCServerWrapper],
  ['FEaaSWrapper', FEaaSServerWrapper],
  ['Form', { ...Form, componentType: 'client' }],
  ['PartialDesignDynamicPlaceholder', { ...PartialDesignDynamicPlaceholder }],
  ['AllianzVideo', { ...AllianzVideo, componentType: 'client' }],
  ['AllianzTimeline', { ...AllianzTimeline }],
  ['AllianzSearch', { ...AllianzSearch, componentType: 'client' }],
  ['AllianzRichText', { ...AllianzRichText, componentType: 'client' }],
  ['AllianzRateTable', { ...AllianzRateTable }],
  ['AllianzRateSnapshot', { ...AllianzRateSnapshot }],
  ['AllianzLegacySidebar', { ...AllianzLegacySidebar, componentType: 'client' }],
  ['AllianzLegacyRichText', { ...AllianzLegacyRichText }],
  ['AllianzLegacyPageHeader', { ...AllianzLegacyPageHeader }],
  ['AllianzLegacyLinkList', { ...AllianzLegacyLinkList, componentType: 'client' }],
  ['AllianzLegacyHero', { ...AllianzLegacyHero }],
  ['AllianzLegacyHeader', { ...AllianzLegacyHeader, componentType: 'client' }],
  ['AllianzLegacyFooter', { ...AllianzLegacyFooter, componentType: 'client' }],
  ['AllianzLegacyCardGrid', { ...AllianzLegacyCardGrid }],
  ['AllianzLegacyBreadcrumbs', { ...AllianzLegacyBreadcrumbs }],
  ['AllianzLegacyAccordion', { ...AllianzLegacyAccordion, componentType: 'client' }],
  ['AllianzIndexDefinitions', { ...AllianzIndexDefinitions }],
  ['AllianzHero', { ...AllianzHero, componentType: 'client' }],
  ['AllianzHeader', { ...AllianzHeader, componentType: 'client' }],
  ['AllianzForm', { ...AllianzForm, componentType: 'client' }],
  ['AllianzFooter', { ...AllianzFooter }],
  ['AllianzDocumentList', { ...AllianzDocumentList }],
  ['AllianzCTA', { ...AllianzCTA, componentType: 'client' }],
  ['AllianzCardGrid', { ...AllianzCardGrid, componentType: 'client' }],
  ['AllianzCalculator', { ...AllianzCalculator, componentType: 'client' }],
  ['AllianzBreadcrumbs', { ...AllianzBreadcrumbs }],
  ['AllianzArticle', { ...AllianzArticle, componentType: 'client' }],
  ['AllianzAccordion', { ...AllianzAccordion, componentType: 'client' }],
]);

export default componentMap;
