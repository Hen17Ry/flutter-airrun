import {
  QrPairingSessionService,
} from '../dist/index.js';

const service =
  new QrPairingSessionService();

const doctor =
  service.doctor();

const first =
  service.createQrSession();

const second =
  service.createQrSession();

function assert(
  condition,
  message,
) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  doctor.status === 'ok',
  'Le diagnostic du générateur a échoué.',
);

assert(
  first.serviceName.startsWith(
    'airrun-',
  ),
  'Le nom du service est invalide.',
);

assert(
  /^airrun-[0-9a-f]{12}$/.test(
    first.serviceName,
  ),
  'Le nom du service ne respecte pas le format attendu.',
);

assert(
  /^[0-9a-f]{32}$/.test(
    first.password,
  ),
  'Le secret ne contient pas 16 octets.',
);

assert(
  first.qrPayload ===
    `WIFI:T:ADB;S:${first.serviceName};P:${first.password};;`,
  'Le payload QR est invalide.',
);

assert(
  first.serviceName !==
    second.serviceName,
  'Deux sessions ont reçu le même nom.',
);

assert(
  first.password !==
    second.password,
  'Deux sessions ont reçu le même secret.',
);

console.log(
  JSON.stringify(
    {
      doctor,
      session: {
        ...first,
        password:
          '[REDACTED]',
        qrPayload:
          '[REDACTED]',
      },
      status:
        'ok',
    },
    null,
    2,
  ),
);
