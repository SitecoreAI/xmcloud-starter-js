import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAppRoot } from './runtime-paths.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const app = resolveAppRoot();
const routes = new Map([
  ['/', path.join(root, 'dist/index.html')], ['/index.html', path.join(root, 'dist/index.html')],
  ['/harness.js', path.join(root, 'dist/harness.js')], ['/harness.css', path.join(root, 'dist/harness.css')],
  ['/harness.js.map', path.join(root, 'dist/harness.js.map')],
  ['/global-source.css', path.join(app, 'src/assets/allianz-source.css')],
]);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.map': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const port = Number(process.env.LIFE_UI_PORT || 4196);
const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = routes.get(pathname) || (/^\/fonts\/allianz-neo\/[A-Za-z0-9-]+\.woff2?$/.test(pathname)
    ? path.join(app, 'public', pathname) : undefined);
  if (!file) { response.writeHead(404).end(); return; }
  try {
    const bytes = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-src 'self'; object-src 'none'; base-uri 'none'" });
    response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
server.listen(port, 'localhost', () => console.log(`Private QA only: http://localhost:${port}`));
