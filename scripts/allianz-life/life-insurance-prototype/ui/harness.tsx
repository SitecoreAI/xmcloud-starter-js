import React from 'react';
import { createRoot } from 'react-dom/client';
import { LifeInsuranceRuntime } from '../../../../examples/allianz-life/src/lib/life-insurance/LifeInsuranceRuntime';

createRoot(document.getElementById('dx-life-insurance')!).render(<div className="allianz-modern allianz-life-insurance-calculator">
  <div className="l-container--full-width u-row-spacing t-bg-transparent axlTileCollection"><div className="l-grid l-grid--max-width"><div className="l-grid__row u-margin-bottom-xl"><div className="l-grid__column-medium-12"><div className="o-richTextEditor__wrapper">
    <LifeInsuranceRuntime />
  </div></div></div></div></div>
</div>);
