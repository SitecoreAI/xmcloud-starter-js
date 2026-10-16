// Client-safe component map for App Router

import { BYOCClientWrapper, NextjsContentSdkComponent, FEaaSClientWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

import * as VenturesTeam from 'src/components/ventures-team/VenturesTeam';
import * as SustainabilityCommitment from 'src/components/sustainability-commitment/SustainabilityCommitment';
import * as ShareholderReportAccess from 'src/components/shareholder-report-access/ShareholderReportAccess';
import * as SecureFutureFeature from 'src/components/secure-future-feature/SecureFutureFeature';
import * as SectionNavigation from 'src/components/section-navigation/SectionNavigation';
import * as RetirementSolutionsIntro from 'src/components/retirement-solutions-intro/RetirementSolutionsIntro';
import * as RetirementGoalsIntro from 'src/components/retirement-goals-intro/RetirementGoalsIntro';
import * as ProspectusProductDirectory from 'src/components/prospectus-product-directory/ProspectusProductDirectory';
import * as ProspectusIntroduction from 'src/components/prospectus-introduction/ProspectusIntroduction';
import * as ProspectusDocumentTable from 'src/components/prospectus-document-table/ProspectusDocumentTable';
import * as ProductTypeChoices from 'src/components/product-type-choices/ProductTypeChoices';
import * as ProductRiskDisclosures from 'src/components/product-risk-disclosures/ProductRiskDisclosures';
import * as ProductOfferings from 'src/components/product-offerings/ProductOfferings';
import * as ProductIntroduction from 'src/components/product-introduction/ProductIntroduction';
import * as ProductHero from 'src/components/product-hero/ProductHero';
import * as ProductFootnotes from 'src/components/product-footnotes/ProductFootnotes';
import * as ProductFaqIntro from 'src/components/product-faq-intro/ProductFaqIntro';
import * as ProductFaq from 'src/components/product-faq/ProductFaq';
import * as ProductDisclosures from 'src/components/product-disclosures/ProductDisclosures';
import * as ProductBenefits from 'src/components/product-benefits/ProductBenefits';
import * as PressReleaseArchive from 'src/components/press-release-archive/PressReleaseArchive';
import * as PressRelease from 'src/components/press-release/PressRelease';
import * as OlympicPartnership from 'src/components/olympic-partnership/OlympicPartnership';
import * as OfferingsPrompt from 'src/components/offerings-prompt/OfferingsPrompt';
import * as NewsroomYearNavigation from 'src/components/newsroom-year-navigation/NewsroomYearNavigation';
import * as NewsroomReturn from 'src/components/newsroom-return/NewsroomReturn';
import * as NewsroomRecentReleases from 'src/components/newsroom-recent-releases/NewsroomRecentReleases';
import * as NewsroomPublicRelations from 'src/components/newsroom-public-relations/NewsroomPublicRelations';
import * as NewsroomFeaturedUpdate from 'src/components/newsroom-featured-update/NewsroomFeaturedUpdate';
import * as NewsroomCompanyProfile from 'src/components/newsroom-company-profile/NewsroomCompanyProfile';
import * as NewsroomCallout from 'src/components/newsroom-callout/NewsroomCallout';
import * as LegalDisclosures from 'src/components/legal-disclosures/LegalDisclosures';
import * as LeadershipQuote from 'src/components/leadership-quote/LeadershipQuote';
import * as KeyFigures from 'src/components/key-figures/KeyFigures';
import * as InvestmentPortfolio from 'src/components/investment-portfolio/InvestmentPortfolio';
import * as IconCards from 'src/components/icon-cards/IconCards';
import * as HomepageHero from 'src/components/homepage-hero/HomepageHero';
import * as HelpfulResources from 'src/components/helpful-resources/HelpfulResources';
import * as ExpertDirectory from 'src/components/expert-directory/ExpertDirectory';
import * as ExpertBiography from 'src/components/expert-biography/ExpertBiography';
import * as ExecutiveDirectory from 'src/components/executive-directory/ExecutiveDirectory';
import * as ExecutiveBiography from 'src/components/executive-biography/ExecutiveBiography';
import * as CompanyStrengths from 'src/components/company-strengths/CompanyStrengths';
import * as CompanyMission from 'src/components/company-mission/CompanyMission';
import * as CompanyHero from 'src/components/company-hero/CompanyHero';
import * as BiographyDisclosures from 'src/components/biography-disclosures/BiographyDisclosures';
import * as AllianzVideo from 'src/components/allianz-video/AllianzVideo';
import * as AllianzTimeline from 'src/components/allianz-timeline/AllianzTimeline';
import * as AllianzSearch from 'src/components/allianz-search/AllianzSearch';
import * as AllianzRichText from 'src/components/allianz-rich-text/AllianzRichText';
import * as AllianzRateTable from 'src/components/allianz-rate-table/AllianzRateTable';
import * as AllianzRateSnapshot from 'src/components/allianz-rate-snapshot/AllianzRateSnapshot';
import * as AllianzProductNavigation from 'src/components/allianz-product-navigation/AllianzProductNavigation';
import * as AllianzParticipantNavigation from 'src/components/allianz-participant-navigation/AllianzParticipantNavigation';
import * as AllianzParticipantHeader from 'src/components/allianz-participant-header/AllianzParticipantHeader';
import * as AllianzLegacySidebar from 'src/components/allianz-legacy-sidebar/AllianzLegacySidebar';
import * as AllianzLegacyRichText from 'src/components/allianz-legacy-rich-text/AllianzLegacyRichText';
import * as AllianzLegacyPageHeader from 'src/components/allianz-legacy-page-header/AllianzLegacyPageHeader';
import * as AllianzLegacyLinkList from 'src/components/allianz-legacy-link-list/AllianzLegacyLinkList';
import * as AllianzLegacyHero from 'src/components/allianz-legacy-hero/AllianzLegacyHero';
import * as AllianzLegacyHeader from 'src/components/allianz-legacy-header/AllianzLegacyHeader';
import * as AllianzLegacyFooter from 'src/components/allianz-legacy-footer/AllianzLegacyFooter';
import * as AllianzLegacyDocumentServices from 'src/components/allianz-legacy-document-services/AllianzLegacyDocumentServices';
import * as AllianzLegacyCardGrid from 'src/components/allianz-legacy-card-grid/AllianzLegacyCardGrid';
import * as AllianzLegacyAccordion from 'src/components/allianz-legacy-accordion/AllianzLegacyAccordion';
import * as AllianzHero from 'src/components/allianz-hero/AllianzHero';
import * as AllianzHeader from 'src/components/allianz-header/AllianzHeader';
import * as AllianzForm from 'src/components/allianz-form/AllianzForm';
import * as AllianzFooter from 'src/components/allianz-footer/AllianzFooter';
import * as AllianzCTA from 'src/components/allianz-cta/AllianzCTA';
import * as AllianzContextBreadcrumbs from 'src/components/allianz-context-breadcrumbs/AllianzContextBreadcrumbs';
import * as AllianzCardGrid from 'src/components/allianz-card-grid/AllianzCardGrid';
import * as AllianzCalculator from 'src/components/allianz-calculator/AllianzCalculator';
import * as AllianzArticle from 'src/components/allianz-article/AllianzArticle';
import * as AllianzAccordion from 'src/components/allianz-accordion/AllianzAccordion';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCClientWrapper],
  ['FEaaSWrapper', FEaaSClientWrapper],
  ['Form', Form],
  ['VenturesTeam', { ...VenturesTeam }],
  ['SustainabilityCommitment', { ...SustainabilityCommitment }],
  ['ShareholderReportAccess', { ...ShareholderReportAccess }],
  ['SecureFutureFeature', { ...SecureFutureFeature }],
  ['SectionNavigation', { ...SectionNavigation }],
  ['RetirementSolutionsIntro', { ...RetirementSolutionsIntro }],
  ['RetirementGoalsIntro', { ...RetirementGoalsIntro }],
  ['ProspectusProductDirectory', { ...ProspectusProductDirectory }],
  ['ProspectusIntroduction', { ...ProspectusIntroduction }],
  ['ProspectusDocumentTable', { ...ProspectusDocumentTable }],
  ['ProductTypeChoices', { ...ProductTypeChoices }],
  ['ProductRiskDisclosures', { ...ProductRiskDisclosures }],
  ['ProductOfferings', { ...ProductOfferings }],
  ['ProductIntroduction', { ...ProductIntroduction }],
  ['ProductHero', { ...ProductHero }],
  ['ProductFootnotes', { ...ProductFootnotes }],
  ['ProductFaqIntro', { ...ProductFaqIntro }],
  ['ProductFaq', { ...ProductFaq }],
  ['ProductDisclosures', { ...ProductDisclosures }],
  ['ProductBenefits', { ...ProductBenefits }],
  ['PressReleaseArchive', { ...PressReleaseArchive }],
  ['PressRelease', { ...PressRelease }],
  ['OlympicPartnership', { ...OlympicPartnership }],
  ['OfferingsPrompt', { ...OfferingsPrompt }],
  ['NewsroomYearNavigation', { ...NewsroomYearNavigation }],
  ['NewsroomReturn', { ...NewsroomReturn }],
  ['NewsroomRecentReleases', { ...NewsroomRecentReleases }],
  ['NewsroomPublicRelations', { ...NewsroomPublicRelations }],
  ['NewsroomFeaturedUpdate', { ...NewsroomFeaturedUpdate }],
  ['NewsroomCompanyProfile', { ...NewsroomCompanyProfile }],
  ['NewsroomCallout', { ...NewsroomCallout }],
  ['LegalDisclosures', { ...LegalDisclosures }],
  ['LeadershipQuote', { ...LeadershipQuote }],
  ['KeyFigures', { ...KeyFigures }],
  ['InvestmentPortfolio', { ...InvestmentPortfolio }],
  ['IconCards', { ...IconCards }],
  ['HomepageHero', { ...HomepageHero }],
  ['HelpfulResources', { ...HelpfulResources }],
  ['ExpertDirectory', { ...ExpertDirectory }],
  ['ExpertBiography', { ...ExpertBiography }],
  ['ExecutiveDirectory', { ...ExecutiveDirectory }],
  ['ExecutiveBiography', { ...ExecutiveBiography }],
  ['CompanyStrengths', { ...CompanyStrengths }],
  ['CompanyMission', { ...CompanyMission }],
  ['CompanyHero', { ...CompanyHero }],
  ['BiographyDisclosures', { ...BiographyDisclosures }],
  ['AllianzVideo', { ...AllianzVideo }],
  ['AllianzTimeline', { ...AllianzTimeline }],
  ['AllianzSearch', { ...AllianzSearch }],
  ['AllianzRichText', { ...AllianzRichText }],
  ['AllianzRateTable', { ...AllianzRateTable }],
  ['AllianzRateSnapshot', { ...AllianzRateSnapshot }],
  ['AllianzProductNavigation', { ...AllianzProductNavigation }],
  ['AllianzParticipantNavigation', { ...AllianzParticipantNavigation }],
  ['AllianzParticipantHeader', { ...AllianzParticipantHeader }],
  ['AllianzLegacySidebar', { ...AllianzLegacySidebar }],
  ['AllianzLegacyRichText', { ...AllianzLegacyRichText }],
  ['AllianzLegacyPageHeader', { ...AllianzLegacyPageHeader }],
  ['AllianzLegacyLinkList', { ...AllianzLegacyLinkList }],
  ['AllianzLegacyHero', { ...AllianzLegacyHero }],
  ['AllianzLegacyHeader', { ...AllianzLegacyHeader }],
  ['AllianzLegacyFooter', { ...AllianzLegacyFooter }],
  ['AllianzLegacyDocumentServices', { ...AllianzLegacyDocumentServices }],
  ['AllianzLegacyCardGrid', { ...AllianzLegacyCardGrid }],
  ['AllianzLegacyAccordion', { ...AllianzLegacyAccordion }],
  ['AllianzHero', { ...AllianzHero }],
  ['AllianzHeader', { ...AllianzHeader }],
  ['AllianzForm', { ...AllianzForm }],
  ['AllianzFooter', { ...AllianzFooter }],
  ['AllianzCTA', { ...AllianzCTA }],
  ['AllianzContextBreadcrumbs', { ...AllianzContextBreadcrumbs }],
  ['AllianzCardGrid', { ...AllianzCardGrid }],
  ['AllianzCalculator', { ...AllianzCalculator }],
  ['AllianzArticle', { ...AllianzArticle }],
  ['AllianzAccordion', { ...AllianzAccordion }],
]);

export default componentMap;
