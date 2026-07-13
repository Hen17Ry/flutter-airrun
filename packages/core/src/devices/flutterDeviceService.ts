import { ExecutableLocator } from '../executableLocator';
import { ProcessRunner } from '../processRunner';

export interface FlutterDevice {
  id: string;
  name: string;
  targetPlatform: string | null;
  sdk: string | null;
  isSupported: boolean;
  emulator: boolean;
  category: string | null;
  platformType: string | null;
  ephemeral: boolean | null;
  capabilities: Readonly<Record<string, boolean>>;
  raw: Readonly<Record<string, unknown>>;
}

export interface FlutterDeviceList {
  flutterPath: string;
  devices: readonly FlutterDevice[];
  rawOutput: string;
}

export class FlutterDeviceService {
  public constructor(
    private readonly executableLocator =
      new ExecutableLocator(),
    private readonly processRunner =
      new ProcessRunner(),
  ) {}

  public async listDevices(): Promise<FlutterDeviceList> {
    const flutterPath =
      await this.executableLocator.findFlutter();

    if (!flutterPath) {
      throw new Error(
        'Flutter est introuvable sur cette machine.',
      );
    }

    const result = await this.processRunner.run(
      flutterPath,
      ['devices', '--machine'],
      {
        timeoutMs: 30_000,
      },
    );

    if (result.timedOut) {
      throw new Error(
        'La détection des appareils Flutter a dépassé le délai autorisé.',
      );
    }

    const combinedOutput = [
      result.stdout,
      result.stderr,
    ]
      .map(value => value.trim())
      .filter(Boolean)
      .join('\n');

    if (result.exitCode !== 0) {
      throw new Error(
        `Flutter n’a pas pu lister les appareils : ${
          combinedOutput || 'Erreur inconnue'
        }`,
      );
    }

    return {
      flutterPath,
      devices: this.parseDevices(result.stdout),
      rawOutput: combinedOutput,
    };
  }

  public parseDevices(output: string): readonly FlutterDevice[] {
    const jsonOutput = this.extractJsonArray(output);

    let parsed: unknown;

    try {
      parsed = JSON.parse(jsonOutput);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      throw new Error(
        `La sortie de Flutter n’est pas un JSON valide : ${message}`,
      );
    }

    if (!Array.isArray(parsed)) {
      throw new Error(
        'Flutter a retourné un format d’appareils inattendu.',
      );
    }

    const devices: FlutterDevice[] = [];

    for (const item of parsed) {
      if (!this.isRecord(item)) {
        continue;
      }

      const id = this.readString(item, 'id');
      const name = this.readString(item, 'name');

      if (!id || !name) {
        continue;
      }

      devices.push({
        id,
        name,
        targetPlatform:
          this.readString(
            item,
            'targetPlatform',
          ),
        sdk: this.readString(item, 'sdk'),
        isSupported:
          this.readBoolean(
            item,
            'isSupported',
          ) ?? true,
        emulator:
          this.readBoolean(
            item,
            'emulator',
          ) ?? false,
        category:
          this.readString(item, 'category'),
        platformType:
          this.readString(
            item,
            'platformType',
          ),
        ephemeral:
          this.readBoolean(
            item,
            'ephemeral',
          ),
        capabilities:
          this.readCapabilities(
            item.capabilities,
          ),
        raw: item,
      });
    }

    return devices;
  }

  private extractJsonArray(output: string): string {
    const startIndex = output.indexOf('[');
    const endIndex = output.lastIndexOf(']');

    if (
      startIndex === -1 ||
      endIndex === -1 ||
      endIndex < startIndex
    ) {
      throw new Error(
        'Impossible de trouver la liste JSON des appareils Flutter.',
      );
    }

    return output.slice(startIndex, endIndex + 1);
  }

  private readCapabilities(
    value: unknown,
  ): Readonly<Record<string, boolean>> {
    if (!this.isRecord(value)) {
      return {};
    }

    const capabilities: Record<string, boolean> = {};

    for (const [key, capability] of Object.entries(value)) {
      if (typeof capability === 'boolean') {
        capabilities[key] = capability;
      }
    }

    return capabilities;
  }

  private readString(
    record: Readonly<Record<string, unknown>>,
    key: string,
  ): string | null {
    const value = record[key];

    return typeof value === 'string'
      ? value
      : null;
  }

  private readBoolean(
    record: Readonly<Record<string, unknown>>,
    key: string,
  ): boolean | null {
    const value = record[key];

    return typeof value === 'boolean'
      ? value
      : null;
  }

  private isRecord(
    value: unknown,
  ): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    );
  }
}
