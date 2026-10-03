/** Samples are an explicit local-development/test option; deployed apps use Sitecore. */
export function usesFixtureContent(): boolean {
  return process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE === 'fixture' &&
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');
}

export const isConnected = (): boolean => !usesFixtureContent();
