import {
  createHash,
} from 'node:crypto';

import {
  spawnSync,
} from 'node:child_process';

import {
  access,
  chmod,
  mkdir,
  readFile,
  rm,
  stat,
} from 'node:fs/promises';

import {
  constants,
} from 'node:fs';

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

const cliRoot =
  path.resolve(
    scriptDirectory,
    '..',
  );

const entryPath =
  path.join(
    cliRoot,
    'dist',
    'airrun.cjs',
  );

const outputRoot =
  path.join(
    cliRoot,
    'dist-bin',
  );

const targets = [
  {
    id: 'linux-x64',
    bunTarget:
      'bun-linux-x64-baseline',
    fileName:
      'airrun',
  },
  {
    id: 'linux-arm64',
    bunTarget:
      'bun-linux-arm64',
    fileName:
      'airrun',
  },
  {
    id: 'win32-x64',
    bunTarget:
      'bun-windows-x64-baseline',
    fileName:
      'airrun.exe',
  },
  {
    id: 'win32-arm64',
    bunTarget:
      'bun-windows-arm64',
    fileName:
      'airrun.exe',
  },
  {
    id: 'darwin-x64',
    bunTarget:
      'bun-darwin-x64',
    fileName:
      'airrun',
  },
  {
    id: 'darwin-arm64',
    bunTarget:
      'bun-darwin-arm64',
    fileName:
      'airrun',
  },
];

await requireEntry();

await rm(
  outputRoot,
  {
    recursive: true,
    force: true,
  },
);

await mkdir(
  outputRoot,
  {
    recursive: true,
  },
);

for (const target of targets) {
  await buildTarget(target);
}

console.log();
console.log(
  'Toutes les CLI Flutter AirRun ont été générées.',
);

async function requireEntry() {
  try {
    await access(
      entryPath,
      constants.F_OK,
    );
  } catch {
    throw new Error(
      [
        'Le bundle JavaScript de la CLI est absent.',
        `Chemin attendu : ${entryPath}`,
        '',
        'Exécute d’abord :',
        'pnpm --filter @flutter-airrun/cli build',
      ].join('\n'),
    );
  }
}

async function buildTarget(target) {
  const targetDirectory =
    path.join(
      outputRoot,
      target.id,
    );

  const outputPath =
    path.join(
      targetDirectory,
      target.fileName,
    );

  await mkdir(
    targetDirectory,
    {
      recursive: true,
    },
  );

  console.log();
  console.log(
    `Construction de ${target.id}…`,
  );

  const result =
    spawnSync(
      'bun',
      [
        'build',
        '--compile',
        '--minify',
        '--no-compile-autoload-dotenv',
        '--no-compile-autoload-bunfig',
        `--target=${target.bunTarget}`,
        entryPath,
        '--outfile',
        outputPath,
      ],
      {
        cwd:
          cliRoot,

        stdio:
          'inherit',

        env:
          process.env,
      },
    );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      [
        `La construction ${target.id} a échoué.`,
        `Code de sortie : ${result.status}`,
      ].join('\n'),
    );
  }

  if (
    !target.id.startsWith(
      'win32-',
    )
  ) {
    await chmod(
      outputPath,
      0o755,
    );
  }

  await printArtifact(
    target.id,
    outputPath,
  );
}

async function printArtifact(
  target,
  outputPath,
) {
  const data =
    await readFile(
      outputPath,
    );

  const metadata =
    await stat(
      outputPath,
    );

  const checksum =
    createHash('sha256')
      .update(data)
      .digest('hex');

  console.log(
    `Cible       : ${target}`,
  );

  console.log(
    `Fichier     : ${outputPath}`,
  );

  console.log(
    `Taille      : ${metadata.size} octets`,
  );

  console.log(
    `SHA-256     : ${checksum}`,
  );
}
