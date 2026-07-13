import {
  chmod,
  mkdir,
} from 'node:fs/promises';

import {
  build,
} from 'esbuild';

const outputDirectory =
  new URL('./dist/', import.meta.url);

const outputFile =
  new URL(
    './dist/airrun.cjs',
    import.meta.url,
  );

await mkdir(
  outputDirectory,
  {
    recursive: true,
  },
);

await build({
  entryPoints: [
    new URL(
      './src/index.ts',
      import.meta.url,
    ).pathname,
  ],
  outfile: outputFile.pathname,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  logLevel: 'info',
});

await chmod(
  outputFile,
  0o755,
);
