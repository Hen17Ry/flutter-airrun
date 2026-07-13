import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { ProcessRunner } from './processRunner';

export class ExecutableLocator {
  public constructor(
    private readonly processRunner = new ProcessRunner(),
  ) {}

  public async findFlutter(): Promise<string | null> {
    const executableName =
      process.platform === 'win32'
        ? 'flutter.bat'
        : 'flutter';

    const candidates: string[] = [];

    if (process.env.FLUTTER_ROOT) {
      candidates.push(
        path.join(
          process.env.FLUTTER_ROOT,
          'bin',
          executableName,
        ),
      );
    }

    candidates.push(
      path.join(
        os.homedir(),
        'flutter',
        'bin',
        executableName,
      ),
    );

    const localCandidate =
      await this.findFirstExecutable(candidates);

    if (localCandidate) {
      return localCandidate;
    }

    return this.findOnPath('flutter');
  }

  public async findAdb(): Promise<string | null> {
    const executableName =
      process.platform === 'win32'
        ? 'adb.exe'
        : 'adb';

    const sdkRoots = [
      process.env.ANDROID_SDK_ROOT,
      process.env.ANDROID_HOME,
      path.join(os.homedir(), 'Android', 'Sdk'),
      path.join(
        os.homedir(),
        'Library',
        'Android',
        'sdk',
      ),
      process.env.LOCALAPPDATA
        ? path.join(
            process.env.LOCALAPPDATA,
            'Android',
            'Sdk',
          )
        : undefined,
    ];

    const candidates = sdkRoots
      .filter((sdkRoot): sdkRoot is string => Boolean(sdkRoot))
      .map(sdkRoot =>
        path.join(
          sdkRoot,
          'platform-tools',
          executableName,
        ),
      );

    const sdkCandidate =
      await this.findFirstExecutable(candidates);

    if (sdkCandidate) {
      return sdkCandidate;
    }

    return this.findOnPath('adb');
  }

  private async findFirstExecutable(
    candidates: readonly string[],
  ): Promise<string | null> {
    const uniqueCandidates = [...new Set(candidates)];

    for (const candidate of uniqueCandidates) {
      if (await this.isExecutable(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private async isExecutable(
    executablePath: string,
  ): Promise<boolean> {
    try {
      const mode =
        process.platform === 'win32'
          ? constants.F_OK
          : constants.X_OK;

      await access(executablePath, mode);

      return true;
    } catch {
      return false;
    }
  }

  private async findOnPath(
    executableName: string,
  ): Promise<string | null> {
    const locatorCommand =
      process.platform === 'win32'
        ? 'where.exe'
        : 'which';

    try {
      const result = await this.processRunner.run(
        locatorCommand,
        [executableName],
        {
          timeoutMs: 5_000,
        },
      );

      if (result.exitCode !== 0 || result.timedOut) {
        return null;
      }

      const firstResult = result.stdout
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);

      return firstResult ?? null;
    } catch {
      return null;
    }
  }
}
