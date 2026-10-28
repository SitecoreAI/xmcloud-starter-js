import { LifeInsurancePieChart } from './LifeInsurancePieChart';
import type { LifeInsuranceReportProps } from './life-report.props';
export { LIFE_INSURANCE_REPORT_SOURCE } from './life-report.props';
export type { LifeInsuranceReportProps } from './life-report.props';

/** Exact source pM valid-report structure; all copy and financial values are supplied by the caller.
 * No panel heading, print action, navigation, legal content, external URL, or financial calculation.
 */
export function LifeInsuranceReport({ summary, copy, formatSummaryValue, hasPartner, children }: LifeInsuranceReportProps) {
  const introduction = copy.summary.introduction ?? copy.stages.find((stage) => stage.id === 'summary')?.introduction;
  const label = (key: string) => copy.summary.rows.find((row) => row.key === key)!.label;
  const amount = (key: string) => formatSummaryValue(summary[key], key);
  const top = (key: string, dataTest: string) => <div className="tab-panel__summary-grid u-text-align-center">
    <p className="tab-panel__summary-title">{label(key)}</p>
    <p className="tab-panel__summary-total u-text-weight-bold" data-test={dataTest} data-summary-field={key}>{amount(key)}</p>
  </div>;
  const [needs, resources, savings] = copy.summary.tables;
  const row = (table: typeof needs, key: string) => <tr key={key}>
    <td>{table.rows.find((item) => item.key === key)!.label}</td><td data-summary-field={key}>{amount(key)}</td>
  </tr>;
  const head = (table: typeof needs) => <>
    <caption className="u-sr-only">{table.caption}</caption>
    <thead><tr className="a-table__summary-header t-bg-primary-brand t-primary-white"><th colSpan={2}>{table.heading}</th></tr></thead>
  </>;

  return <div><section>
    <div className="l-grid__row"><div className="l-grid__column-6-push-3 l-grid__column-large-12">
      <p>{introduction}</p>
      {top('additionalLifeInsuranceNeeded', 'summary-additional-life-insurance')}
    </div></div>
    <div className="l-grid__row">
      <div className="l-grid__column-small-12 l-grid__column-large-6">{top('immediateNeeds', 'summary-immediate-needs')}</div>
      <div className="l-grid__column-small-12 l-grid__column-large-6">{top('longTermNeeds', 'summary-long-term-needs')}</div>
    </div>
    <div className="l-grid__row"><div className="l-grid__column-10 push-1 u-text-align-center">
      <div className="tab-panel__chart" id="tabPanelChartTotals"><LifeInsurancePieChart summary={summary} hasPartner={hasPartner} /></div>
    </div></div>
    <div className="l-grid__row"><div className="l-grid__column-12 tab-panel__table u-text-align-left" id="tabPanelTable">
      {children}
      <section className="table-summary-results">
        <table className="a-table a-table__summary table-RILA">
          {head(needs)}
          <tbody>{row(needs, 'immediateNeeds')}{row(needs, 'longTermNeeds')}</tbody>
          <tfoot>{row(needs, 'totalNeeds')}</tfoot>
        </table>
        <table className="a-table a-table__summary table-RILA">
          {head(resources)}
          <tbody>{row(resources, 'investmentAssetsAndSocialSecurity')}{row(resources, 'existingLifeInsurance')}
            {row(resources, 'partnerAnnualIncomeSum')}{row(resources, 'totalResources')}</tbody>
        </table>
        <table className="a-table a-table__summary table-RILA">
          {head(savings)}
          <tbody>{row(savings, 'shortfall')}</tbody>
          <tfoot>{row(savings, 'additionalLifeInsuranceNeeded')}</tfoot>
        </table>
      </section>
    </div></div>
  </section></div>;
}
