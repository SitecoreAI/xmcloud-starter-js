import React from 'react';
import { createRoot } from 'react-dom/client';
import { LifeInsuranceCalculator } from './LifeInsuranceCalculator';
import { lifeUiCopy } from './ui-copy';
import { calculateLifeInsurance, validateLifeInsuranceInputs, updateLifeInsuranceField } from '../engine/life-insurance-engine.mjs';
import { formatCurrency } from '../engine/formatting/source-numeral-formatters.mjs';
import './source-app.css';
import './private-ui.css';

const source = { calculateLifeInsurance, validateLifeInsuranceInputs, updateSourceIncome: updateLifeInsuranceField };
createRoot(document.getElementById('dx-life-insurance')!).render(<LifeInsuranceCalculator copy={lifeUiCopy} source={source}
  formatSummaryValue={(value) => String(formatCurrency(value))} />);
