export interface CalcXmlSummary {
  immediateNeeds: number;
  longTermNeeds: number;
  totalNeeds: number;
  shortfall: number;
  totalResources: number;
  additionalLifeInsuranceNeeded: number;
}

/** Recovered public endpoint/parameter construction; does not load either URL. */
export function buildCalcXmlUrls(summary: CalcXmlSummary): {
  video: string;
  description: string;
};
