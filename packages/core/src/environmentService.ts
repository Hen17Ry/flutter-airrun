import { ExecutableLocator } from './executableLocator';
import { ProcessRunner } from './processRunner';

export type ToolName = 'flutter' | 'adb';

export interface ToolInspection {
  name: ToolName;
  available: boolean;
  executablePath: string | null;
  version: string | null;
  rawOutput: string;
  error: string | null;
}

export interface EnvironmentReport {
  inspectedAt: string;
  flutter: ToolInspection;
  adb: ToolInspection;
}

export class EnvironmentService {
  public constructor(
    private readonly executableLocator =
      new ExecutableLocator(),
    private readonly processRunner =
      new ProcessRunner(),
  ) {}

  public async inspect(): Promise<EnvironmentReport> {
    const [flutter, adb] = await Promise.all([
      this.inspectFlutter(),
      this.inspectAdb(),
    ]);

    return {
      inspectedAt: new Date().toISOString(),
      flutter,
      adb,
    };
  }

  private async inspectFlutter(): Promise<ToolInspection> {
    const executablePath =
      await this.executableLocator.findFlutter();

    if (!executablePath) {
      return this.createUnavailableTool(
        'flutter',
        'Flutter est introuvable sur cette machine.',
      );
    }

    try {
      const result = await this.processRunner.run(
        executablePath,
        ['--version'],
        {
          timeoutMs: 20_000,
        },
      );

      const rawOutput = this.combineOutput(
        result.stdout,
        result.stderr,
      );

      if (result.timedOut) {
        return this.createFailedTool(
          'flutter',
          executablePath,
          rawOutput,
          'La vérification de Flutter a dépassé le délai autorisé.',
        );
      }

      if (result.exitCode !== 0) {
        return this.createFailedTool(
          'flutter',
          executablePath,
          rawOutput,
          `Flutter a retourné le code ${String(result.exitCode)}.`,
        );
      }

      const version =
        rawOutput.match(/Flutter\s+([^\s•]+)/)?.[1] ??
        null;

      return {
        name: 'flutter',
        available: true,
        executablePath,
        version,
        rawOutput,
        error: null,
      };
    } catch (error) {
      return this.createFailedTool(
        'flutter',
        executablePath,
        '',
        this.errorMessage(error),
      );
    }
  }

  private async inspectAdb(): Promise<ToolInspection> {
    const executablePath =
      await this.executableLocator.findAdb();

    if (!executablePath) {
      return this.createUnavailableTool(
        'adb',
        'ADB est introuvable sur cette machine.',
      );
    }

    try {
      const result = await this.processRunner.run(
        executablePath,
        ['version'],
        {
          timeoutMs: 10_000,
        },
      );

      const rawOutput = this.combineOutput(
        result.stdout,
        result.stderr,
      );

      if (result.timedOut) {
        return this.createFailedTool(
          'adb',
          executablePath,
          rawOutput,
          'La vérification d’ADB a dépassé le délai autorisé.',
        );
      }

      if (result.exitCode !== 0) {
        return this.createFailedTool(
          'adb',
          executablePath,
          rawOutput,
          `ADB a retourné le code ${String(result.exitCode)}.`,
        );
      }

      const version =
        rawOutput.match(/^Version\s+([^\s]+)/m)?.[1] ??
        null;

      return {
        name: 'adb',
        available: true,
        executablePath,
        version,
        rawOutput,
        error: null,
      };
    } catch (error) {
      return this.createFailedTool(
        'adb',
        executablePath,
        '',
        this.errorMessage(error),
      );
    }
  }

  private createUnavailableTool(
    name: ToolName,
    error: string,
  ): ToolInspection {
    return {
      name,
      available: false,
      executablePath: null,
      version: null,
      rawOutput: '',
      error,
    };
  }

  private createFailedTool(
    name: ToolName,
    executablePath: string,
    rawOutput: string,
    error: string,
  ): ToolInspection {
    return {
      name,
      available: false,
      executablePath,
      version: null,
      rawOutput,
      error,
    };
  }

  private combineOutput(
    stdout: string,
    stderr: string,
  ): string {
    return [stdout, stderr]
      .map(value => value.trim())
      .filter(Boolean)
      .join('\n');
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : String(error);
  }
}
