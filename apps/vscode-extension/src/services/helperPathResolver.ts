import { constants } from 'node:fs';
import { access, chmod } from 'node:fs/promises';
import * as path from 'node:path';

import * as vscode from 'vscode';

export interface HelperPathResolution {
  executablePath: string | null;
  checkedPaths: readonly string[];
  source:
    | 'configuration'
    | 'bundled'
    | 'development'
    | 'not-found';
}

export async function resolveHelperPath(
  context: vscode.ExtensionContext,
): Promise<HelperPathResolution> {
  const binaryName =
    process.platform === 'win32'
      ? 'airrun-pair-helper.exe'
      : 'airrun-pair-helper';

  const checkedPaths: string[] = [];

  const configuredPath =
    vscode.workspace
      .getConfiguration('flutterAirRun')
      .get<string>('helperPath')
      ?.trim();

  if (configuredPath) {
    const normalizedConfiguredPath =
      path.resolve(configuredPath);

    checkedPaths.push(
      normalizedConfiguredPath,
    );

    if (
      await isExecutable(
        normalizedConfiguredPath,
      )
    ) {
      return {
        executablePath:
          normalizedConfiguredPath,
        checkedPaths,
        source: 'configuration',
      };
    }
  }

  const platformDirectory =
    `${normalizePlatform()}-${normalizeArchitecture()}`;

  const bundledPath = path.join(
    context.extensionPath,
    'bin',
    platformDirectory,
    binaryName,
  );

  checkedPaths.push(bundledPath);

  await ensureBundledExecutable(
    bundledPath,
  );

  if (await isExecutable(bundledPath)) {
    return {
      executablePath: bundledPath,
      checkedPaths,
      source: 'bundled',
    };
  }

  /*
   * En développement, extensionPath pointe vers :
   * apps/vscode-extension
   *
   * Le helper se trouve dans :
   * native/airrun-pair-helper/build
   */
  const developmentPath = path.resolve(
    context.extensionPath,
    '..',
    '..',
    'native',
    'airrun-pair-helper',
    'build',
    binaryName,
  );

  checkedPaths.push(developmentPath);

  if (await isExecutable(developmentPath)) {
    return {
      executablePath: developmentPath,
      checkedPaths,
      source: 'development',
    };
  }

  return {
    executablePath: null,
    checkedPaths,
    source: 'not-found',
  };
}

async function ensureBundledExecutable(
  executablePath: string,
): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }

  try {
    await access(
      executablePath,
      constants.F_OK,
    );

    await chmod(
      executablePath,
      0o755,
    );
  } catch {
    /*
     * Le chemin absent sera ensuite traité
     * normalement par isExecutable().
     */
  }
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
