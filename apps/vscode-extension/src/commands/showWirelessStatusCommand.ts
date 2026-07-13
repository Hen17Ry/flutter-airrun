import {
  WirelessStatusService,
  type AdbMdnsService,
} from '@flutter-airrun/core';

import * as vscode from 'vscode';

export const SHOW_WIRELESS_STATUS_COMMAND =
  'flutterAirRun.wirelessStatus';

export function registerShowWirelessStatusCommand(
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  const wirelessStatusService =
    new WirelessStatusService();

  return vscode.commands.registerCommand(
    SHOW_WIRELESS_STATUS_COMMAND,
    async (): Promise<void> => {
      await vscode.window.withProgress(
        {
          location:
            vscode.ProgressLocation.Notification,
          title:
            'Flutter AirRun analyse les connexions sans fil…',
          cancellable: false,
        },
        async () => {
          try {
            const report =
              await wirelessStatusService.inspect();

            outputChannel.clear();

            outputChannel.appendLine(
              '========================================',
            );
            outputChannel.appendLine(
              'Flutter AirRun Wireless Status',
            );
            outputChannel.appendLine(
              '========================================',
            );

            outputChannel.appendLine(
              `Inspection : ${report.inspectedAt}`,
            );

            outputChannel.appendLine(
              `ADB : ${report.adbPath}`,
            );

            outputChannel.appendLine(
              `mDNS : ${
                report.mdnsAvailable
                  ? 'disponible'
                  : 'indisponible'
              }`,
            );

            if (report.mdnsDiagnostic) {
              outputChannel.appendLine(
                `Diagnostic : ${report.mdnsDiagnostic}`,
              );
            }

            outputChannel.appendLine('');
            outputChannel.appendLine(
              `Services d’association : ${report.pairingServices.length}`,
            );

            writeServices(
              outputChannel,
              report.pairingServices,
            );

            outputChannel.appendLine('');
            outputChannel.appendLine(
              `Services de connexion : ${report.connectionServices.length}`,
            );

            writeServices(
              outputChannel,
              report.connectionServices,
            );

            outputChannel.appendLine('');
            outputChannel.appendLine(
              `Appareils sans fil connectés : ${report.connectedWirelessDevices.length}`,
            );

            for (
              const device of
              report.connectedWirelessDevices
            ) {
              outputChannel.appendLine('');
              outputChannel.appendLine(
                `  ${device.model ?? device.serial}`,
              );
              outputChannel.appendLine(
                `    ID       : ${device.serial}`,
              );
              outputChannel.appendLine(
                `    État     : ${device.state}`,
              );
              outputChannel.appendLine(
                `    Produit  : ${
                  device.product ?? 'inconnu'
                }`,
              );
            }

            outputChannel.show(true);

            const message =
              report.connectedWirelessDevices
                .length > 0
                ? `${report.connectedWirelessDevices.length} appareil(s) Android connecté(s) sans fil.`
                : report.pairingServices.length > 0
                  ? 'Un appareil attend une association.'
                  : 'Aucun appareil sans fil détecté.';

            await vscode.window.showInformationMessage(
              message,
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

function writeServices(
  outputChannel: vscode.OutputChannel,
  services: readonly AdbMdnsService[],
): void {
  if (services.length === 0) {
    outputChannel.appendLine(
      '  Aucun service détecté.',
    );

    return;
  }

  for (const service of services) {
    outputChannel.appendLine('');
    outputChannel.appendLine(
      `  ${service.instanceName}`,
    );
    outputChannel.appendLine(
      `    Type      : ${service.registrationType}`,
    );
    outputChannel.appendLine(
      `    Adresse   : ${service.host}`,
    );
    outputChannel.appendLine(
      `    Port      : ${service.port}`,
    );
    outputChannel.appendLine(
      `    Endpoint  : ${service.endpoint}`,
    );
  }
}
