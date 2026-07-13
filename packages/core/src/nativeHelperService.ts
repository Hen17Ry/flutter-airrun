import { ProcessRunner } from './processRunner';

export interface NativeHelperVersion {
  type: 'version';
  protocolVersion: number;
  helperVersion: string;
}

export interface NativeHelperDoctorResult {
  type: 'doctor_result';
  protocolVersion: number;
  helperVersion: string;
  platform: string;
  architecture: string;
  status: 'ok' | 'error';
}

export interface NativeHelperQrSession {
  type: 'qr_session';
  protocolVersion: number;
  helperVersion: string;
  serviceName: string;
  password: string;
  qrPayload: string;
}

export interface NativeHelperError {
  type: 'error';
  protocolVersion: number;
  code: string;
  message: string;
}

export type NativeHelperMessage =
  | NativeHelperVersion
  | NativeHelperDoctorResult
  | NativeHelperQrSession
  | NativeHelperError;

export class NativeHelperService {
  public static readonly supportedProtocolVersion = 1;

  public constructor(
    public readonly executablePath: string,
    private readonly processRunner =
      new ProcessRunner(),
  ) {}

  public async getVersion():
    Promise<NativeHelperVersion> {
    const message = await this.runAndParse(
      ['--version'],
      5_000,
    );

    this.throwIfHelperError(message);

    if (message.type !== 'version') {
      throw new Error(
        `Le helper a retourné un message inattendu : ${message.type}.`,
      );
    }

    this.assertProtocolCompatibility(
      message.protocolVersion,
    );

    return message;
  }

  public async doctor():
    Promise<NativeHelperDoctorResult> {
    const message = await this.runAndParse(
      ['doctor'],
      10_000,
    );

    this.throwIfHelperError(message);

    if (message.type !== 'doctor_result') {
      throw new Error(
        `Le helper a retourné un message inattendu : ${message.type}.`,
      );
    }

    this.assertProtocolCompatibility(
      message.protocolVersion,
    );

    return message;
  }

  public async createQrSession():
    Promise<NativeHelperQrSession> {
    const message = await this.runAndParse(
      ['qr-session'],
      5_000,
    );

    this.throwIfHelperError(message);

    if (message.type !== 'qr_session') {
      throw new Error(
        `Le helper a retourné un message inattendu : ${message.type}.`,
      );
    }

    this.assertProtocolCompatibility(
      message.protocolVersion,
    );

    const expectedPayload =
      `WIFI:T:ADB;S:${message.serviceName};P:${message.password};;`;

    if (
      message.qrPayload !==
      expectedPayload
    ) {
      throw new Error(
        'Le payload QR retourné par le helper est incohérent.',
      );
    }

    if (
      !/^airrun-[a-f0-9]{12}$/.test(
        message.serviceName,
      )
    ) {
      throw new Error(
        'Le nom du service QR retourné est invalide.',
      );
    }

    if (
      !/^[a-f0-9]{32}$/.test(
        message.password,
      )
    ) {
      throw new Error(
        'Le secret de la session QR est invalide.',
      );
    }

    return message;
  }

  private async runAndParse(
    args: readonly string[],
    timeoutMs: number,
  ): Promise<NativeHelperMessage> {
    const result = await this.processRunner.run(
      this.executablePath,
      args,
      {
        timeoutMs,
      },
    );

    const output = [
      result.stdout,
      result.stderr,
    ]
      .map(value => value.trim())
      .filter(Boolean)
      .join('\n');

    if (result.timedOut) {
      throw new Error(
        'Le helper natif a dépassé le délai autorisé.',
      );
    }

    const message =
      this.parseLastJsonMessage(output);

    if (
      result.exitCode !== 0 &&
      message.type !== 'error'
    ) {
      throw new Error(
        `Le helper natif a échoué avec le code ${String(result.exitCode)}.`,
      );
    }

    return message;
  }

  private parseLastJsonMessage(
    output: string,
  ): NativeHelperMessage {
    const lines = output
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    for (
      let index = lines.length - 1;
      index >= 0;
      index -= 1
    ) {
      const line = lines[index];

      if (!line) {
        continue;
      }

      try {
        const parsed: unknown =
          JSON.parse(line);

        if (this.isHelperMessage(parsed)) {
          return parsed;
        }
      } catch {
        // Essaie la ligne JSON précédente.
      }
    }

    throw new Error(
      `Le helper n’a retourné aucun message JSON valide.${
        output ? ` Sortie : ${output}` : ''
      }`,
    );
  }

  private isHelperMessage(
    value: unknown,
  ): value is NativeHelperMessage {
    if (!this.isRecord(value)) {
      return false;
    }

    if (
      typeof value.type !== 'string' ||
      typeof value.protocolVersion !== 'number'
    ) {
      return false;
    }

    switch (value.type) {
      case 'version':
        return (
          typeof value.helperVersion ===
          'string'
        );

      case 'doctor_result':
        return (
          typeof value.helperVersion ===
            'string' &&
          typeof value.platform ===
            'string' &&
          typeof value.architecture ===
            'string' &&
          (
            value.status === 'ok' ||
            value.status === 'error'
          )
        );

      case 'qr_session':
        return (
          typeof value.helperVersion ===
            'string' &&
          typeof value.serviceName ===
            'string' &&
          typeof value.password ===
            'string' &&
          typeof value.qrPayload ===
            'string'
        );

      case 'error':
        return (
          typeof value.code === 'string' &&
          typeof value.message === 'string'
        );

      default:
        return false;
    }
  }

  private throwIfHelperError(
    message: NativeHelperMessage,
  ): void {
    if (message.type === 'error') {
      throw new Error(
        `${message.code} : ${message.message}`,
      );
    }
  }

  private assertProtocolCompatibility(
    protocolVersion: number,
  ): void {
    if (
      protocolVersion !==
      NativeHelperService.supportedProtocolVersion
    ) {
      throw new Error(
        `Version de protocole incompatible. Extension : ${
          NativeHelperService.supportedProtocolVersion
        }, helper : ${protocolVersion}.`,
      );
    }
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
