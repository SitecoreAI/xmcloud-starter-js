import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

/** Captured raw evidence is retained; Git may materialize the same text as LF. */
export const sourceWitnessEvidence = {
  profile: {
    path: 'newsroom-company-profile/__tests__/newsroom-company-profile.source.html',
    rawSha256: '2000cd3504a5c6d07f6986eb31d5d1654b4d27b9d3b81510d4049e3f5a3ed07f',
    rawBytes: 5003,
    canonicalSha256: '42def0b6ebdd4050d7ad75193538ef686b9a67293d34f7f49d13bc6bc1152f9c',
    canonicalBytes: 4984,
  },
  hero: {
    path: 'company-hero/__tests__/newsroom-short.source.html',
    rawSha256: '18ce8a2d87da47de2f4f1d648d2cd82ed656672b5fff7d4c6a8c6defac0534a1',
    rawBytes: 1368,
    canonicalSha256: 'b69f2315b029fc8d61af67bd1ff29e19af37316e755839f11ef06e50e30785df',
    canonicalBytes: 1352,
  },
  grey: {
    path: 'legal-disclosures/__tests__/newsroom-grey.source.html',
    rawSha256: 'c07a67444e4efedc5ea37c7083afe757d0af9b968d76dee7b9a4585b9f935aaa',
    rawBytes: 2281,
    canonicalSha256: 'c6a5790945bddd61456bf7bb49cf82feb283be2445dac15fe17653d9ac1aaddd',
    canonicalBytes: 2267,
  },
  trailing: {
    path: 'legal-disclosures/__tests__/newsroom-trailing-wrapper.source.html',
    rawSha256: 'ab86afc46fa17dd7ac05a07693b48c285655e7e796e890a69a48887aa81fc7ca',
    rawBytes: 395,
    canonicalSha256: '6e11e26af9d3abf703435bb106a724e450d3867e7c3364250fae5acbd3cf6426',
    canonicalBytes: 392,
  },
};

/** Normalize only CRLF pairs; every other byte, including bare CR, is significant. */
export function canonicalWitnessDigest(source) {
  const canonical = source.replace(/\r\n/g, '\n');
  return {
    sha256: createHash('sha256').update(canonical).digest('hex'),
    bytes: Buffer.byteLength(canonical, 'utf8'),
  };
}

export function assertSourceWitness(source, evidence) {
  const canonical = canonicalWitnessDigest(source);
  assert.equal(canonical.sha256, evidence.canonicalSha256, `${evidence.path}: strict canonical SHA-256`);
  assert.equal(canonical.bytes, evidence.canonicalBytes, `${evidence.path}: strict canonical byte count`);
}
