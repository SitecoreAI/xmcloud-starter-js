import type { AllianzProps } from 'lib/allianz-fields';

export type AllianzServiceLinksProps = AllianzProps & {
  serviceKind: 'account' | 'contact';
};
