import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { assertSourceWitness, canonicalWitnessDigest, sourceWitnessEvidence } from './source-witness-hash.mjs';

test('strict witness hashing accepts LF and CRLF only, rejecting spaces, removed characters and bare CR', () => {
  for (const evidence of Object.values(sourceWitnessEvidence)) {
    const source = fs.readFileSync(new URL(`../../${evidence.path}`, import.meta.url), 'utf8');
    const lf = source.replace(/\r\n/g, '\n');
    const crlf = lf.replace(/\n/g, '\r\n');
    assert.deepEqual(canonicalWitnessDigest(lf), canonicalWitnessDigest(crlf), evidence.path);
    assertSourceWitness(source, evidence);
    assertSourceWitness(lf, evidence);
    assertSourceWitness(crlf, evidence);
    for (const altered of [`${lf} `, lf.slice(1), lf.replace('\n', '\r')]) {
      assert.throws(() => assertSourceWitness(altered, evidence), /strict canonical SHA-256/, evidence.path);
    }
    assert.match(evidence.rawSha256, /^[a-f0-9]{64}$/);
    assert.ok(evidence.rawBytes > evidence.canonicalBytes, `${evidence.path}: captured CRLF evidence retained`);
  }
});
