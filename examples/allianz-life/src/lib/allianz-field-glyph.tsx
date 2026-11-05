/** Source-verified Field vectors already retained in this application's public assets.
 * Callers supply only a fixed kind and a code-owned presentation class.
 * Native authored icons remain SDK Image fields at the calling component.
 */
const GLYPHS = {
  connect: { src: '/allianz-assets/4e90bfa982a5c809.svg', name: 'Connect' },
  home: { src: '/allianz-assets/2e3cd2d4635d2e9a.svg', name: 'Home' },
  globe: { src: '/allianz-assets/01be54a5db39aebe.svg', name: 'Globe' },
  'date-forward': { src: '/allianz-assets/596d403151346a0c.svg', name: 'Date Forward' },
  game: { src: '/allianz-ui/about-overview/game.svg', name: 'Game' },
  information: { src: '/allianz-ui/about-overview/information.svg', name: 'Information' },
} as const;

export type AllianzFieldGlyphKind = keyof typeof GLYPHS;

export const AllianzFieldGlyph = ({ kind, className }:
  { kind: AllianzFieldGlyphKind; className?: string }) => {
  if (!Object.hasOwn(GLYPHS, kind)) return null;
  const glyph = GLYPHS[kind];
  // Plain img intentionally represents a code-owned vector, never a CMS Image field.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={glyph.src} alt={glyph.name} className={className} />;
};
