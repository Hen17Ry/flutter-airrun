import {
  type AdbMdnsService,
  type AdbMdnsServiceType,
} from './mdnsService';

export type MdnsTrackGroup =
  | 'pair'
  | 'tls'
  | 'legacy';

export interface TrackedAdbMdnsService
  extends AdbMdnsService {
  group: MdnsTrackGroup;
  ipv4: string | null;
  ipv6: string | null;
  knownDevice: boolean | null;
}

export class MdnsTrackServiceParser {
  public parse(
    output: string,
  ): readonly TrackedAdbMdnsService[] {
    const services: TrackedAdbMdnsService[] = [];

    const blockPattern =
      /(pair|tls|legacy)\s*\{\s*service\s*\{([\s\S]*?)\}\s*(?:known_device:\s*(true|false))?\s*\}/g;

    for (const match of output.matchAll(blockPattern)) {
      const group = match[1];
      const serviceBody = match[2];
      const knownDeviceValue = match[3];

      if (
        !this.isTrackGroup(group) ||
        !serviceBody
      ) {
        continue;
      }

      const instanceName =
        this.readQuotedValue(
          serviceBody,
          'instance',
        );

      const registrationType =
        this.readQuotedValue(
          serviceBody,
          'service',
        );

      const ipv4 =
        this.readQuotedValue(
          serviceBody,
          'ipv4',
        );

      const ipv6 =
        this.readQuotedValue(
          serviceBody,
          'ipv6',
        );

      const port =
        this.readNumericValue(
          serviceBody,
          'port',
        );

      const host = ipv4 ?? ipv6;

      if (
        !instanceName ||
        !registrationType ||
        !host ||
        port === null ||
        !this.isValidPort(port)
      ) {
        continue;
      }

      services.push({
        group,
        instanceName,
        registrationType,
        serviceType:
          this.classifyService(
            registrationType,
          ),
        host,
        port,
        endpoint:
          this.formatEndpoint(
            host,
            port,
          ),
        ipv4,
        ipv6,
        knownDevice:
          knownDeviceValue === undefined
            ? null
            : knownDeviceValue === 'true',
      });
    }

    return services;
  }

  private readQuotedValue(
    body: string,
    key: string,
  ): string | null {
    const expression = new RegExp(
      `${key}:\\s*"([^"]+)"`,
    );

    return body.match(expression)?.[1] ?? null;
  }

  private readNumericValue(
    body: string,
    key: string,
  ): number | null {
    const expression = new RegExp(
      `${key}:\\s*(\\d+)`,
    );

    const value =
      body.match(expression)?.[1];

    if (!value) {
      return null;
    }

    const number = Number(value);

    return Number.isInteger(number)
      ? number
      : null;
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
    host: string,
    port: number,
  ): string {
    const formattedHost =
      host.includes(':')
        ? `[${host}]`
        : host;

    return `${formattedHost}:${port}`;
  }

  private isTrackGroup(
    value: string | undefined,
  ): value is MdnsTrackGroup {
    return (
      value === 'pair' ||
      value === 'tls' ||
      value === 'legacy'
    );
  }

  private isValidPort(
    port: number,
  ): boolean {
    return (
      Number.isInteger(port) &&
      port >= 1 &&
      port <= 65_535
    );
  }
}
