import {
  spawn,
} from 'node:child_process';

import {
  access,
} from 'node:fs/promises';

import * as path from 'node:path';

import {
  DeviceDiscoveryService,
  ExecutableLocator,
  QrPairingSessionService,
  PairingService,
  ProcessRunner,
  QrPairingService,
  WirelessFlutterDeviceService,
  type AdbMdnsService,
  type QrPairingStage,
  type WirelessFlutterDevice,
} from '@flutter-airrun/core';

import * as QRCode from 'qrcode';


import {
  printBrandBanner,
} from './branding';

import {
  ask,
  choose,
  failure,
  printTitle,
  readSecret,
  success,
  warning,
} from './terminal';

const CLI_VERSION = '0.1.0';

async function main(): Promise<void> {
  const args =
    process.argv.slice(2);

  if (
    args.includes('--version') ||
    args.includes('-v')
  ) {
    console.log(
      `Flutter AirRun CLI ${CLI_VERSION}`,
    );

    return;
  }

  if (
    args.includes('--help') ||
    args.includes('-h')
  ) {
    printBrandBanner(
      CLI_VERSION,
    );

    printHelp();
    return;
  }

  printBrandBanner(
    CLI_VERSION,
  );

  if (args.length === 0) {
    await interactiveMenu();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'doctor':
      await doctorCommand();
      return;

    case 'devices':
      await devicesCommand();
      return;

    case 'status':
      await statusCommand();
      return;

    case 'pair':
      await pairCommand(
        args.slice(1),
      );
      return;

    case 'run':
      await runCommand(
        args.slice(1),
      );
      return;

    case 'help':
      printHelp();
      return;

    default:
      throw new Error(
        `Commande inconnue : ${String(command)}. Lancez "airrun --help".`,
      );
  }
}

async function interactiveMenu():
  Promise<void> {
  const actions = [
    {
      id: 'run',
      label:
        '▶  Lancer l’application sans fil',
    },
    {
      id: 'pair-qr',
      label:
        '▦  Associer un téléphone par QR code',
    },
    {
      id: 'pair-code',
      label:
        '#  Associer un téléphone avec un code',
    },
    {
      id: 'doctor',
      label:
        '✓  Vérifier l’environnement',
    },
    {
      id: 'devices',
      label:
        '◉  Afficher les appareils',
    },
    {
      id: 'status',
      label:
        '≋  Vérifier le débogage sans fil',
    },
    {
      id: 'quit',
      label:
        '×  Quitter',
    },
  ] as const;

  while (true) {
    const action = await choose(
      'Que voulez-vous faire ?',
      actions,
      item => item.label,
    );

    if (action.id === 'quit') {
      console.log();
      success(
        'À bientôt sur Flutter AirRun.',
      );

      return;
    }

    try {
      switch (action.id) {
        case 'run':
          await runCommand([]);
          break;

        case 'pair-qr':
          await pairQrCommand();
          break;

        case 'pair-code':
          await pairCodeCommand();
          break;

        case 'doctor':
          await doctorCommand();
          break;

        case 'devices':
          await devicesCommand();
          break;

        case 'status':
          await statusCommand();
          break;
      }
    } catch (error) {
      console.log();

      failure(
        errorMessage(error),
      );
    }

    /*
     * Une action exécutée depuis le menu ne doit
     * pas fermer toute la CLI. L’utilisateur peut
     * revenir au menu ou quitter avec Ctrl+C.
     */
    console.log();

    await ask(
      'Appuyez sur Entrée pour revenir au menu…',
    );

    console.log();
  }
}

async function doctorCommand():
  Promise<void> {
  printTitle(
    'Flutter AirRun Doctor',
  );

  const locator =
    new ExecutableLocator();

  const runner =
    new ProcessRunner();

  const [
    flutterPath,
    adbPath,
  ] = await Promise.all([
    locator.findFlutter(),
    locator.findAdb(),
  ]);

  let environmentReady = true;

  if (flutterPath) {
    const result =
      await runner.run(
        flutterPath,
        ['--version'],
        {
          timeoutMs: 15_000,
        },
      );

    const firstLine =
      result.stdout
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);

    success(
      `Flutter : ${
        firstLine ?? flutterPath
      }`,
    );
  } else {
    environmentReady = false;

    failure(
      'Flutter est introuvable.',
    );
  }

  if (adbPath) {
    const result =
      await runner.run(
        adbPath,
        ['version'],
        {
          timeoutMs: 10_000,
        },
      );

    const firstLine =
      result.stdout
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);

    success(
      `ADB : ${
        firstLine ?? adbPath
      }`,
    );
  } else {
    environmentReady = false;

    failure(
      'ADB est introuvable.',
    );
  }

  try {
    const qrGenerator =
      new QrPairingSessionService();

    const qrDoctor =
      qrGenerator.doctor();

    success(
      [
        'Générateur QR TypeScript',
        qrDoctor.generatorVersion,
        '—',
        `${qrDoctor.platform}/${qrDoctor.architecture}`,
      ].join(' '),
    );
  } catch (error) {
    environmentReady = false;

    failure(
      errorMessage(error),
    );
  }

  const projectRoot =
    await findFlutterProjectRoot(
      process.cwd(),
    );

  if (projectRoot) {
    success(
      `Projet Flutter : ${projectRoot}`,
    );
  } else {
    warning(
      'Le dossier actuel n’est pas un projet Flutter.',
    );
  }

  console.log();

  if (environmentReady) {
    success(
      'Environnement Flutter AirRun prêt.',
    );
  } else {
    failure(
      'L’environnement nécessite une correction.',
    );

    process.exitCode = 1;
  }
}

async function devicesCommand():
  Promise<void> {
  printTitle(
    'Appareils Flutter AirRun',
  );

  const service =
    new DeviceDiscoveryService();

  const report =
    await service.discover();

  console.log(
    `ADB : ${report.adbPath}`,
  );

  console.log();

  if (
    report.adbDevices.length === 0
  ) {
    warning(
      'Aucun appareil ADB détecté.',
    );
  }

  for (
    const device of
    report.adbDevices
  ) {
    const marker =
      device.state === 'device'
        ? '●'
        : '○';

    console.log(
      `${marker} ${
        device.model ??
        device.serial
      }`,
    );

    console.log(
      `  Série      : ${device.serial}`,
    );

    console.log(
      `  État       : ${device.state}`,
    );

    console.log(
      `  Connexion  : ${device.connectionType}`,
    );

    console.log();
  }

  console.log(
    `Appareils Android Flutter utilisables : ${report.androidFlutterDevices.length}`,
  );

  for (
    const device of
    report.androidFlutterDevices
  ) {
    console.log();
    success(
      `${device.name} — ${device.id}`,
    );

    console.log(
      `  Plateforme : ${device.targetPlatform}`,
    );

    console.log(
      `  SDK        : ${device.sdk}`,
    );
  }
}

async function statusCommand():
  Promise<void> {
  printTitle(
    'État du débogage sans fil',
  );

  const locator =
    new ExecutableLocator();

  const runner =
    new ProcessRunner();

  const adbPath =
    await locator.findAdb();

  if (!adbPath) {
    throw new Error(
      'ADB est introuvable.',
    );
  }

  const [
    checkResult,
    servicesResult,
    devicesResult,
  ] = await Promise.all([
    runner.run(
      adbPath,
      ['mdns', 'check'],
      {
        timeoutMs: 10_000,
      },
    ),
    runner.run(
      adbPath,
      ['mdns', 'services'],
      {
        timeoutMs: 10_000,
      },
    ),
    runner.run(
      adbPath,
      ['devices', '-l'],
      {
        timeoutMs: 10_000,
      },
    ),
  ]);

  if (
    checkResult.exitCode === 0
  ) {
    success(
      checkResult.stdout.trim() ||
      'mDNS disponible.',
    );
  } else {
    failure(
      checkResult.stderr.trim() ||
      'mDNS indisponible.',
    );
  }

  console.log();
  console.log(
    'Services mDNS :',
  );

  console.log(
    servicesResult.stdout.trim() ||
    '  Aucun service détecté.',
  );

  console.log();
  console.log(
    'Appareils ADB :',
  );

  console.log(
    devicesResult.stdout.trim(),
  );
}

async function pairCommand(
  args: readonly string[],
): Promise<void> {
  const mode = args[0];

  switch (mode) {
    case 'qr':
      await pairQrCommand();
      return;

    case 'code':
      await pairCodeCommand();
      return;

    default:
      throw new Error(
        'Utilisez "airrun pair qr" ou "airrun pair code".',
      );
  }
}

async function pairQrCommand():
  Promise<void> {
  printTitle(
    'Association par QR code',
  );

  const qrGenerator =
    new QrPairingSessionService();

  const qrDoctor =
    qrGenerator.doctor();

  if (qrDoctor.status !== 'ok') {
    throw new Error(
      'Le générateur QR TypeScript n’est pas prêt.',
    );
  }

  const session =
    qrGenerator.createQrSession();

  const qr =
    await QRCode.toString(
      session.qrPayload,
      {
        type: 'terminal',
        small: true,
        errorCorrectionLevel: 'M',
      },
    );

  console.log(
    'Sur le téléphone :',
  );

  console.log(
    'Débogage sans fil → Associer un appareil avec un code QR',
  );

  console.log();
  console.log(qr);

  const controller =
    new AbortController();

  const handleInterrupt =
    (): void => {
      controller.abort();
    };

  process.once(
    'SIGINT',
    handleInterrupt,
  );

  try {
    const service =
      new QrPairingService();

    const result =
      await service.pair(
        session.serviceName,
        session.password,
        {
          signal:
            controller.signal,
          timeoutMs: 120_000,
          onStage:
            printQrStage,
        },
      );

    console.log();

    success(
      `Association réussie avec ${result.instanceName}.`,
    );

    success(
      `Endpoint : ${result.endpoint}`,
    );

    if (result.device) {
      success(
        `Appareil connecté : ${
          result.device.model ??
          result.device.serial
        }`,
      );
    } else {
      warning(
        'Association réussie, mais la connexion Flutter n’est pas encore visible.',
      );
    }
  } finally {
    process.off(
      'SIGINT',
      handleInterrupt,
    );
  }
}

async function pairCodeCommand():
  Promise<void> {
  printTitle(
    'Association avec un code',
  );

  console.log(
    'Sur le téléphone, ouvrez :',
  );

  console.log(
    'Débogage sans fil → Associer l’appareil avec un code d’association',
  );

  console.log();
  console.log(
    'Recherche du service pendant 60 secondes…',
  );

  const pairingService =
    new PairingService();

  const services =
    await waitForPairingServices(
      pairingService,
      60_000,
    );

  const selectedService =
    await choose(
      'Services détectés :',
      services,
      service =>
        `${service.instanceName} — ${service.endpoint}`,
    );

  const code =
    await readSecret(
      'Code à 6 chiffres : ',
    );

  if (!/^\d{6}$/.test(code)) {
    throw new Error(
      'Le code doit contenir exactement six chiffres.',
    );
  }

  const result =
    await pairingService.pair(
      selectedService,
      code,
    );

  console.log();

  success(
    `Association réussie avec ${result.instanceName}.`,
  );

  success(
    `Endpoint : ${result.endpoint}`,
  );

  if (result.device) {
    success(
      `Appareil connecté : ${
        result.device.model ??
        result.device.serial
      }`,
    );
  }
}

async function runCommand(
  args: readonly string[],
): Promise<void> {
  printTitle(
    'Lancement sans fil',
  );

  const projectRoot =
    await findFlutterProjectRoot(
      process.cwd(),
    );

  if (!projectRoot) {
    throw new Error(
      'Aucun pubspec.yaml trouvé. Lancez cette commande dans un projet Flutter.',
    );
  }

  const parsedArgs =
    parseRunArguments(args);

  const deviceService =
    new WirelessFlutterDeviceService();

  console.log(
    'Recherche des appareils sans fil…',
  );

  const result =
  await deviceService.listDevices();

  if (
    result.devices.length === 0
  ) {
    throw new Error(
      'Aucun appareil Android sans fil utilisable. Activez le débogage sans fil ou associez le téléphone.',
    );
  }

  const selectableDevices =
    selectPreferredRunDevices(
      result.devices,
    );

  let selectedDevice:
    WirelessFlutterDevice

  if (parsedArgs.deviceId) {
  const matchingDevice =
    selectableDevices.find(
      device =>
        device.flutterDevice.id ===
          parsedArgs.deviceId ||
        device.adbDevice.serial ===
          parsedArgs.deviceId,
    );

  if (!matchingDevice) {
    throw new Error(
      `Appareil introuvable : ${parsedArgs.deviceId}`,
    );
  }

  selectedDevice =
    matchingDevice;
  } else {
    selectedDevice =
      await choose(
        'Appareils disponibles :',
        selectableDevices,
        device =>
          `${
            device.flutterDevice.name
          } — ${
            device.flutterDevice.id
          }`,
      );
  }

  console.log();

  success(
    `Projet : ${path.basename(projectRoot)}`,
  );

  success(
    `Appareil : ${selectedDevice.flutterDevice.name}`,
  );

  success(
    `Device ID : ${selectedDevice.flutterDevice.id}`,
  );

  console.log();
  console.log(
    'Lancement de Flutter…',
  );
  console.log();

  const exitCode =
    await spawnInteractive(
      result.flutterPath,
      [
        'run',
        '-d',
        selectedDevice
          .flutterDevice.id,
        ...parsedArgs.flutterArgs,
      ],
      projectRoot,
    );

  process.exitCode =
    exitCode;
}

async function waitForPairingServices(
  pairingService: PairingService,
  timeoutMs: number,
): Promise<
  readonly AdbMdnsService[]
> {
  const deadline =
    Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const services =
      await pairingService
        .findPairingServices();

    if (services.length > 0) {
      return services;
    }

    await delay(1_000);
  }

  throw new Error(
    'Aucun service d’association détecté. Vérifiez que l’écran du code est ouvert sur le téléphone.',
  );
}

function printQrStage(
  stage: QrPairingStage,
): void {
  switch (stage) {
    case 'waiting-for-scan':
      console.log(
        'En attente du scan…',
      );
      return;

    case 'service-found':
      success(
        'Téléphone détecté.',
      );
      return;

    case 'pairing':
      console.log(
        'Association sécurisée en cours…',
      );
      return;

    case 'paired':
      success(
        'Association ADB réussie.',
      );
  }
}

function selectPreferredRunDevices(
  devices:
    readonly WirelessFlutterDevice[],
): readonly WirelessFlutterDevice[] {
  const tcpDevices =
    devices.filter(device =>
      isTcpDeviceId(
        device.flutterDevice.id,
      ),
    );

  /*
   * Les transports IP:port sont ceux que
   * Flutter AirRun restaure explicitement.
   * Ils évitent les problèmes de parsing
   * des identifiants mDNS dans Flutter.
   */
  if (tcpDevices.length > 0) {
    return tcpDevices;
  }

  return devices;
}

function isTcpDeviceId(
  deviceId: string,
): boolean {
  return (
    /^\[[^\]]+\]:\d+$/.test(
      deviceId,
    ) ||
    /^[^\s]+:\d+$/.test(
      deviceId,
    )
  );
}

function parseRunArguments(
  args: readonly string[],
): {
  deviceId: string | null;
  flutterArgs: readonly string[];
} {
  let deviceId: string | null =
    null;

  const flutterArgs: string[] = [];

  for (
    let index = 0;
    index < args.length;
    index += 1
  ) {
    const argument = args[index];

    if (
      argument === '--device' ||
      argument === '-d'
    ) {
      const value =
        args[index + 1];

      if (!value) {
        throw new Error(
          'Un identifiant est requis après --device.',
        );
      }

      deviceId = value;
      index += 1;
      continue;
    }

    if (argument === '--') {
      flutterArgs.push(
        ...args.slice(index + 1),
      );

      break;
    }

    if (argument) {
      flutterArgs.push(
        argument,
      );
    }
  }

  return {
    deviceId,
    flutterArgs,
  };
}

async function findFlutterProjectRoot(
  startDirectory: string,
): Promise<string | null> {
  let currentDirectory =
    path.resolve(startDirectory);

  while (true) {
    const pubspecPath =
      path.join(
        currentDirectory,
        'pubspec.yaml',
      );

    try {
      await access(pubspecPath);

      return currentDirectory;
    } catch {
      // Continue vers le dossier parent.
    }

    const parentDirectory =
      path.dirname(
        currentDirectory,
      );

    if (
      parentDirectory ===
      currentDirectory
    ) {
      return null;
    }

    currentDirectory =
      parentDirectory;
  }
}

async function spawnInteractive(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<number> {
  return new Promise<number>(
    (resolve, reject) => {
      const child = spawn(
        command,
        [...args],
        {
          cwd,
          env: process.env,
          stdio: 'inherit',
          shell: false,
          windowsHide: false,
        },
      );

      child.once(
        'error',
        reject,
      );

      child.once(
        'close',
        exitCode => {
          resolve(
            exitCode ?? 1,
          );
        },
      );
    },
  );
}

function printHelp(): void {
  console.log(`
Flutter AirRun CLI ${CLI_VERSION}

Utilisation :
  airrun
  airrun <commande>

Commandes :
  doctor                 Vérifier Flutter, ADB et le générateur QR
  devices                Afficher les appareils disponibles
  status                 Vérifier mDNS et le débogage sans fil
  pair qr                Associer un téléphone par QR code
  pair code              Associer avec un code à six chiffres
  run                     Lancer le projet Flutter sans fil
  run -d <device-id>      Utiliser un appareil précis
  run -- <arguments>      Transmettre des arguments à flutter run

Exemples :
  airrun doctor
  airrun pair qr
  airrun pair code
  airrun run
  airrun run -- --debug
  airrun run -d 192.168.0.132:46027
`);
}

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

async function delay(
  durationMs: number,
): Promise<void> {
  await new Promise<void>(
    resolve => {
      setTimeout(
        resolve,
        durationMs,
      );
    },
  );
}

main().catch(error => {
  console.log();

  failure(
    errorMessage(error),
  );

  process.exitCode = 1;
});
