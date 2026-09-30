// Client-safe component map for App Router

import { BYOCClientWrapper, NextjsContentSdkComponent, FEaaSClientWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

import * as AllianzVideo from 'src/components/allianz-video/AllianzVideo';
import * as AllianzSearch from 'src/components/allianz-search/AllianzSearch';
import * as AllianzRichText from 'src/components/allianz-rich-text/AllianzRichText';
import * as AllianzLegacySidebar from 'src/components/allianz-legacy-sidebar/AllianzLegacySidebar';
import * as AllianzLegacyLinkList from 'src/components/allianz-legacy-link-list/AllianzLegacyLinkList';
import * as AllianzLegacyHeader from 'src/components/allianz-legacy-header/AllianzLegacyHeader';
import * as AllianzLegacyFooter from 'src/components/allianz-legacy-footer/AllianzLegacyFooter';
import * as AllianzLegacyAccordion from 'src/components/allianz-legacy-accordion/AllianzLegacyAccordion';
import * as AllianzHero from 'src/components/allianz-hero/AllianzHero';
import * as AllianzHeader from 'src/components/allianz-header/AllianzHeader';
import * as AllianzForm from 'src/components/allianz-form/AllianzForm';
import * as AllianzCTA from 'src/components/allianz-cta/AllianzCTA';
import * as AllianzCardGrid from 'src/components/allianz-card-grid/AllianzCardGrid';
import * as AllianzCalculator from 'src/components/allianz-calculator/AllianzCalculator';
import * as AllianzArticle from 'src/components/allianz-article/AllianzArticle';
import * as AllianzAccordion from 'src/components/allianz-accordion/AllianzAccordion';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCClientWrapper],
  ['FEaaSWrapper', FEaaSClientWrapper],
  ['Form', Form],
  ['AllianzVideo', { ...AllianzVideo }],
  ['AllianzSearch', { ...AllianzSearch }],
  ['AllianzRichText', { ...AllianzRichText }],
  ['AllianzLegacySidebar', { ...AllianzLegacySidebar }],
  ['AllianzLegacyLinkList', { ...AllianzLegacyLinkList }],
  ['AllianzLegacyHeader', { ...AllianzLegacyHeader }],
  ['AllianzLegacyFooter', { ...AllianzLegacyFooter }],
  ['AllianzLegacyAccordion', { ...AllianzLegacyAccordion }],
  ['AllianzHero', { ...AllianzHero }],
  ['AllianzHeader', { ...AllianzHeader }],
  ['AllianzForm', { ...AllianzForm }],
  ['AllianzCTA', { ...AllianzCTA }],
  ['AllianzCardGrid', { ...AllianzCardGrid }],
  ['AllianzCalculator', { ...AllianzCalculator }],
  ['AllianzArticle', { ...AllianzArticle }],
  ['AllianzAccordion', { ...AllianzAccordion }],
]);

export default componentMap;
