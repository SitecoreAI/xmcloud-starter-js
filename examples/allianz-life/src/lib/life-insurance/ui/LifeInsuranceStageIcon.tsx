import source from './life-stage-icons.source.json';
import type { LifeInsuranceStageIconProps } from './life-stage-icon.props';

export type { LifeInsuranceStageIconProps, LifeStageIndex } from './life-stage-icon.props';

/**
 * Source v14 inline SVG wrapper rn (1145101–1145487) and its five stage components.
 * Keep this inside the caller's span.axl-tab-list-icon. The retained source CSS
 * supplies 36px dimensions and normal/hover/active/focus fill inheritance.
 *
 * The source named components forward only icoName/title/description. In
 * particular, width, fill, className, style and arbitrary ARIA props are absent.
 * labelBy is passed to rn but unused there; it is not a rendered attribute.
 */
export function LifeInsuranceStageIcon({ stageIndex, ...props }: LifeInsuranceStageIconProps) {
  const icon = source.icons[stageIndex];
  const { icoName = icon.name, title = icon.title, description = icon.description } = props;
  const titleId = `titleIcon${icoName}`;
  const descriptionId = `descIcon${icoName}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <title id={titleId}>{title}</title>
      <desc id={descriptionId}>{description}</desc>
      <path d={icon.d} />
    </svg>
  );
}
