import type { ComponentProps } from 'lib/component-props';
import type { InvestmentText } from 'lib/investment-portfolio-data';

export type InvestmentPortfolioDatasource = { id?: string; activeHeading?: InvestmentText; exitedHeading?: InvestmentText };
export type InvestmentPortfolioProps = Omit<ComponentProps, 'params'> & {
  params?: { RenderingIdentifier?: string };
  fields?: { data?: { datasource?: InvestmentPortfolioDatasource } };
};
