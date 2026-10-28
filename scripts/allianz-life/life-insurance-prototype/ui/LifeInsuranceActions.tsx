import source from './life-insurance-actions.source.json';
import type { LifeInsuranceActionsProps } from './life-insurance-actions.props';

export type { LifeInsuranceActionsProps } from './life-insurance-actions.props';

/** Source pP/pY/pS structure; the parent owns desktop visibility and all financial computation. */
export function LifeInsuranceActions({ isSummary, summary, copy, formatSummaryValue, onPrint,
  printing, printError, idPrefix }: LifeInsuranceActionsProps) {
  if (!isSummary) return <div>
    <div className="sumary-header"><p>{source.estimate.heading}</p></div>
    {source.estimate.rows.map(row => <div className="tab-panel-total" key={row.key}>
      <p>{row.label}</p>
      <p className="tab-panel-summary-total">{formatSummaryValue(summary[row.key], row.key)}</p>
    </div>)}
    <p className="summary-footer" />
  </div>;

  const iconName = `${idPrefix}-CategoryArticle`;
  const titleId = `titleIcon${iconName}`;
  const descriptionId = `descIcon${iconName}`;
  const errorId = `${idPrefix}-print-error`;

  return <div id={`${idPrefix}-summaryTabActions`}>
    <button type="button" tabIndex={0}
      className="m-axlButton m-axlButton--secondary-panel m-axlButton-icon"
      aria-label={copy.buttons.print} aria-busy={printing} aria-disabled={printing}
      aria-describedby={printError ? errorId : undefined}
      onClick={event => { if (printing) event.preventDefault(); else onPrint(event.currentTarget); }}>
      <span className="m-axlButton__icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={titleId} aria-describedby={descriptionId}>
          <title id={titleId}>{source.icon.title}</title>
          <desc id={descriptionId}>{source.icon.description}</desc>
          <g transform={source.icon.groupTransform}>{source.icon.paths.map((d, index) => <path d={d} key={index} />)}</g>
        </svg>
      </span>
      <span id={`${idPrefix}-print-label`} className="button-label">{copy.buttons.print}</span>
    </button>
    {printError && <p id={errorId} role="alert">{source.privatePrintError}</p>}
  </div>;
}
