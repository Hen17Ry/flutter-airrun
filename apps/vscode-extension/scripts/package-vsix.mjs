import {
  spawnSync,
} from 'node:child_process';

import {
  mkdir,
  readFile,
} from 'node:fs/promises';

import path from 'node:path';

import {
  fileURLToPath,
} from 'node:url';

const supportedTargets = [
  'linux-x64',
  'linux-arm64',
  'win32-x64',
  'win32-arm64',
  'darwin-x64',
  'darwin-arm64',
];

const scriptDirectory =
  path.dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );

const extensionRoot =
  path.resolve(
    scriptDirectory,
    '..',
  );

const repositoryRoot =
  path.resolve(
    extensionRoot,
    '..',
    '..',
  );

const target =
  process.argv
    .slice(2)
    .map(
      value =>
        value.trim(),
    )
    .find(
      value =>
        supportedTargets.includes(
          value,
        ),
    );

if (
  !target ||
  !supportedTargets.includes(
    target,
  )
) {
  throw new Error(
    [
      'Une cible valide est obligatoire.',
      '',
      'Exemple :',
      'pnpm run package:vsix -- linux-x64',
      '',
      'Cibles disponibles :',
      ...supportedTargets.map(
        value =>
          `- ${value}`,
      ),
    ].join('\n'),
  );
}

const packageJson =
  JSON.parse(
    await readFile(
      path.join(
        extensionRoot,
        'package.json',
      ),
      'utf8',
    ),
  );

const artifactsDirectory =
  path.join(
    repositoryRoot,
    'artifacts',
  );

await mkdir(
  artifactsDirectory,
  {
    recursive: true,
  },
);

const outputPath =
  path.join(
    artifactsDirectory,
    [
      'flutter-airrun',
      packageJson.version,
      target,
    ].join('-') + '.vsix',
  );

console.log(
  `Création du VSIX ${target}…`,
);

const result =
  spawnSync(
    'pnpm',
    [
      'exec',
      'vsce',
      'package',
      '--target',
      target,
      '--no-dependencies',
      '--allow-missing-repository',
      '--out',
      outputPath,
    ],
    {
      cwd:
        extensionRoot,

      stdio:
        'inherit',

      env: {
        ...process.env,

        AIRRUN_TARGET:
          target,
      },
    },
  );

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  throw new Error(
    `Le packaging ${target} a échoué avec le code ${result.status}.`,
  );
}

console.log();
console.log(
  `VSIX créé : ${outputPath}`,
);
