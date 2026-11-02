/**
 * Exact public Allianz calculator service functions.
 * Source asset: benefits-tax-deferral.js
 * Full asset SHA-256: 5831629ec794605348d94f88d5ef89426697feeadb49d9e2d971c208448ccb01
 * Raw UTF-8 source byte range: [2520460, 2522310).
 * Function block SHA-256: 010866e398172b1f9ec88617aed18e31677f81bfc7cccb2d93eb6423366011c7
 * No formula changes; local arithmetic only. Source validation/formatting are separate.
 */

/* BEGIN EXACT SOURCE FUNCTIONS */
function taxablePortfolioFutureValue(principle, interestRate, investmentYears, marginalTaxRate) {
  let initialPrinciple = principle;
  let accumTotEarn = 0;
  let compPerYear = 1;
  interestRate /= 100;
  if (marginalTaxRate === '' || marginalTaxRate === 0) {
    marginalTaxRate = 0;
  } else {
    marginalTaxRate /= 100;
  }
  interestRate /= compPerYear;
  let numPeriods = investmentYears * compPerYear;
  for (let i = 1; i <= numPeriods; i++) {
    let accumAnnInt = 0;
    let intEarn = principle * interestRate;
    accumAnnInt = accumAnnInt + intEarn;
    accumTotEarn = accumTotEarn + intEarn;
    principle = principle + intEarn;
    if (i % compPerYear === 0) {
      let tax = marginalTaxRate * accumAnnInt;
      accumTotEarn = accumTotEarn - tax;
      principle = principle - tax;
      accumAnnInt = 0;
    }
  }
  return accumTotEarn + initialPrinciple;
}
function taxDeferredPortfolioFutureValue(principle, interestRate, investmentYears, marginalTaxRate) {
  let initialPrinciple = principle;
  let accumTotEarn = 0;
  let compPerYear = 1;
  let percentTaxable = 0;
  interestRate /= 100;
  if (marginalTaxRate === '' || marginalTaxRate === 0) {
    marginalTaxRate = 0;
  } else {
    marginalTaxRate /= 100;
  }
  percentTaxable /= 100;
  interestRate /= compPerYear;
  let numPeriods = investmentYears * compPerYear;
  for (let i = 1; i <= numPeriods; i++) {
    let accumAnnInt = 0;
    let intEarn = principle * interestRate;
    accumAnnInt = accumAnnInt + intEarn;
    accumTotEarn = accumTotEarn + intEarn;
    principle = principle + intEarn;
    if (i % compPerYear === 0) {
      let taxable = accumAnnInt * percentTaxable;
      let tax = marginalTaxRate * taxable;
      accumTotEarn = accumTotEarn - tax;
      principle = principle - tax;
      accumAnnInt = 0;
    }
  }
  return accumTotEarn + initialPrinciple;
}
/* END EXACT SOURCE FUNCTIONS */

export { taxablePortfolioFutureValue, taxDeferredPortfolioFutureValue };
