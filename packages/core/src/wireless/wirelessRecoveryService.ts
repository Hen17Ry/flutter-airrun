import {
  WirelessFlutterDeviceService,
  type WirelessFlutterDevice,
} from '../devices/wirelessFlutterDeviceService';

import { ExecutableLocator } from '../executableLocator';
import { ProcessRunner } from '../processRunner';

import {
  MdnsTrackServiceParser,
  type TrackedAdbMdnsService,
} from './mdnsTrackService';

export type WirelessRecoveryStatus =
  | 'already-connected'
  | 'reconnected'
  | 'not-found';

export interface WirelessRecoveryOptions {
  discoveryTimeoutMs?: number;
  deviceWaitTimeoutMs?: number;
}

export interface WirelessRecoveryResult {
  status: WirelessRecoveryStatus;
  device: WirelessFlutterDevice | null;
  trackedServices:
    readonly TrackedAdbMdnsService[];
  adbMessages: readonly string[];
}

export class WirelessRecoveryService {
  public constructor(
    private readonly executableLocator =
      new ExecutableLocator(),
    private readonly processRunner =
      new ProcessRunner(),
    private readonly trackParser =
      new MdnsTrackServiceParser(),
    private readonly wirelessDeviceService =
      new WirelessFlutterDeviceService(),
  ) {}

  public async recover(
    options: WirelessRecoveryOptions = {},
  ): Promise<WirelessRecoveryResult> {
    const discoveryTimeoutMs =
      options.discoveryTimeoutMs ?? 8_000;

    const deviceWaitTimeoutMs =
      options.deviceWaitTimeoutMs ?? 20_000;

    const adbPath =
      await this.executableLocator.findAdb();

    if (!adbPath) {
      throw new Error(
        'ADB est introuvable sur cette machine.',
      );
    }

    const adbMessages: string[] = [];

    const startResult =
      await this.processRunner.run(
        adbPath,
        ['start-server'],
        {
          timeoutMs: 10_000,
        },
      );

    if (
      startResult.timedOut ||
      startResult.exitCode !== 0
    ) {
      throw new Error(
        `Impossible de démarrer le serveur ADB : ${
          this.combineOutput(
            startResult.stdout,
            startResult.stderr,
          ) || 'erreur inconnue'
        }`,
      );
    }

    const alreadyConnectedDevice =
      await this.findConnectedDevice();

    if (alreadyConnectedDevice) {
      return {
        status: 'already-connected',
        device: alreadyConnectedDevice,
        trackedServices: [],
        adbMessages,
      };
    }

    /*
     * track-services reste normalement actif en continu.
     * Ici, le timeout est volontaire : nous observons le
     * réseau pendant quelques secondes, puis nous continuons.
     */
    const trackResult =
      await this.processRunner.run(
        adbPath,
        [
          'mdns',
          'track-services',
          '--proto-text',
        ],
        {
          timeoutMs: discoveryTimeoutMs,
        },
      );

    const trackOutput =
      this.combineOutput(
        trackResult.stdout,
        trackResult.stderr,
      );

    /*
     * timedOut est attendu pour cette commande longue.
     * Une erreur n’est retenue que si la commande s’arrête
     * anormalement avant le délai.
     */
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

    const knownConnectionServices =
      trackedServices.filter(
        service =>
          service.serviceType === 'connect' &&
          service.knownDevice !== false,
      );

    /*
     * ADB effectue souvent la connexion automatiquement
     * pendant track-services. adb connect sert de secours.
     */
    for (
      const service of
      knownConnectionServices
    ) {
      const connectResult =
        await this.processRunner.run(
          adbPath,
          [
            'connect',
            service.endpoint,
          ],
          {
            timeoutMs: 10_000,
          },
        );

      const message =
        this.combineOutput(
          connectResult.stdout,
          connectResult.stderr,
        );

      if (message) {
        adbMessages.push(message);
      }
    }

    const recoveredDevice =
      await this.waitForDevice(
        deviceWaitTimeoutMs,
      );

    if (recoveredDevice) {
      return {
        status: 'reconnected',
        device: recoveredDevice,
        trackedServices,
        adbMessages,
      };
    }

    return {
      status: 'not-found',
      device: null,
      trackedServices,
      adbMessages,
    };
  }

  private async waitForDevice(
    timeoutMs: number,
  ): Promise<WirelessFlutterDevice | null> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const device =
        await this.findConnectedDevice();

      if (device) {
        return device;
      }

      await this.delay(1_000);
    }

    return null;
  }

  private async findConnectedDevice():
    Promise<WirelessFlutterDevice | null> {
    try {
      const result =
        await this.wirelessDeviceService
          .listDevices();

      return result.devices[0] ?? null;
    } catch {
      return null;
    }
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
