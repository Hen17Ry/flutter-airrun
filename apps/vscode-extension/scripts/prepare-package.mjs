import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { constants } from 'node:fs';

import {
  access,
  chmod,
  copyFile,
  mkdir,
  readFile,
  stat,
} from 'node:fs/promises';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

if (
  process.platform !== 'linux' ||
  process.arch !== 'x64'
) {
  throw new Error(
    [
      'Ce premier paquet supporte uniquement Linux x86-64.',
      `Plateforme actuelle : ${process.platform}-${process.arch}`,
    ].join('\n'),
  );
}

const sourcePath =
  path.join(
    repositoryRoot,
    'native',
    'airrun-pair-helper',
    'build',
    'airrun-pair-helper',
  );

const targetDirectory =
  path.join(
    extensionRoot,
    'bin',
    'linux-x86_64',
  );

const targetPath =
  path.join(
    targetDirectory,
    'airrun-pair-helper',
  );

try {
  await access(
    sourcePath,
    constants.X_OK,
  );
} catch {
  throw new Error(
    [
      'Le helper natif est absent ou non exécutable.',
      `Chemin attendu : ${sourcePath}`,
      '',
      'Compile-le avec :',
      'pnpm helper:build',
    ].join('\n'),
  );
}

await mkdir(
  targetDirectory,
  {
    recursive: true,
  },
);

await copyFile(
  sourcePath,
  targetPath,
);

await chmod(
  targetPath,
  0o755,
);

/*
 * Le binaire de développement contient encore
 * ses symboles de débogage. Nous les retirons
 * uniquement de la copie distribuée.
 */
const stripResult =
  spawnSync(
    'strip',
    [
      '--strip-unneeded',
      targetPath,
    ],
    {
      stdio: 'inherit',
    },
  );

if (
  stripResult.error &&
  stripResult.error.code !==
    'ENOENT'
) {
  throw stripResult.error;
}

if (
  stripResult.error?.code ===
  'ENOENT'
) {
  console.warn(
    'Avertissement : strip est absent, le binaire ne sera pas allégé.',
  );
}

if (
  stripResult.status !== null &&
  stripResult.status !== 0
) {
  console.warn(
    `Avertissement : strip a retourné le code ${stripResult.status}.`,
  );
}

await chmod(
  targetPath,
  0o755,
);

const binary =
  await readFile(
    targetPath,
  );

const metadata =
  await stat(
    targetPath,
  );

const checksum =
  createHash('sha256')
    .update(binary)
    .digest('hex');

console.log();
console.log(
  'Helper Flutter AirRun préparé.',
);

console.log(
  `Source      : ${sourcePath}`,
);

console.log(
  `Destination : ${targetPath}`,
);

console.log(
  `Taille      : ${metadata.size} octets`,
);

console.log(
  `SHA-256     : ${checksum}`,
);
