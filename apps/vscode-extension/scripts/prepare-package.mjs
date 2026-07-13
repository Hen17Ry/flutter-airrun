import {
  createHash,
} from 'node:crypto';

import {
  constants,
} from 'node:fs';

import {
  access,
  chmod,
  copyFile,
  mkdir,
  readFile,
  rm,
  stat,
} from 'node:fs/promises';

import path from 'node:path';

import {
  fileURLToPath,
} from 'node:url';

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

const targets = {
  'linux-x64': {
    cliBinaryName:
      'airrun',

    posix:
      true,
  },

  'linux-arm64': {
    cliBinaryName:
      'airrun',

    posix:
      true,
  },

  'win32-x64': {
    cliBinaryName:
      'airrun.exe',

    posix:
      false,
  },

  'win32-arm64': {
    cliBinaryName:
      'airrun.exe',

    posix:
      false,
  },

  'darwin-x64': {
    cliBinaryName:
      'airrun',

    posix:
      true,
  },

  'darwin-arm64': {
    cliBinaryName:
      'airrun',

    posix:
      true,
  },
};

const targetId =
  process.env[
    'AIRRUN_TARGET'
  ]?.trim()
  || detectCurrentTarget();

const target =
  targets[targetId];

if (!target) {
  throw new Error(
    [
      `Cible Flutter AirRun inconnue : ${targetId}`,
      '',
      'Cibles disponibles :',
      ...Object.keys(targets)
        .map(
          value =>
            `- ${value}`,
        ),
    ].join('\n'),
  );
}

const cliSourcePath =
  path.join(
    repositoryRoot,
    'apps',
    'cli',
    'dist-bin',
    targetId,
    target.cliBinaryName,
  );

const packagedBinRoot =
  path.join(
    extensionRoot,
    'bin',
  );

const targetDirectory =
  path.join(
    packagedBinRoot,
    targetId,
  );

const cliTargetPath =
  path.join(
    targetDirectory,
    target.cliBinaryName,
  );

await requireFile(
  cliSourcePath,
  'CLI autonome AirRun',
);

/*
 * Chaque VSIX contient uniquement la CLI
 * autonome correspondant à sa plateforme.
 *
 * La génération QR sécurisée est maintenant
 * intégrée au code TypeScript de la CLI.
 */
await rm(
  packagedBinRoot,
  {
    recursive: true,
    force: true,
  },
);

await mkdir(
  targetDirectory,
  {
    recursive: true,
  },
);

await copyFile(
  cliSourcePath,
  cliTargetPath,
);

if (target.posix) {
  await chmod(
    cliTargetPath,
    0o755,
  );
}

console.log();
console.log(
  `Paquet Flutter AirRun préparé pour ${targetId}.`,
);

await printArtifact(
  'CLI AirRun autonome',
  cliSourcePath,
  cliTargetPath,
);

async function requireFile(
  filePath,
  label,
) {
  try {
    await access(
      filePath,
      constants.F_OK,
    );
  } catch {
    throw new Error(
      [
        `${label} introuvable.`,
        `Cible : ${targetId}`,
        `Chemin attendu : ${filePath}`,
        '',
        'Reconstruisez les exécutables avec :',
        'pnpm --filter @flutter-airrun/cli build:executables',
      ].join('\n'),
    );
  }
}

async function printArtifact(
  label,
  sourcePath,
  destinationPath,
) {
  const content =
    await readFile(
      destinationPath,
    );

  const metadata =
    await stat(
      destinationPath,
    );

  const checksum =
    createHash('sha256')
      .update(content)
      .digest('hex');

  console.log();
  console.log(label);

  console.log(
    `Source      : ${sourcePath}`,
  );

  console.log(
    `Destination : ${destinationPath}`,
  );

  console.log(
    `Taille      : ${metadata.size} octets`,
  );

  console.log(
    `SHA-256     : ${checksum}`,
  );
}

function detectCurrentTarget() {
  const key =
    `${process.platform}-${process.arch}`;

  if (
    Object.hasOwn(
      targets,
      key,
    )
  ) {
    return key;
  }

  throw new Error(
    [
      'La plateforme actuelle ne correspond à aucune cible AirRun.',
      `Détection : ${key}`,
      'Définissez AIRRUN_TARGET explicitement.',
    ].join('\n'),
  );
}
