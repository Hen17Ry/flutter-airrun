import { ProcessRunner } from '../processRunner';

export interface AdbSocketEndpoint {
  localEndpoint: string;
  remoteEndpoint: string;
  pid: number | null;
}

export class AdbSocketEndpointService {
  public constructor(
    private readonly processRunner =
      new ProcessRunner(),
  ) {}

  public async findRemoteEndpoints():
    Promise<readonly AdbSocketEndpoint[]> {
    if (process.platform !== 'linux') {
      return [];
    }

    const result = await this.processRunner.run(
      'ss',
      ['-tnpH'],
      {
        timeoutMs: 5_000,
      },
    );

    if (
      result.timedOut ||
      result.exitCode !== 0
    ) {
      return [];
    }

    return this.parseLinuxSsOutput(
      result.stdout,
    );
  }

  public parseLinuxSsOutput(
    output: string,
  ): readonly AdbSocketEndpoint[] {
    const endpoints =
      new Map<string, AdbSocketEndpoint>();

    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (
        !line ||
        !line.includes('users:(("adb"')
      ) {
        continue;
      }

      const socketMatch = line.match(
        /^ESTAB\s+\d+\s+\d+\s+(\S+)\s+(\S+)(?:\s+|$)/,
      );

      if (!socketMatch) {
        continue;
      }

      const localEndpoint =
        socketMatch[1];

      const remoteEndpoint =
        socketMatch[2];

      if (
        !localEndpoint ||
        !remoteEndpoint ||
        !this.isCandidateRemoteEndpoint(
          remoteEndpoint,
        )
      ) {
        continue;
      }

      const pidMatch = line.match(
        /"adb",pid=(\d+),/,
      );

      const pidValue =
        pidMatch?.[1];

      const pid =
        pidValue !== undefined
          ? Number(pidValue)
          : null;

      endpoints.set(remoteEndpoint, {
        localEndpoint,
        remoteEndpoint,
        pid:
          pid !== null &&
          Number.isInteger(pid)
            ? pid
            : null,
      });
    }

    return [...endpoints.values()];
  }

  private isCandidateRemoteEndpoint(
    endpoint: string,
  ): boolean {
    const parsed =
      this.parseEndpoint(endpoint);

    if (!parsed) {
      return false;
    }

    if (
      parsed.port === 5_037 ||
      this.isLoopback(parsed.host)
    ) {
      return false;
    }

    return true;
  }

  private parseEndpoint(
    endpoint: string,
  ): {
    host: string;
    port: number;
  } | null {
    if (endpoint.startsWith('[')) {
      const match = endpoint.match(
        /^\[([^\]]+)\]:(\d+)$/,
      );

      if (!match) {
        return null;
      }

      const host = match[1];
      const port = Number(match[2]);

      return this.createParsedEndpoint(
        host,
        port,
      );
    }

    const separatorIndex =
      endpoint.lastIndexOf(':');

    if (separatorIndex <= 0) {
      return null;
    }

    const host = endpoint.slice(
      0,
      separatorIndex,
    );

    const port = Number(
      endpoint.slice(separatorIndex + 1),
    );

    return this.createParsedEndpoint(
      host,
      port,
    );
  }

  private createParsedEndpoint(
    host: string | undefined,
    port: number,
  ): {
    host: string;
    port: number;
  } | null {
    if (
      !host ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65_535
    ) {
      return null;
    }

    return {
      host,
      port,
    };
  }

  private isLoopback(
    host: string,
  ): boolean {
    return (
      host === 'localhost' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.startsWith('127.')
    );
  }
}
