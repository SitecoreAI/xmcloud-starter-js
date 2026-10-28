/** Source v14 URL construction only. Calling this function sends no request. */
export function buildCalcXmlUrls(summary) {
  const query = '?immediateNeeds='.concat(summary.immediateNeeds,
    '&longtermNeeds=', summary.longTermNeeds,
    '&totalNeeds=', summary.totalNeeds,
    '&shortfall=', summary.shortfall,
    '&totalResources=', summary.totalResources,
    '&lifeInsuranceNeeded=', summary.additionalLifeInsuranceNeeded);
  return {
    video: 'https://www.calcxml.com/ins01.htm'.concat(query),
    description: 'https://www.calcxml.com/ins01t.htm'.concat(query),
  };
}
