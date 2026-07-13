import * as esbuild from 'esbuild';

const isWatchMode = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  sourcemap: true,
  logLevel: 'info'
};

if (isWatchMode) {
  const context = await esbuild.context(buildOptions);

  await context.watch();

  console.log('[Flutter AirRun] Watching source files...');
} else {
  await esbuild.build(buildOptions);
}
