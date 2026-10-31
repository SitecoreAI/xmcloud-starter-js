'use client';

import { useComponentProps, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { AutomaticPeople, NativePeopleDiagnostic } from 'lib/people-automatic-data';
import type { ExecutiveDirectoryProps } from './executive-directory.props';
import { PeopleCards } from './people-cards.props';
import './PeopleDirectory.css';

export const Default = ({ fields, rendering, params }: ExecutiveDirectoryProps) => {
  const { page } = useSitecore();
  const editing = page?.mode?.isEditing ?? false;
  const componentProps = useComponentProps<{ automaticPeople?: AutomaticPeople; nativePeopleDiagnostic?: NativePeopleDiagnostic }>(rendering?.uid ?? '');
  const automatic = componentProps?.automaticPeople;
  const diagnostic = componentProps?.nativePeopleDiagnostic;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Executive Directory" />;
  return <section id={params?.RenderingIdentifier} className="people-directory executive-directory l-container--full-width t-bg-transparent axlTileCollection">
    <div className="l-grid l-grid--max-width">
      <div className="u-margin-bottom-xl"><PeopleCards items={automatic?.complete ? automatic.items : []} editing={editing} /></div>
      {!automatic?.complete && <p role="status" data-people-failure-stage={diagnostic?.failureStage}
        data-people-validation-reason={diagnostic?.validationReason}
        data-people-id-presence={diagnostic?.invalidId?.idPresence}
        data-people-id-type={diagnostic?.invalidId?.idType}
        data-people-id-format={diagnostic?.invalidId?.idFormat}
        data-people-row-ordinal={diagnostic?.invalidId?.rowOrdinal}
        data-people-projection-comparison={diagnostic?.projectionComparison ? JSON.stringify(diagnostic.projectionComparison) : undefined}>The executive directory is temporarily unavailable.</p>}
      {editing && Boolean(automatic?.missingOrder) && <p role="status">Some biographies have no directory order and appear after ordered entries.</p>}
    </div>
  </section>;
};
