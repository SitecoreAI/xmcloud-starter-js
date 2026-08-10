export type PaperlessOptInSearchValue = string | string[] | undefined;

export const isPaperlessOptInRequest = (
  contentPath: string,
  paperless: PaperlessOptInSearchValue,
) =>
  contentPath === '/account-billing' &&
  (Array.isArray(paperless)
    ? paperless.includes('opt-in')
    : paperless === 'opt-in');
