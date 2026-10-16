/** Offline-only producer. Run after the renderer is ready; start no server/browser. */
import fs from 'node:fs';
import path from 'node:path';
import { assets, localFixtureHTML } from './icon-appearance-fixture.mjs';

const destination = process.argv[2];
if (!destination) throw new Error('Pass the output HTML path; its adjacent assets/ directory must contain the supplied SVG copies.');
const out = path.resolve(destination);
for (const asset of assets) {
  const file = path.join(path.dirname(out), 'assets', `${asset.slug}.svg`);
  if (!fs.existsSync(file)) throw new Error(`Missing local source SVG transport copy: ${asset.slug}`);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, localFixtureHTML());
fs.writeFileSync(out.replace(/\.html$/i, '') + '.receipt.json', JSON.stringify({
  html: path.basename(out), kind: 'offline actual-SDK presentation fixture', nativeAcceptance: false,
  browserStarted: false, devServerStarted: false, externalRequestsPerformed: false,
  sourceAssets: assets.map(asset => ({ source: asset.src, local: `assets/${asset.slug}.svg` })),
  syntheticCardOrderAndOwners: true,
}, null, 2) + '\n');
console.log(JSON.stringify({ fixtureWritten: out, browserStarted: false, nativeAcceptance: false }));
