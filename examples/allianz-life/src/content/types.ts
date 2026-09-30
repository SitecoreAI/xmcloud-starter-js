/** Canonical datasource field contract shared by fixtures and editable components. */
export interface ValueField<T = string> { jsonValue: { value: T } }
export interface LinkValue { href: string; text: string; linktype?: string; target?: string; title?: string }
export interface ImageValue { src: string; alt: string; width?: string; height?: string }
export type LinkDataField = ValueField<LinkValue>;
export type ImageDataField = ValueField<ImageValue>;
export interface NavigationItem {
  id: string;
  title: ValueField;
  link: LinkDataField;
  icon?: ImageDataField;
  children: { results: NavigationItem[] };
}
export interface CardItem {
  id: string;
  heading: ValueField;
  subheading?: ValueField;
  body: ValueField;
  image: ImageDataField;
  icon?: ImageDataField;
  link: LinkDataField;
  theme?: ValueField;
  headingLevel?: ValueField;
  alphanumeral?: ValueField;
}
export interface AccordionItem { id: string; heading: ValueField; body: ValueField }
export interface Datasource {
  id: string;
  heading?: ValueField;
  body?: ValueField;
  summary?: ValueField;
  logo?: ImageDataField;
  tagline?: ValueField;
  desktopImage?: ImageDataField;
  mobileImage?: ImageDataField;
  primaryLink?: LinkDataField;
  secondaryLink?: LinkDataField;
  primaryNav?: { targetItems: NavigationItem[] };
  utilityNav?: { targetItems: NavigationItem[] };
  socialNav?: { targetItems: NavigationItem[] };
  copyright?: ValueField;
  children?: { results: (CardItem | AccordionItem)[] };
}
export interface NativeComponentFixture {
  componentName: string;
  uid: string;
  dataSource: string;
  params: Record<string, string>;
  fields: { data: { datasource: Datasource } };
}
export interface PageFixture {
  path: string;
  title: string;
  description: string;
  sourceUrl: string;
  archetype: string;
  components: NativeComponentFixture[];
  needsReview: boolean;
  shellFamily?: string;
  sourceBodyId?: string;
  sourceBodyClasses?: string[];
  legacySharedKey?: 'new-york' | 'allianz-life';
  aliases?: string[];
}
export interface FixtureContent {
  schemaVersion: number;
  provenance: Record<string, string>;
  shared: { header: NativeComponentFixture; footer: NativeComponentFixture; legacyShared?: Record<string, {header: NativeComponentFixture; footer: NativeComponentFixture}> };
  routes: Record<string, PageFixture>;
}
