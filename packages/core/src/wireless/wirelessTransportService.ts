import {
  AdbDeviceService,
  type AdbDevice,
} from '../devices/adbDeviceService';

import { ExecutableLocator } from '../executableLocator';
import { ProcessRunner } from '../processRunner';

import {
  AdbSocketEndpointService,
} from './adbSocketEndpointService';

import {
  MdnsTrackServiceParser,
  type TrackedAdbMdnsService,
} from './mdnsTrackService';

export type WirelessTransportStatus =
  | 'already-tcp'
  | 'connected-tcp'
  | 'not-needed'
  | 'service-not-found'
  | 'connection-failed';

export type WirelessEndpointSource =
  | 'existing-tcp'
  | 'mdns-track'
  | 'adb-socket'
  | 'none';

export interface WirelessTransportResult {
  status: WirelessTransportStatus;
  endpoint: string | null;
  endpointSource: WirelessEndpointSource;
  problematicSerial: string | null;
  adbOutput: string;
}

export class WirelessTransportService {
  public constructor(
    private readonly adbDeviceService =
      new AdbDeviceService(),
    private readonly executableLocator =
      new ExecutableLocator(),
    private readonly processRunner =
      new ProcessRunner(),
    private readonly trackParser =
      new MdnsTrackServiceParser(),
    private readonly socketEndpointService =
      new AdbSocketEndpointService(),
  ) {}

  public async ensureTcpTransport():
    Promise<WirelessTransportResult> {
    const initialDevices =
      await this.adbDeviceService.listDevices();

    const existingTcpDevice =
      initialDevices.devices.find(device =>
        this.isUsableTcpDevice(device),
      );

    if (existingTcpDevice) {
      return {
        status: 'already-tcp',
        endpoint: existingTcpDevice.serial,
        endpointSource: 'existing-tcp',
        problematicSerial: null,
        adbOutput: '',
      };
    }

    const problematicDevice =
      initialDevices.devices.find(device =>
        this.isProblematicMdnsDevice(device),
      );

    if (!problematicDevice) {
      return {
        status: 'not-needed',
        endpoint: null,
        endpointSource: 'none',
        problematicSerial: null,
        adbOutput: '',
      };
    }

    const adbPath =
      await this.executableLocator.findAdb();

    if (!adbPath) {
      throw new Error(
        'ADB est introuvable sur cette machine.',
      );
    }

    const trackResult =
      await this.processRunner.run(
        adbPath,
        [
          'mdns',
          'track-services',
          '--proto-text',
        ],
        {
          timeoutMs: 6_000,
        },
      );

    const trackOutput =
      this.combineOutput(
        trackResult.stdout,
        trackResult.stderr,
      );

    if (
      !trackResult.timedOut &&
      trackResult.exitCode !== 0
    ) {
      throw new Error(
        `La découverte mDNS a échoué : ${
          trackOutput || 'erreur inconnue'
        }`,
      );
    }

    const trackedServices =
      this.trackParser.parse(trackOutput);

    const connectionService =
      this.findMatchingConnectionService(
        problematicDevice.serial,
        trackedServices,
      );

    if (connectionService) {
      const mdnsResult =
        await this.connectEndpoint(
          adbPath,
          connectionService.endpoint,
          problematicDevice.serial,
          'mdns-track',
        );

      if (
        mdnsResult.status ===
        'connected-tcp'
      ) {
        return mdnsResult;
      }
    }

    /*
     * Secours Linux :
     * si aucune nouvelle annonce mDNS n’est reçue,
     * on inspecte les sockets établies du serveur ADB.
     */
    const socketEndpoints =
      await this.socketEndpointService
        .findRemoteEndpoints();

    const socketMessages: string[] = [];

    for (const socket of socketEndpoints) {
      const socketResult =
        await this.connectEndpoint(
          adbPath,
          socket.remoteEndpoint,
          problematicDevice.serial,
          'adb-socket',
        );

      if (socketResult.adbOutput) {
        socketMessages.push(
          socketResult.adbOutput,
        );
      }

      if (
        socketResult.status ===
        'connected-tcp'
      ) {
        return {
          ...socketResult,
          adbOutput: [
            trackOutput,
            ...socketMessages,
          ]
            .filter(Boolean)
            .join('\n'),
        };
      }
    }

    return {
      status:
        socketEndpoints.length > 0
          ? 'connection-failed'
          : 'service-not-found',
      endpoint: null,
      endpointSource: 'none',
      problematicSerial:
        problematicDevice.serial,
      adbOutput: [
        trackOutput,
        ...socketMessages,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  private async connectEndpoint(
    adbPath: string,
    endpoint: string,
    problematicSerial: string,
    endpointSource:
      Exclude<
        WirelessEndpointSource,
        'existing-tcp' | 'none'
      >,
  ): Promise<WirelessTransportResult> {
    const connectResult =
      await this.processRunner.run(
        adbPath,
        [
          'connect',
          endpoint,
        ],
        {
          timeoutMs: 15_000,
        },
      );

    const adbOutput =
      this.combineOutput(
        connectResult.stdout,
        connectResult.stderr,
      );

    if (
      connectResult.timedOut ||
      connectResult.exitCode !== 0
    ) {
      return {
        status: 'connection-failed',
        endpoint,
        endpointSource,
        problematicSerial,
        adbOutput,
      };
    }

    const connectedDevice =
      await this.waitForTcpDevice(
        endpoint,
        15_000,
      );

    return {
      status: connectedDevice
        ? 'connected-tcp'
        : 'connection-failed',
      endpoint,
      endpointSource,
      problematicSerial,
      adbOutput,
    };
  }

  private findMatchingConnectionService(
    serial: string,
    services:
      readonly TrackedAdbMdnsService[],
  ): TrackedAdbMdnsService | null {
    const connectionServices =
      services.filter(
        service =>
          service.serviceType === 'connect' &&
          service.knownDevice !== false,
      );

    const exactMatch =
      connectionServices.find(
        service =>
          serial ===
          `${service.instanceName}.${service.registrationType}`,
      );

    if (exactMatch) {
      return exactMatch;
    }

    return (
      connectionServices.find(
        service =>
          serial.includes(
            service.instanceName,
          ),
      ) ?? null
    );
  }

  private async waitForTcpDevice(
    endpoint: string,
    timeoutMs: number,
  ): Promise<AdbDevice | null> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result =
        await this.adbDeviceService.listDevices();

      const device =
        result.devices.find(
          candidate =>
            candidate.serial === endpoint &&
            candidate.state === 'device',
        );

      if (device) {
        return device;
      }

      await this.delay(500);
    }

    return null;
  }

  private isProblematicMdnsDevice(
    device: AdbDevice,
  ): boolean {
    return (
      device.state === 'device' &&
      device.connectionType === 'wireless' &&
      device.serial.includes(
        '._adb-tls-connect._tcp',
      ) &&
      /\s/.test(device.serial)
    );
  }

  private isUsableTcpDevice(
    device: AdbDevice,
  ): boolean {
    return (
      device.state === 'device' &&
      device.connectionType === 'wireless' &&
      this.isTcpEndpoint(device.serial)
    );
  }

  private isTcpEndpoint(
    serial: string,
  ): boolean {
    return (
      /^\[[^\]]+\]:\d+$/.test(serial) ||
      /^[^\s]+:\d+$/.test(serial)
    );
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

  private async delay(
    durationMs: number,
  ): Promise<void> {
    await new Promise<void>(resolve => {
      setTimeout(resolve, durationMs);
    });
  }
}
