import 'server-only';
import type { ComponentMap, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import { enrichNewsroomComponentMap, type NewsroomAutomaticServerOptions } from './newsroom-automatic-server';
import { enrichPeopleComponentMap } from './people-automatic-server';
import { enrichDocumentComponentMap } from '../components/prospectus-product-directory/document-automatic-server.props';
import { enrichInvestmentPortfolioComponentMap } from './investment-portfolio-server';
import type { InvestmentPortfolioBindings } from './investment-portfolio-data';
import { enrichSectionNavigationComponentMap } from './section-navigation-server';
import type { SectionNavigationBindings } from './section-navigation-data';

export type AllianzAutomaticServerOptions = NewsroomAutomaticServerOptions & {
  /** Populated only from verified native definition/readback identities. */
  investmentPortfolioBindings?: InvestmentPortfolioBindings;
  sectionNavigationBindings?: SectionNavigationBindings;
};

/** Compose native component hooks once per request, sharing its scoped SDK reader. */
export function enrichAllianzComponentMap(
  components: ComponentMap<NextjsContentSdkComponent>,
  options: AllianzAutomaticServerOptions,
): ComponentMap<NextjsContentSdkComponent> {
  const established = enrichPeopleComponentMap(
    enrichDocumentComponentMap(enrichNewsroomComponentMap(components, options), options),
    options,
  );
  return enrichSectionNavigationComponentMap(
    enrichInvestmentPortfolioComponentMap(established, { ...options, bindings: options.investmentPortfolioBindings }),
    { ...options, bindings: options.sectionNavigationBindings },
  );
}
