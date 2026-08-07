import fs from 'node:fs';
import path from 'node:path';

const RUNTIME_EXTENSIONS = new Set(['.css', '.js', '.jsx', '.ts', '.tsx']);

const collectRuntimeFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : collectRuntimeFiles(filePath);
    }

    return RUNTIME_EXTENSIONS.has(path.extname(entry.name)) ? [filePath] : [];
  });

describe('SiEnergy runtime brand isolation', () => {
  it('does not contain NW Natural branding, domains, or phone numbers', () => {
    const sourceRoot = path.resolve(process.cwd(), 'src');
    const forbiddenValues = [
      'NW Natural',
      'nwnatural.com',
      '800-422-4012',
      '800-882-3377',
    ];
    const offenders = collectRuntimeFiles(sourceRoot).flatMap((filePath) => {
      const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
      const matches = forbiddenValues.filter((value) =>
        content.includes(value.toLowerCase()),
      );

      return matches.length > 0
        ? [`${path.relative(sourceRoot, filePath)}: ${matches.join(', ')}`]
        : [];
    });

    expect(offenders).toEqual([]);
  });
});
