export type AdbMdnsServiceType =
  | 'pairing'
  | 'connect'
  | 'legacy'
  | 'unknown';

export interface MdnsEndpoint {
  host: string;
  port: number;
}

export interface AdbMdnsService {
  instanceName: string;
  registrationType: string;
  serviceType: AdbMdnsServiceType;
  host: string;
  port: number;
  endpoint: string;
}

export class MdnsServiceParser {
  public parseServices(
    output: string,
  ): readonly AdbMdnsService[] {
    const services: AdbMdnsService[] = [];

    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (
        !line ||
        line === 'List of discovered mdns services'
      ) {
        continue;
      }

      const tokens = line.split(/\s+/);

      if (tokens.length < 3) {
        continue;
      }

      const instanceName = tokens[0];
      const registrationType = tokens[1];
      const endpointValue = tokens[2];

      if (
        !instanceName ||
        !registrationType ||
        !endpointValue
      ) {
        continue;
      }

      const endpoint =
        this.parseEndpoint(endpointValue);

      if (!endpoint) {
        continue;
      }

      services.push({
        instanceName,
        registrationType,
        serviceType:
          this.classifyService(registrationType),
        host: endpoint.host,
        port: endpoint.port,
        endpoint: this.formatEndpoint(endpoint),
      });
    }

    return services;
  }

  public parseEndpoint(
    value: string,
  ): MdnsEndpoint | null {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    /*
     * Format IPv6 entre crochets :
     * [fe80::1234]:37000
     */
    if (trimmedValue.startsWith('[')) {
      const match =
        trimmedValue.match(
          /^\[([^\]]+)\]:(\d+)$/,
        );

      if (!match) {
        return null;
      }

      const host = match[1];
      const port = Number(match[2]);

      if (!host || !this.isValidPort(port)) {
        return null;
      }

      return {
        host,
        port,
      };
    }

    /*
     * IPv4 ou nom d’hôte :
     * 192.168.0.132:34331
     */
    const separatorIndex =
      trimmedValue.lastIndexOf(':');

    if (separatorIndex <= 0) {
      return null;
    }

    const host = trimmedValue.slice(
      0,
      separatorIndex,
    );

    const port = Number(
      trimmedValue.slice(separatorIndex + 1),
    );

    if (!host || !this.isValidPort(port)) {
      return null;
    }

    return {
      host,
      port,
    };
  }

  private classifyService(
    registrationType: string,
  ): AdbMdnsServiceType {
    switch (registrationType) {
      case '_adb-tls-pairing._tcp':
        return 'pairing';

      case '_adb-tls-connect._tcp':
        return 'connect';

      case '_adb._tcp':
        return 'legacy';

      default:
        return 'unknown';
    }
  }

  private formatEndpoint(
    endpoint: MdnsEndpoint,
  ): string {
    const host = endpoint.host.includes(':')
      ? `[${endpoint.host}]`
      : endpoint.host;

    return `${host}:${endpoint.port}`;
  }

  private isValidPort(port: number): boolean {
    return (
      Number.isInteger(port) &&
      port >= 1 &&
      port <= 65_535
    );
  }
}
