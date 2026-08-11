import { AppPlaceholder } from '@sitecore-content-sdk/nextjs';
import type { NwnAlertSlotProps } from './nwn-alert-slot.props';

const ALERT_PLACEHOLDER_NAME = 'nwn-home-alert';

export const Default: React.FC<NwnAlertSlotProps> = (props) => {
  const { componentMap, page, rendering } = props;
  const alertRenderings =
    rendering.placeholders?.[ALERT_PLACEHOLDER_NAME] ?? [];
  const isEditing = page.mode.isEditing;
  const isEmpty = alertRenderings.length === 0;

  if (isEmpty && !isEditing) return null;

  // The real rendering UID makes this host selectable in Pages. Registering the
  // empty child key gives Content SDK enough information to emit its insert chrome.
  const slotRendering = {
    ...rendering,
    placeholders: {
      ...rendering.placeholders,
      [ALERT_PLACEHOLDER_NAME]: alertRenderings,
    },
  };

  return (
    <div
      data-component="NwnAlertSlot"
      data-placeholder-key={ALERT_PLACEHOLDER_NAME}
    >
      <AppPlaceholder
        page={page}
        componentMap={componentMap}
        name={ALERT_PLACEHOLDER_NAME}
        rendering={slotRendering}
      />
    </div>
  );
};
