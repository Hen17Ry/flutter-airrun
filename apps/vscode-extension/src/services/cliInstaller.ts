import {
  execFile,
} from 'node:child_process';

import {
  constants,
} from 'node:fs';

import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';

import {
  homedir,
} from 'node:os';

import * as path from 'node:path';

import {
  promisify,
} from 'node:util';

import * as vscode from 'vscode';

import {
  getAirRunPlatformInfo,
} from './platformTarget';

const execFileAsync =
  promisify(execFile);

const MANAGED_MARKER =
  '# Flutter AirRun managed launcher';

export interface AirRunCliStatus {
  installed: boolean;
  current: boolean;
  cliInstalled: boolean;
  launcherExists: boolean;
  launcherManaged: boolean;
  installedVersion: string | null;
  bundledVersion: string;
  launcherPath: string;
  cliPath: string;
  binDirectory: string;
  binDirectoryInPath: boolean;
  target: string;
}

interface CliPaths {
  target: string;
  bundledCliPath: string;
  applicationDirectory: string;
  installDirectory: string;
  commandDirectory: string;
  installedCliPath: string;
  launcherPath: string;
  versionPath: string;
  pathMarkerPath: string;
  isWindows: boolean;
}

export class ExistingCliConflictError
  extends Error {
  public constructor(
    public readonly launcherPath:
      string,
  ) {
    super(
      [
        'Une autre commande airrun existe déjà.',
        launcherPath,
      ].join('\n'),
    );

    this.name =
      'ExistingCliConflictError';
  }
}

export async function getCliStatus(
  context: vscode.ExtensionContext,
): Promise<AirRunCliStatus> {
  const paths =
    getCliPaths(context);

  const cliInstalled =
    await pathExists(
      paths.installedCliPath,
    );

  const launcherExists =
    await pathExists(
      paths.launcherPath,
    );

  const launcherManaged =
    paths.isWindows
      ? launcherExists &&
        cliInstalled
      : launcherExists &&
        await isManagedLauncher(
          paths.launcherPath,
        );

  const installedVersion =
    await readInstalledVersion(
      paths.versionPath,
    );

  const bundledVersion =
    getBundledVersion(context);

  const installed =
    cliInstalled &&
    launcherExists &&
    launcherManaged;

  return {
    installed,

    current:
      installed &&
      installedVersion ===
        bundledVersion,

    cliInstalled,
    launcherExists,
    launcherManaged,
    installedVersion,
    bundledVersion,

    launcherPath:
      paths.launcherPath,

    cliPath:
      paths.installedCliPath,

    binDirectory:
      paths.commandDirectory,

    binDirectoryInPath:
      isDirectoryInPath(
        paths.commandDirectory,
      ),

    target:
      paths.target,
  };
}

export async function installCli(
  context: vscode.ExtensionContext,
  replaceExisting = false,
): Promise<AirRunCliStatus> {
  const paths =
    getCliPaths(context);

  await requireBundledFile(
    paths.bundledCliPath,
    'CLI AirRun',
  );

  if (!paths.isWindows) {
    const launcherExists =
      await pathExists(
        paths.launcherPath,
      );

    const launcherManaged =
      launcherExists
        ? await isManagedLauncher(
            paths.launcherPath,
          )
        : false;

    if (
      launcherExists &&
      !launcherManaged &&
      !replaceExisting
    ) {
      throw new ExistingCliConflictError(
        paths.launcherPath,
      );
    }

    if (
      launcherExists &&
      !launcherManaged &&
      replaceExisting
    ) {
      await rm(
        paths.launcherPath,
        {
          force: true,
        },
      );
    }
  }

  await mkdir(
    paths.installDirectory,
    {
      recursive: true,
    },
  );

  await copyFile(
    paths.bundledCliPath,
    paths.installedCliPath,
  );

  if (!paths.isWindows) {
    await chmod(
      paths.installedCliPath,
      0o755,
    );

    await mkdir(
      paths.commandDirectory,
      {
        recursive: true,
      },
    );

    await writeFile(
      paths.launcherPath,
      createPosixLauncher(
        paths.installedCliPath,
      ),
      {
        encoding: 'utf8',
        mode: 0o755,
      },
    );

    await chmod(
      paths.launcherPath,
      0o755,
    );
  }

  await writeFile(
    paths.versionPath,
    `${getBundledVersion(context)}\n`,
    'utf8',
  );

  return getCliStatus(context);
}

export async function uninstallCli(
  context: vscode.ExtensionContext,
): Promise<void> {
  const paths =
    getCliPaths(context);

  if (
    !paths.isWindows &&
    await isManagedLauncher(
      paths.launcherPath,
    )
  ) {
    await rm(
      paths.launcherPath,
      {
        force: true,
      },
    );
  }

  if (
    paths.isWindows &&
    await pathExists(
      paths.pathMarkerPath,
    )
  ) {
    await removeWindowsUserPath(
      paths.commandDirectory,
    );
  }

  await rm(
    paths.applicationDirectory,
    {
      recursive: true,
      force: true,
    },
  );
}

export async function addCliDirectoryToUserPath(
  context: vscode.ExtensionContext,
): Promise<void> {
  const paths =
    getCliPaths(context);

  if (!paths.isWindows) {
    throw new Error(
      [
        'L’ajout automatique au PATH est utilisé uniquement sous Windows.',
        'Sous Linux et macOS, la commande est installée dans ~/.local/bin.',
      ].join(' '),
    );
  }

  await addWindowsUserPath(
    paths.commandDirectory,
  );

  await writeFile(
    paths.pathMarkerPath,
    'managed\n',
    'utf8',
  );

  appendCurrentProcessPath(
    paths.commandDirectory,
  );
}

export function getCliLauncherPath(
  context: vscode.ExtensionContext,
): string {
  return getCliPaths(
    context,
  ).launcherPath;
}

function getCliPaths(
  context: vscode.ExtensionContext,
): CliPaths {
  const platform =
    getAirRunPlatformInfo();

  const homeDirectory =
    homedir();

  const applicationDirectory =
    resolveApplicationDirectory(
      homeDirectory,
    );

  const installDirectory =
    path.join(
      applicationDirectory,
      'bin',
    );

  const commandDirectory =
    platform.isWindows
      ? installDirectory
      : path.join(
          homeDirectory,
          '.local',
          'bin',
        );

  const installedCliPath =
    path.join(
      installDirectory,
      platform.cliBinaryName,
    );

  return {
    target:
      platform.target,

    bundledCliPath:
      path.join(
        context.extensionPath,
        'bin',
        platform.target,
        platform.cliBinaryName,
      ),

    applicationDirectory,
    installDirectory,
    commandDirectory,
    installedCliPath,

    launcherPath:
      platform.isWindows
        ? installedCliPath
        : path.join(
            commandDirectory,
            'airrun',
          ),

    versionPath:
      path.join(
        applicationDirectory,
        'version',
      ),

    pathMarkerPath:
      path.join(
        applicationDirectory,
        'path-managed',
      ),

    isWindows:
      platform.isWindows,
  };
}

function resolveApplicationDirectory(
  homeDirectory: string,
): string {
  switch (process.platform) {
    case 'linux':
      return path.join(
        homeDirectory,
        '.local',
        'share',
        'flutter-airrun',
      );

    case 'darwin':
      return path.join(
        homeDirectory,
        'Library',
        'Application Support',
        'Flutter AirRun',
      );

    case 'win32': {
      const localAppData =
        process.env['LOCALAPPDATA']
        ?? path.join(
          homeDirectory,
          'AppData',
          'Local',
        );

      return path.join(
        localAppData,
        'FlutterAirRun',
      );
    }

    default:
      throw new Error(
        `Plateforme non prise en charge : ${process.platform}`,
      );
  }
}

function getBundledVersion(
  context: vscode.ExtensionContext,
): string {
  const packageJson: unknown =
    context.extension.packageJSON;

  if (
    typeof packageJson ===
      'object' &&
    packageJson !== null &&
    'version' in packageJson &&
    typeof packageJson.version ===
      'string'
  ) {
    return packageJson.version;
  }

  return '0.0.0';
}

function createPosixLauncher(
  executablePath: string,
): string {
  return [
    '#!/usr/bin/env sh',
    MANAGED_MARKER,
    '',
    `exec ${shellSingleQuote(
      executablePath,
    )} "$@"`,
    '',
  ].join('\n');
}

function shellSingleQuote(
  value: string,
): string {
  return `'${value.replace(
    /'/g,
    `'\\''`,
  )}'`;
}

async function requireBundledFile(
  filePath: string,
  label: string,
): Promise<void> {
  try {
    await access(
      filePath,
      constants.F_OK,
    );
  } catch {
    throw new Error(
      [
        `${label} introuvable dans le VSIX.`,
        `Chemin attendu : ${filePath}`,
      ].join('\n'),
    );
  }
}

async function readInstalledVersion(
  versionPath: string,
): Promise<string | null> {
  try {
    return (
      await readFile(
        versionPath,
        'utf8',
      )
    ).trim();
  } catch {
    return null;
  }
}

async function isManagedLauncher(
  launcherPath: string,
): Promise<boolean> {
  try {
    const content =
      await readFile(
        launcherPath,
        'utf8',
      );

    return content.includes(
      MANAGED_MARKER,
    );
  } catch {
    return false;
  }
}

async function pathExists(
  targetPath: string,
): Promise<boolean> {
  try {
    await lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function isDirectoryInPath(
  directory: string,
): boolean {
  const entries =
    process.env['PATH']
      ?.split(path.delimiter)
      .filter(Boolean)
      ?? [];

  const expected =
    normalizePathForComparison(
      directory,
    );

  return entries.some(
    entry =>
      normalizePathForComparison(
        entry,
      ) === expected,
  );
}

function normalizePathForComparison(
  value: string,
): string {
  const normalized =
    path.resolve(value);

  return process.platform === 'win32'
    ? normalized.toLowerCase()
    : normalized;
}

function appendCurrentProcessPath(
  directory: string,
): void {
  if (
    isDirectoryInPath(
      directory,
    )
  ) {
    return;
  }

  process.env['PATH'] =
    [
      directory,
      process.env['PATH'] ?? '',
    ]
      .filter(Boolean)
      .join(path.delimiter);
}

async function addWindowsUserPath(
  directory: string,
): Promise<void> {
  const target =
    escapePowerShell(directory);

  const script = [
    `$target = '${target}'`,
    `$current = [Environment]::GetEnvironmentVariable('Path', 'User')`,
    `$parts = @()`,
    `if ($current) {`,
    `  $parts = $current -split ';' | Where-Object { $_ }`,
    `}`,
    `if (-not ($parts -contains $target)) {`,
    `  $updated = (($parts + $target) -join ';')`,
    `  [Environment]::SetEnvironmentVariable('Path', $updated, 'User')`,
    `}`,
  ].join('; ');

  await executePowerShell(
    script,
  );
}

async function removeWindowsUserPath(
  directory: string,
): Promise<void> {
  const target =
    escapePowerShell(directory);

  const script = [
    `$target = '${target}'`,
    `$current = [Environment]::GetEnvironmentVariable('Path', 'User')`,
    `if ($current) {`,
    `  $parts = $current -split ';' | Where-Object {`,
    `    $_ -and $_ -ne $target`,
    `  }`,
    `  [Environment]::SetEnvironmentVariable('Path', ($parts -join ';'), 'User')`,
    `}`,
  ].join('; ');

  await executePowerShell(
    script,
  );
}

async function executePowerShell(
  script: string,
): Promise<void> {
  await execFileAsync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      script,
    ],
    {
      windowsHide: true,
    },
  );
}

function escapePowerShell(
  value: string,
): string {
  return value.replace(
    /'/g,
    "''",
  );
}
