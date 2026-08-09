/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  createSitecoreAiUdlDemoJsonl,
  SITECOREAI_UDL_DEMO_PROFILES,
} from '../../../scripts/generate-sitecoreai-udl-demo-profiles';

describe('SitecoreAI UDL demo profiles', () => {
  it('provides ten deterministic realistic profiles with a 6/4 paperless split', () => {
    expect(SITECOREAI_UDL_DEMO_PROFILES).toHaveLength(10);
    expect(
      SITECOREAI_UDL_DEMO_PROFILES.map((record) => record.identifiers[0].id),
    ).toEqual(
      Array.from(
        { length: 10 },
        (_, index) =>
          `nwn-demo-${String(index + 1).padStart(2, '0')}@example.com`,
      ),
    );
    expect(
      SITECOREAI_UDL_DEMO_PROFILES.filter(
        (record) => !record.extensions.paperless,
      ),
    ).toHaveLength(6);
    expect(
      SITECOREAI_UDL_DEMO_PROFILES.filter(
        (record) => record.extensions.paperless,
      ),
    ).toHaveLength(4);
    expect(
      SITECOREAI_UDL_DEMO_PROFILES.every(
        (record) =>
          record.recordType === 'profile' &&
          record.identifiers[0].provider === 'email' &&
          record.contact.firstName.length > 2 &&
          record.contact.lastName.length > 2,
      ),
    ).toBe(true);
  });

  it('keeps the upload-ready JSONL artifact synchronized with the generator', () => {
    const artifact = readFileSync(
      resolve('scripts/nwn-sitecoreai-udl-demo-profiles.jsonl'),
      'utf8',
    );

    expect(artifact).toBe(createSitecoreAiUdlDemoJsonl());
    for (const line of artifact.trim().split('\n')) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
