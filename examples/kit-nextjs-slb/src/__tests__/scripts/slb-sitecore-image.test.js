const path = require('node:path');
const {
  loadSlbDamAssetDescriptors,
  serializeSitecoreDamImage,
} = require('../../../scripts/lib/slb-sitecore-image.cjs');

describe('SLB Sitecore DAM image serialization', () => {
  it('loads structurally complete descriptors from the shared catalog', () => {
    const descriptors = loadSlbDamAssetDescriptors(
      path.join(process.cwd(), 'src', 'content', 'slb-dam-assets.json'),
    );

    expect(descriptors.size).toBeGreaterThan(0);
    for (const descriptor of descriptors.values()) {
      expect(descriptor).toEqual({
        publicUrl: expect.stringMatching(
          /^https:\/\/thlt-demo\.sitecoresandbox\.cloud\/api\/public\/content\//,
        ),
        damId: expect.any(Number),
        contentType: 'Image',
        width: expect.any(Number),
        height: expect.any(Number),
      });
      expect(Number.isSafeInteger(descriptor.damId)).toBe(true);
      expect(descriptor.width).toBeGreaterThan(0);
      expect(descriptor.height).toBeGreaterThan(0);
    }
  });

  it('emits every Content Hub attribute required by a Sitecore image field', () => {
    const descriptor = {
      publicUrl:
        'https://thlt-demo.sitecoresandbox.cloud/api/public/content/asset?v=1&download=0',
      damId: 114111,
      contentType: 'Image',
      width: 1416,
      height: 1140,
    };

    expect(
      serializeSitecoreDamImage(
        { filename: 'energy.jpg', alt: 'Energy & innovation' },
        new Map([['energy.jpg', descriptor]]),
      ),
    ).toBe(
      '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/asset?v=1&amp;download=0" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/asset?v=1&amp;download=0" dam-id="114111" dam-content-type="Image" width="1416" height="1140" alt="Energy &amp; innovation" />',
    );
  });

  it('rejects a referenced image without a Content Hub descriptor', () => {
    expect(() =>
      serializeSitecoreDamImage(
        { filename: 'missing.jpg', alt: 'Missing' },
        new Map(),
      ),
    ).toThrow(
      'Missing Content Hub DAM descriptor for referenced content image: missing.jpg',
    );
  });
});
