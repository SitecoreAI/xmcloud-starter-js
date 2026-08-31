import rawDamAssets from '@/content/slb-dam-assets.json';

export type SlbDamAssetDescriptor = Readonly<{
  publicUrl: string;
  damId: number;
  contentType: 'Image';
  width: number;
  height: number;
}>;

type RawDamAssetDescriptor = Omit<SlbDamAssetDescriptor, 'contentType'> & {
  contentType: string;
};

function validateDamAssetDescriptor(
  filename: string,
  descriptor: RawDamAssetDescriptor,
): SlbDamAssetDescriptor {
  if (
    !descriptor.publicUrl.startsWith(
      'https://thlt-demo.sitecoresandbox.cloud/api/public/content/',
    ) ||
    !Number.isSafeInteger(descriptor.damId) ||
    descriptor.damId <= 0 ||
    descriptor.contentType !== 'Image' ||
    !Number.isSafeInteger(descriptor.width) ||
    descriptor.width <= 0 ||
    !Number.isSafeInteger(descriptor.height) ||
    descriptor.height <= 0
  ) {
    throw new Error(`Invalid Content Hub DAM descriptor for ${filename}`);
  }

  return Object.freeze({
    ...descriptor,
    contentType: 'Image' as const,
  });
}

/**
 * Content Hub metadata required by Sitecore image fields.
 *
 * Filenames are the stable content key shared by English and es-MX; alt text
 * remains locale-specific in the page content catalog.
 */
export const slbDamAssets: Readonly<Record<string, SlbDamAssetDescriptor>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(rawDamAssets).map(([filename, descriptor]) => [
        filename,
        validateDamAssetDescriptor(filename, descriptor),
      ]),
    ),
  );

const slbBrandAssetUrls: Readonly<Record<string, string>> = Object.freeze({
  'slb-logo-positive-blue.svg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/6c243fbaffa74bf2b8b8d038894409cd?v=2d0f1d15',
});

/** Backward-compatible URL map used by existing runtime components. */
export const slbDamAssetUrls: Readonly<Record<string, string>> = Object.freeze({
  ...Object.fromEntries(
    Object.entries(slbDamAssets).map(([filename, descriptor]) => [
      filename,
      descriptor.publicUrl,
    ]),
  ),
  ...slbBrandAssetUrls,
});

export function getSlbDamAssetUrl(filename: string): string {
  return slbDamAssetUrls[filename] ?? `/images/slb/${filename}`;
}
