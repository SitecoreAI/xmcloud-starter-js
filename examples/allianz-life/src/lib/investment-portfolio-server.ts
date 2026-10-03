import 'server-only';
import type { ComponentMap, GetComponentServerProps, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import type { FetchOptions } from '@sitecore-content-sdk/content/client';
import { buildInvestmentPortfolioScopeQuery, collectInvestmentPortfolio, normalizeInvestmentId, selectInvestmentPortfolio,
  unavailableInvestmentPortfolio, validInvestmentBindings, validInvestmentPortfolioScope,
  type InvestmentPortfolioBindings, type InvestmentPortfolioGetData, type InvestmentPortfolioResult, type InvestmentPortfolioScope,
  type InvestmentPortfolioScopeResponse } from './investment-portfolio-data';

export type InvestmentPortfolioServerOptions = {
  getData: InvestmentPortfolioGetData;
  fetchOptions?: FetchOptions;
  bindings?: InvestmentPortfolioBindings;
};
type Stage = NonNullable<InvestmentPortfolioResult['failureStage']>;
class PortfolioFailure extends Error {
  constructor(readonly stage: Stage) { super('Investment portfolio read failed'); }
}
async function atStage<T>(stage: Stage, operation: () => T | Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof PortfolioFailure) throw error;
    // Neither exception contents nor request headers may reach serialized component props.
    throw new PortfolioFailure(stage);
  }
}

/** Instantiate once per page request, with the configured SDK getData and incoming preview fetchOptions. */
export function enrichInvestmentPortfolioComponentMap(components: ComponentMap<NextjsContentSdkComponent>, options: InvestmentPortfolioServerOptions): ComponentMap<NextjsContentSdkComponent> {
  const enriched = new Map(components), component = enriched.get('InvestmentPortfolio');
  if (!component) return enriched;
  const reads = new Map<string, Promise<InvestmentPortfolioResult>>();
  const getComponentServerProps: GetComponentServerProps = async (rendering, layout) => {
    const bindings = options.bindings;
    if (!validInvestmentBindings(bindings)) return { investmentPortfolio: unavailableInvestmentPortfolio('unconfigured') };
    const { language, site } = layout.sitecore.context;
    const rootId = layout.sitecore.route?.itemId, datasourceId = rendering.dataSource;
    if (site?.name !== bindings.siteName || typeof language !== 'string' || !/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i.test(language) ||
      !normalizeInvestmentId(rootId) || !normalizeInvestmentId(datasourceId)) return { investmentPortfolio: unavailableInvestmentPortfolio('invalid-scope') };
    const scope: InvestmentPortfolioScope = { rootId: rootId!, datasourceId: datasourceId!, language };
    const key = `${language}:${normalizeInvestmentId(rootId)}:${normalizeInvestmentId(datasourceId)}`;
    let result = reads.get(key);
    if (!result) {
      result = (async () => {
        try {
          const actual = await atStage('scope-request', () => options.getData<InvestmentPortfolioScopeResponse>(buildInvestmentPortfolioScopeQuery(scope), undefined, options.fetchOptions));
          if (!await atStage('scope-validation', () => validInvestmentPortfolioScope(scope, bindings, actual))) return unavailableInvestmentPortfolio('invalid-scope');
          const reader: InvestmentPortfolioGetData = <T = unknown>(query: string, variables?: Record<string, unknown>, fetchOptions?: FetchOptions) =>
            atStage('items-request', () => options.getData<T>(query, variables, fetchOptions));
          const collection = await atStage('items-validation', () => collectInvestmentPortfolio(reader, scope, bindings, options.fetchOptions));
          return await atStage('selection-validation', () => selectInvestmentPortfolio(scope, bindings, collection));
        } catch (error) {
          return { ...unavailableInvestmentPortfolio(), ...(error instanceof PortfolioFailure ? { failureStage: error.stage } : {}) };
        }
      })();
      reads.set(key, result);
    }
    return { investmentPortfolio: await result };
  };
  enriched.set('InvestmentPortfolio', { ...component, getComponentServerProps,
    ...(component.dynamicModule ? { dynamicModule: async () => ({ ...await component.dynamicModule!(), getComponentServerProps }) } : {}) });
  return enriched;
}
