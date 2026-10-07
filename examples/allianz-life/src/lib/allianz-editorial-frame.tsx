import type { ReactNode } from 'react';
import { rowSpacing, sectionTheme } from './allianz-fields';
import { editorialColumnClass } from './allianz-editorial';

/** Wrapper ownership is explicit for native nested composition. Content children
 * belong in a shared column; row children belong in the section's shared grid.
 * Column children keep independent fields inside the section's shared row. */
export function EditorialFrame({ params, children, column = false }: {
  params: Record<string, string | undefined>;
  children: ReactNode;
  column?: boolean;
}) {
  if (params.container === 'content') return <>{children}</>;
  if (params.container === 'column') return column
    ? <div className={editorialColumnClass(params)} id={params.RenderingIdentifier}>{children}</div>
    : <>{children}</>;
  const row = <div className={`l-grid__row${params.matchHeightRow === '1' ? ' match-height-row' : ''} ${rowSpacing(params)}`} id={params.container === 'row' ? params.RenderingIdentifier : undefined}>
    {column ? <div className={editorialColumnClass(params)}>{children}</div> : children}
  </div>;
  if (params.container === 'row') return row;
  return <div className={`${params.sectionWidth === 'contained' ? 'l-container' : 'l-container--full-width'} ${params.sectionSpacing === '1' ? 'u-row-spacing ' : ''}${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className={`l-grid l-grid--max-width${params.sectionWidth === 'contained' ? ' l-grid--no-gutters-outer' : ''}`}>
      {params.introSpacer === '1' && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12" /></div>}
      {row}
    </div>
  </div>;
}
