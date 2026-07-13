import {
  spawn,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process';

export interface ProcessRunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface ProcessResult {
  command: string;
  args: readonly string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export class ProcessRunner {
  public async run(
    command: string,
    args: readonly string[] = [],
    options: ProcessRunOptions = {},
  ): Promise<ProcessResult> {
    const startedAt = Date.now();

    return new Promise<ProcessResult>((resolve, reject) => {
      const spawnOptions: SpawnOptionsWithoutStdio = {
        shell: false,
        windowsHide: true,
        env: options.env ?? process.env,
      };

      if (options.cwd) {
        spawnOptions.cwd = options.cwd;
      }

      let child;

      try {
        child = spawn(command, [...args], spawnOptions);
      } catch (error) {
        reject(this.createLaunchError(command, error));
        return;
      }

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let settled = false;

      child.stdout?.setEncoding('utf8');
      child.stderr?.setEncoding('utf8');

      child.stdout?.on('data', (data: string) => {
        stdout += data;
      });

      child.stderr?.on('data', (data: string) => {
        stderr += data;
      });

      const timeout =
        options.timeoutMs && options.timeoutMs > 0
          ? setTimeout(() => {
              timedOut = true;
              child.kill('SIGTERM');
            }, options.timeoutMs)
          : undefined;

      child.once('error', error => {
        if (settled) {
          return;
        }

        settled = true;

        if (timeout) {
          clearTimeout(timeout);
        }

        reject(this.createLaunchError(command, error));
      });

      child.once('close', exitCode => {
        if (settled) {
          return;
        }

        settled = true;

        if (timeout) {
          clearTimeout(timeout);
        }

        resolve({
          command,
          args,
          exitCode,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
          timedOut,
        });
      });
    });
  }

  private createLaunchError(command: string, error: unknown): Error {
    const reason =
      error instanceof Error
        ? error.message
        : String(error);

    return new Error(
      `Impossible de démarrer la commande "${command}" : ${reason}`,
    );
  }
}
