import { ExecutableLocator } from '../executableLocator';
import { ProcessRunner } from '../processRunner';

export type AdbConnectionType =
  | 'usb'
  | 'wireless'
  | 'emulator'
  | 'unknown';

export interface AdbDevice {
  serial: string;
  state: string;
  product: string | null;
  model: string | null;
  device: string | null;
  transportId: string | null;
  connectionType: AdbConnectionType;
  attributes: Readonly<Record<string, string>>;
}

export interface AdbDeviceList {
  adbPath: string;
  devices: readonly AdbDevice[];
  rawOutput: string;
}

export class AdbDeviceService {
  public constructor(
    private readonly executableLocator =
      new ExecutableLocator(),
    private readonly processRunner =
      new ProcessRunner(),
  ) {}

  public async listDevices(): Promise<AdbDeviceList> {
    const adbPath =
      await this.executableLocator.findAdb();

    if (!adbPath) {
      throw new Error(
        'ADB est introuvable sur cette machine.',
      );
    }

    const result = await this.processRunner.run(
      adbPath,
      ['devices', '-l'],
      {
        timeoutMs: 15_000,
      },
    );

    if (result.timedOut) {
      throw new Error(
        'La détection des appareils ADB a dépassé le délai autorisé.',
      );
    }

    if (result.exitCode !== 0) {
      const errorOutput =
        result.stderr.trim() ||
        result.stdout.trim() ||
        'Erreur inconnue';

      throw new Error(
        `ADB n’a pas pu lister les appareils : ${errorOutput}`,
      );
    }

    return {
      adbPath,
      devices: this.parseDevices(result.stdout),
      rawOutput: result.stdout.trim(),
    };
  }

  public parseDevices(output: string): readonly AdbDevice[] {
    const devices: AdbDevice[] = [];

    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (
        !line ||
        line === 'List of devices attached' ||
        line.startsWith('* daemon')
      ) {
        continue;
      }

      const tokens = line.split(/\s+/);
      const serial = tokens[0];
      const state = tokens[1];

      if (!serial || !state) {
        continue;
      }

      const attributes: Record<string, string> = {};

      for (const token of tokens.slice(2)) {
        const separatorIndex = token.indexOf(':');

        if (separatorIndex <= 0) {
          continue;
        }

        const key = token.slice(0, separatorIndex);
        const value = token.slice(separatorIndex + 1);

        if (key && value) {
          attributes[key] = value;
        }
      }

      devices.push({
        serial,
        state,
        product: attributes.product ?? null,
        model: this.normalizeModel(
          attributes.model ?? null,
        ),
        device: attributes.device ?? null,
        transportId:
          attributes.transport_id ?? null,
        connectionType:
          this.detectConnectionType(
            serial,
            attributes,
          ),
        attributes,
      });
    }

    return devices;
  }

  private detectConnectionType(
    serial: string,
    attributes: Readonly<Record<string, string>>,
  ): AdbConnectionType {
    if (serial.startsWith('emulator-')) {
      return 'emulator';
    }

    if (
      serial.includes(':') ||
      serial.endsWith('._adb-tls-connect._tcp')
    ) {
      return 'wireless';
    }

    if (attributes.usb) {
      return 'usb';
    }

    return 'unknown';
  }

  private normalizeModel(
    model: string | null,
  ): string | null {
    return model?.replaceAll('_', ' ') ?? null;
  }
}
