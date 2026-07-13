import {
  spawn,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process';

export interface ProcessRunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  stdin?: string;
  signal?: AbortSignal;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

export interface ProcessResult {
  command: string;
  args: readonly string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  aborted: boolean;
}

export class ProcessRunner {
  public async run(
    command: string,
    args: readonly string[] = [],
    options: ProcessRunOptions = {},
  ): Promise<ProcessResult> {
    const startedAt = Date.now();

    return new Promise<ProcessResult>(
      (resolve, reject) => {
        const spawnOptions:
          SpawnOptionsWithoutStdio = {
          shell: false,
          windowsHide: true,
          env: options.env ?? process.env,
        };

        if (options.cwd) {
          spawnOptions.cwd = options.cwd;
        }

        let child;

        try {
          child = spawn(
            command,
            [...args],
            spawnOptions,
          );
        } catch (error) {
          reject(
            this.createLaunchError(
              command,
              error,
            ),
          );

          return;
        }

        let stdout = '';
        let stderr = '';
        let timedOut = false;
        let aborted = false;
        let settled = false;

        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');

        child.stdout.on(
          'data',
          (data: string) => {
            stdout += data;

            try {
              options.onStdout?.(data);
            } catch {
              // Une erreur d’observation ne doit
              // pas interrompre le processus.
            }
          },
        );

        child.stderr.on(
          'data',
          (data: string) => {
            stderr += data;

            try {
              options.onStderr?.(data);
            } catch {
              // Même principe pour stderr.
            }
          },
        );

        child.stdin.on('error', () => {
          // Le programme peut fermer stdin
          // avant que Node termine l’écriture.
        });

        if (options.stdin !== undefined) {
          child.stdin.end(options.stdin);
        } else {
          child.stdin.end();
        }

        const abortHandler = (): void => {
          if (settled || child.killed) {
            return;
          }

          aborted = true;
          child.kill('SIGTERM');
        };

        if (options.signal) {
          if (options.signal.aborted) {
            abortHandler();
          } else {
            options.signal.addEventListener(
              'abort',
              abortHandler,
              {
                once: true,
              },
            );
          }
        }

        const timeout =
          options.timeoutMs &&
          options.timeoutMs > 0
            ? setTimeout(() => {
                if (
                  settled ||
                  child.killed
                ) {
                  return;
                }

                timedOut = true;
                child.kill('SIGTERM');
              }, options.timeoutMs)
            : undefined;

        const cleanup = (): void => {
          if (timeout) {
            clearTimeout(timeout);
          }

          options.signal
            ?.removeEventListener(
              'abort',
              abortHandler,
            );
        };

        child.once('error', error => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();

          reject(
            this.createLaunchError(
              command,
              error,
            ),
          );
        });

        child.once('close', exitCode => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();

          resolve({
            command,
            args,
            exitCode,
            stdout,
            stderr,
            durationMs:
              Date.now() - startedAt,
            timedOut,
            aborted,
          });
        });
      },
    );
  }

  private createLaunchError(
    command: string,
    error: unknown,
  ): Error {
    const reason =
      error instanceof Error
        ? error.message
        : String(error);

    return new Error(
      `Impossible de démarrer la commande "${command}" : ${reason}`,
    );
  }
}
