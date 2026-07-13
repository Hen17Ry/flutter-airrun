import {
  AdbDeviceService,
  type AdbDevice,
} from '../devices/adbDeviceService';

import { ExecutableLocator } from '../executableLocator';
import { ProcessRunner } from '../processRunner';

import {
  MdnsDiscoveryService,
} from './mdnsDiscoveryService';

import {
  type AdbMdnsService,
} from './mdnsService';

export interface PairingResult {
  paired: boolean;
  connected: boolean;
  endpoint: string;
  instanceName: string;
  adbOutput: string;
  device: AdbDevice | null;
}

export class PairingService {
  public constructor(
    private readonly executableLocator =
      new ExecutableLocator(),
    private readonly processRunner =
      new ProcessRunner(),
    private readonly mdnsDiscoveryService =
      new MdnsDiscoveryService(),
    private readonly adbDeviceService =
      new AdbDeviceService(),
  ) {}

  public async findPairingServices():
    Promise<readonly AdbMdnsService[]> {
    const result =
      await this.mdnsDiscoveryService.discover();

    return result.services.filter(
      service =>
        service.serviceType === 'pairing',
    );
  }

  public async pair(
    service: AdbMdnsService,
    pairingCode: string,
  ): Promise<PairingResult> {
    const normalizedCode = pairingCode.trim();

    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new Error(
        'Le code d’association doit contenir exactement six chiffres.',
      );
    }

    if (service.serviceType !== 'pairing') {
      throw new Error(
        'Le service sélectionné n’est pas un service d’association ADB.',
      );
    }

    const adbPath =
      await this.executableLocator.findAdb();

    if (!adbPath) {
      throw new Error(
        'ADB est introuvable sur cette machine.',
      );
    }

    /*
     * Le code n’est pas placé dans args.
     * Il est envoyé à l’entrée standard de la commande.
     */
    const result = await this.processRunner.run(
      adbPath,
      ['pair', service.endpoint],
      {
        timeoutMs: 30_000,
        stdin: `${normalizedCode}\n`,
      },
    );

    const adbOutput = this.redactSecret(
      this.combineOutput(
        result.stdout,
        result.stderr,
      ),
      normalizedCode,
    );

    if (result.timedOut) {
      throw new Error(
        'L’association ADB a dépassé le délai autorisé.',
      );
    }

    const paired =
      result.exitCode === 0 &&
      /successfully paired/i.test(adbOutput);

    if (!paired) {
      throw new Error(
        `L’association ADB a échoué : ${
          adbOutput || 'erreur inconnue'
        }`,
      );
    }

    const device =
      await this.waitForWirelessDevice(
        adbPath,
        service,
        20_000,
      );

    return {
      paired: true,
      connected: device !== null,
      endpoint: service.endpoint,
      instanceName: service.instanceName,
      adbOutput,
      device,
    };
  }

  private async waitForWirelessDevice(
    adbPath: string,
    pairingService: AdbMdnsService,
    timeoutMs: number,
  ): Promise<AdbDevice | null> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const connectedDevice =
        await this.findMatchingConnectedDevice(
          pairingService,
        );

      if (connectedDevice) {
        return connectedDevice;
      }

      await this.connectMatchingMdnsService(
        adbPath,
        pairingService,
      );

      const deviceAfterConnect =
        await this.findMatchingConnectedDevice(
          pairingService,
        );

      if (deviceAfterConnect) {
        return deviceAfterConnect;
      }

      await this.delay(1_000);
    }

    return null;
  }

  private async findMatchingConnectedDevice(
    pairingService: AdbMdnsService,
  ): Promise<AdbDevice | null> {
    try {
      const result =
        await this.adbDeviceService.listDevices();

      return (
        result.devices.find(device => {
          if (
            device.state !== 'device' ||
            device.connectionType !== 'wireless'
          ) {
            return false;
          }

          return (
            device.serial.includes(
              pairingService.instanceName,
            ) ||
            device.serial.startsWith(
              `${pairingService.host}:`,
            )
          );
        }) ?? null
      );
    } catch {
      return null;
    }
  }

  private async connectMatchingMdnsService(
    adbPath: string,
    pairingService: AdbMdnsService,
  ): Promise<void> {
    try {
      const mdnsResult =
        await this.mdnsDiscoveryService.discover();

      const connectionService =
        mdnsResult.services.find(service => {
          if (service.serviceType !== 'connect') {
            return false;
          }

          return (
            service.instanceName ===
              pairingService.instanceName ||
            service.host === pairingService.host
          );
        });

      if (!connectionService) {
        return;
      }

      await this.processRunner.run(
        adbPath,
        ['connect', connectionService.endpoint],
        {
          timeoutMs: 10_000,
        },
      );
    } catch {
      /*
       * Une connexion automatique peut déjà être en cours.
       * On continue donc la phase de vérification.
       */
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

  private redactSecret(
    value: string,
    secret: string,
  ): string {
    if (!secret) {
      return value;
    }

    return value
      .split(secret)
      .join('******');
  }

  private async delay(
    durationMs: number,
  ): Promise<void> {
    await new Promise<void>(resolve => {
      setTimeout(resolve, durationMs);
    });
  }
}
