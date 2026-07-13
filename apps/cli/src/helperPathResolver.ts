import {
  constants,
} from 'node:fs';

import {
  access,
} from 'node:fs/promises';

import * as path from 'node:path';

export interface CliHelperResolution {
  executablePath: string | null;
  checkedPaths: readonly string[];
}

export async function resolveCliHelperPath():
  Promise<CliHelperResolution> {
  const binaryName =
    process.platform === 'win32'
      ? 'airrun-pair-helper.exe'
      : 'airrun-pair-helper';

  const platformDirectory =
    `${normalizePlatform()}-${normalizeArchitecture()}`;

  const candidates: string[] = [];

  const configuredPath =
    process.env[
      'FLUTTER_AIRRUN_HELPER_PATH'
    ]?.trim();

  if (configuredPath) {
    candidates.push(
      path.resolve(
        configuredPath,
      ),
    );
  }

  /*
   * Cas où la commande est exécutée depuis
   * la racine du dépôt.
   */
  candidates.push(
    path.resolve(
      process.cwd(),
      'native',
      'airrun-pair-helper',
      'build',
      binaryName,
    ),
  );

  /*
   * Cas du bundle de développement :
   * apps/cli/dist/airrun.cjs
   */
  candidates.push(
    path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'native',
      'airrun-pair-helper',
      'build',
      binaryName,
    ),
  );

  /*
   * Emplacements prévus pour les futures
   * versions distribuées.
   */
  candidates.push(
    path.resolve(
      __dirname,
      '..',
      'bin',
      platformDirectory,
      binaryName,
    ),
  );

  candidates.push(
    path.resolve(
      __dirname,
      'bin',
      platformDirectory,
      binaryName,
    ),
  );

  const uniqueCandidates =
    [...new Set(candidates)];

  for (
    const candidate of
    uniqueCandidates
  ) {
    if (
      await isExecutable(
        candidate,
      )
    ) {
      return {
        executablePath:
          candidate,
        checkedPaths:
          uniqueCandidates,
      };
    }
  }

  return {
    executablePath: null,
    checkedPaths:
      uniqueCandidates,
  };
}

async function isExecutable(
  executablePath: string,
): Promise<boolean> {
  try {
    await access(
      executablePath,
      process.platform === 'win32'
        ? constants.F_OK
        : constants.X_OK,
    );

    return true;
  } catch {
    return false;
  }
}

function normalizePlatform(): string {
  switch (process.platform) {
    case 'win32':
      return 'windows';

    case 'darwin':
      return 'macos';

    case 'linux':
      return 'linux';

    default:
      return process.platform;
  }
}

function normalizeArchitecture(): string {
  switch (process.arch) {
    case 'x64':
      return 'x86_64';

    case 'arm64':
      return 'arm64';

    case 'ia32':
      return 'x86';

    default:
      return process.arch;
  }
}
