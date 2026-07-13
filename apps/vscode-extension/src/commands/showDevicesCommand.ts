import {
  DeviceDiscoveryService,
  type AdbDevice,
  type FlutterDevice,
} from '@flutter-airrun/core';

import * as vscode from 'vscode';

export const SHOW_DEVICES_COMMAND =
  'flutterAirRun.devices';

export function registerShowDevicesCommand(
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  const discoveryService =
    new DeviceDiscoveryService();

  return vscode.commands.registerCommand(
    SHOW_DEVICES_COMMAND,
    async (): Promise<void> => {
      await vscode.window.withProgress(
        {
          location:
            vscode.ProgressLocation.Notification,
          title:
            'Flutter AirRun recherche les appareils…',
          cancellable: false,
        },
        async () => {
          try {
            const report =
              await discoveryService.discover();

            outputChannel.clear();

            outputChannel.appendLine(
              '========================================',
            );
            outputChannel.appendLine(
              'Flutter AirRun Devices',
            );
            outputChannel.appendLine(
              '========================================',
            );
            outputChannel.appendLine(
              `Détection : ${report.discoveredAt}`,
            );

            outputChannel.appendLine('');
            outputChannel.appendLine(
              `ADB : ${report.adbPath}`,
            );
            outputChannel.appendLine(
              `Appareils ADB : ${report.adbDevices.length}`,
            );

            if (report.adbDevices.length === 0) {
              outputChannel.appendLine(
                '  Aucun appareil ADB détecté.',
              );
            }

            for (const device of report.adbDevices) {
              writeAdbDevice(
                outputChannel,
                device,
              );
            }

            outputChannel.appendLine('');
            outputChannel.appendLine(
              `Flutter : ${report.flutterPath}`,
            );
            outputChannel.appendLine(
              `Appareils Flutter : ${report.flutterDevices.length}`,
            );

            for (const device of report.flutterDevices) {
              writeFlutterDevice(
                outputChannel,
                device,
              );
            }

            outputChannel.appendLine('');
            outputChannel.appendLine(
              `Appareils Android utilisables : ${report.androidFlutterDevices.length}`,
            );

            outputChannel.show(true);

            if (
              report.androidFlutterDevices.length === 0
            ) {
              await vscode.window.showWarningMessage(
                'Aucun appareil Android utilisable par Flutter n’a été détecté.',
              );

              return;
            }

            const selectedDevice =
              await vscode.window.showQuickPick(
                report.androidFlutterDevices.map(
                  device => ({
                    label: `${
                      device.emulator
                        ? '$(vm)'
                        : '$(device-mobile)'
                    } ${device.name}`,
                    description:
                      device.targetPlatform ??
                      'Android',
                    detail:
                      `${device.id} — ${
                        device.sdk ??
                        'SDK inconnu'
                      }`,
                    device,
                  }),
                ),
                {
                  title:
                    'Flutter AirRun — Appareils Android',
                  placeHolder:
                    'Sélectionnez un appareil',
                  matchOnDescription: true,
                  matchOnDetail: true,
                },
              );

            if (!selectedDevice) {
              return;
            }

            await vscode.window.showInformationMessage(
              `Appareil sélectionné : ${selectedDevice.device.name}`,
            );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : String(error);

            outputChannel.appendLine('');
            outputChannel.appendLine(
              `ERREUR : ${message}`,
            );
            outputChannel.show(true);

            await vscode.window.showErrorMessage(
              `Flutter AirRun : ${message}`,
            );
          }
        },
      );
    },
  );
}

function writeAdbDevice(
  outputChannel: vscode.OutputChannel,
  device: AdbDevice,
): void {
  outputChannel.appendLine('');
  outputChannel.appendLine(
    `  ${device.model ?? device.serial}`,
  );
  outputChannel.appendLine(
    `    Série       : ${device.serial}`,
  );
  outputChannel.appendLine(
    `    État        : ${device.state}`,
  );
  outputChannel.appendLine(
    `    Connexion   : ${device.connectionType}`,
  );
  outputChannel.appendLine(
    `    Produit     : ${device.product ?? 'inconnu'}`,
  );
  outputChannel.appendLine(
    `    Transport   : ${device.transportId ?? 'inconnu'}`,
  );
}

function writeFlutterDevice(
  outputChannel: vscode.OutputChannel,
  device: FlutterDevice,
): void {
  outputChannel.appendLine('');
  outputChannel.appendLine(
    `  ${device.name}`,
  );
  outputChannel.appendLine(
    `    ID          : ${device.id}`,
  );
  outputChannel.appendLine(
    `    Plateforme  : ${device.targetPlatform ?? 'inconnue'}`,
  );
  outputChannel.appendLine(
    `    SDK         : ${device.sdk ?? 'inconnu'}`,
  );
  outputChannel.appendLine(
    `    Émulateur   : ${device.emulator ? 'oui' : 'non'}`,
  );
  outputChannel.appendLine(
    `    Compatible  : ${device.isSupported ? 'oui' : 'non'}`,
  );
}
