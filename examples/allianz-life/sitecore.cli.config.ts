import { defineCliConfig } from '@sitecore-content-sdk/nextjs/config-cli';
import {
  generateSites,
  generateMetadata,
  extractFiles,
  writeImportMap,
} from '@sitecore-content-sdk/nextjs/tools';
import scConfig from './sitecore.config';

// Import maps are local TypeScript artifacts required even by the disconnected
// fixture build. Keep remote discovery/extraction disabled while allowing this
// one local-only SDK generator to run from a clean checkout.
const generateImportMaps = writeImportMap({
  paths: ['src/components'],
  exclude: ['src/components/**/*.props.ts', 'src/components/**/*.props.tsx'],
});
const generateLocalImportMaps = (context: Parameters<typeof generateImportMaps>[0]) =>
  generateImportMaps({
    ...context,
    scConfig: { ...context.scConfig, disableCodeGeneration: false },
  });

export default defineCliConfig({
  config: scConfig,
  build: {
    commands: [
      generateMetadata(),
      generateSites(),
      extractFiles(),
      generateLocalImportMaps,
    ],
  },
  componentMap: {
    paths: ['src/components'],
    exclude: ['src/components/content-sdk/*', 'src/components/**/*.props.ts', 'src/components/**/*.props.tsx'],
  },
});
