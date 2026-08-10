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
      {isEditing && isEmpty && (
        <p className="border border-dashed border-primary/50 bg-[#e4f4f7] px-4 py-3 text-sm font-medium text-slate-700">
          Governed home alert slot — NWN Utility Alert only
        </p>
      )}
      <AppPlaceholder
        page={page}
        componentMap={componentMap}
        name={ALERT_PLACEHOLDER_NAME}
        rendering={slotRendering}
      />
    </div>
  );
};
