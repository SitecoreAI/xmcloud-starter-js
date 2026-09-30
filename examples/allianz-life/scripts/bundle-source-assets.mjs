import { readFile, mkdir, copyFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, resolve, join } from 'node:path';

// Local verified public evidence only. This script performs no network requests.
const sourceRoot = resolve(process.argv[2] || '../../../../public-site');
const publicRoot = resolve('public/allianz-assets');
await mkdir(publicRoot, { recursive: true });
const results = [];
for (const [file, key] of [['asset_download_manifest.json', 'assets'], ['document_download_manifest.json', 'documents']]) {
  const manifest = JSON.parse(await readFile(join(sourceRoot, file), 'utf8'));
  for (const entry of manifest[key]) {
    if (entry.status !== 'available' || !entry.body_saved) continue;
    const source = resolve(sourceRoot, entry.local_path);
    if (!source.startsWith(sourceRoot + '/')) throw new Error('Evidence path escaped source directory');
    const bytes = await readFile(source);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== entry.sha256) throw new Error(`Hash mismatch: ${basename(source)}`);
    const targetName = entry.demoSrc ? basename(entry.demoSrc) : basename(source);
    const target = join(publicRoot, targetName);
    await copyFile(source, target);
    results.push({ sourceUrl: entry.sourceUrl || entry.url, path: `/allianz-assets/${targetName}`, bytes: (await stat(target)).size, sha256: hash });
  }
}
await writeFile('source-asset-bundle.json', JSON.stringify({ sourceHost: 'www.allianzlife.com', files: results }, null, 2) + '\n');
console.log(JSON.stringify({ files: results.length, bytes: results.reduce((sum, file) => sum + file.bytes, 0), manifest: 'source-asset-bundle.json' }));
