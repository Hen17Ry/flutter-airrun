import {
  randomBytes,
} from 'node:crypto';

export const QR_PAIRING_PROTOCOL_VERSION =
  1 as const;

export const QR_PAIRING_GENERATOR_VERSION =
  '1.0.0';

export interface QrPairingSession {
  type: 'qr_session';
  protocolVersion:
    typeof QR_PAIRING_PROTOCOL_VERSION;
  generator:
    'typescript';
  generatorVersion: string;
  serviceName: string;
  password: string;
  qrPayload: string;
}

export interface QrPairingGeneratorDoctor {
  type: 'qr_generator_doctor';
  protocolVersion:
    typeof QR_PAIRING_PROTOCOL_VERSION;
  generator:
    'typescript';
  generatorVersion: string;
  platform: NodeJS.Platform;
  architecture: NodeJS.Architecture;
  status: 'ok';
}

export class QrPairingSessionService {
  public doctor():
    QrPairingGeneratorDoctor {
    return {
      type:
        'qr_generator_doctor',

      protocolVersion:
        QR_PAIRING_PROTOCOL_VERSION,

      generator:
        'typescript',

      generatorVersion:
        QR_PAIRING_GENERATOR_VERSION,

      platform:
        process.platform,

      architecture:
        process.arch,

      status:
        'ok',
    };
  }

  public createQrSession():
    QrPairingSession {
    /*
     * 6 octets produisent un identifiant
     * temporaire de 12 caractères hexadécimaux.
     */
    const serviceName =
      `airrun-${this.randomHex(6)}`;

    /*
     * 16 octets produisent un secret temporaire
     * de 128 bits, comme dans l’ancien helper.
     */
    const password =
      this.randomHex(16);

    const qrPayload =
      [
        'WIFI:T:ADB',
        `S:${serviceName}`,
        `P:${password}`,
        '',
        '',
      ].join(';');

    return {
      type:
        'qr_session',

      protocolVersion:
        QR_PAIRING_PROTOCOL_VERSION,

      generator:
        'typescript',

      generatorVersion:
        QR_PAIRING_GENERATOR_VERSION,

      serviceName,
      password,
      qrPayload,
    };
  }

  private randomHex(
    byteCount: number,
  ): string {
    if (
      !Number.isInteger(byteCount) ||
      byteCount <= 0
    ) {
      throw new Error(
        'Le nombre d’octets doit être un entier strictement positif.',
      );
    }

    return randomBytes(
      byteCount,
    ).toString('hex');
  }
}
