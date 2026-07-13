import {
  PairingService,
  type AdbMdnsService,
} from '@flutter-airrun/core';

import * as vscode from 'vscode';

export const PAIR_DEVICE_COMMAND =
  'flutterAirRun.pairDevice';

interface PairingQuickPickItem
  extends vscode.QuickPickItem {
  service: AdbMdnsService;
}

export function registerPairDeviceCommand(
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  const pairingService =
    new PairingService();

  return vscode.commands.registerCommand(
    PAIR_DEVICE_COMMAND,
    async (): Promise<void> => {
      try {
        const services =
          await vscode.window.withProgress(
            {
              location:
                vscode.ProgressLocation.Notification,
              title:
                'Flutter AirRun recherche les appareils en attente…',
              cancellable: false,
            },
            async () =>
              pairingService.findPairingServices(),
          );

        if (services.length === 0) {
          await vscode.window.showWarningMessage(
            'Aucun appareil en attente d’association. Ouvrez “Associer un appareil avec un code” dans les paramètres de débogage sans fil du téléphone.',
          );

          return;
        }

        const selectedService =
          await selectPairingService(services);

        if (!selectedService) {
          return;
        }

        const pairingCode =
          await vscode.window.showInputBox({
            title:
              'Flutter AirRun — Code d’association',
            prompt:
              'Saisissez le code à six chiffres affiché sur le téléphone.',
            placeHolder: '000000',
            password: true,
            ignoreFocusOut: true,
            validateInput: value => {
              const normalizedValue =
                value.trim();

              if (
                /^\d{6}$/.test(normalizedValue)
              ) {
                return undefined;
              }

              return 'Le code doit contenir exactement six chiffres.';
            },
          });

        if (!pairingCode) {
          return;
        }

        const result =
          await vscode.window.withProgress(
            {
              location:
                vscode.ProgressLocation.Notification,
              title:
                `Association avec ${selectedService.service.endpoint}…`,
              cancellable: false,
            },
            async () =>
              pairingService.pair(
                selectedService.service,
                pairingCode,
              ),
          );

        /*
         * Le code d’association n’est volontairement
         * jamais écrit dans ce rapport.
         */
        outputChannel.clear();

        outputChannel.appendLine(
          '========================================',
        );
        outputChannel.appendLine(
          'Flutter AirRun Pairing',
        );
        outputChannel.appendLine(
          '========================================',
        );

        outputChannel.appendLine(
          `Service   : ${result.instanceName}`,
        );

        outputChannel.appendLine(
          `Endpoint  : ${result.endpoint}`,
        );

        outputChannel.appendLine(
          `Associé   : ${result.paired ? 'oui' : 'non'}`,
        );

        outputChannel.appendLine(
          `Connecté  : ${result.connected ? 'oui' : 'non'}`,
        );

        if (result.device) {
          outputChannel.appendLine('');
          outputChannel.appendLine(
            `Appareil  : ${
              result.device.model ??
              result.device.serial
            }`,
          );

          outputChannel.appendLine(
            `ID        : ${result.device.serial}`,
          );

          outputChannel.appendLine(
            `État      : ${result.device.state}`,
          );
        }

        if (result.adbOutput) {
          outputChannel.appendLine('');
          outputChannel.appendLine(
            'Réponse ADB :',
          );

          for (
            const line of
            result.adbOutput.split(/\r?\n/)
          ) {
            outputChannel.appendLine(
              `  ${line}`,
            );
          }
        }

        outputChannel.show(true);

        if (result.connected && result.device) {
          await vscode.window.showInformationMessage(
            `${
              result.device.model ??
              'Le téléphone'
            } est associé et connecté à Flutter AirRun.`,
          );

          return;
        }

        await vscode.window.showWarningMessage(
          'Le téléphone est associé, mais la connexion automatique n’a pas encore été confirmée.',
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
}

async function selectPairingService(
  services: readonly AdbMdnsService[],
): Promise<PairingQuickPickItem | undefined> {
  if (services.length === 1) {
    const service = services[0];

    if (!service) {
      return undefined;
    }

    return {
      label: '$(device-mobile) Appareil Android',
      description: service.endpoint,
      detail: service.instanceName,
      service,
    };
  }

  return vscode.window.showQuickPick(
    services.map(service => ({
      label: '$(device-mobile) Appareil Android',
      description: service.endpoint,
      detail: service.instanceName,
      service,
    })),
    {
      title:
        'Flutter AirRun — Appareils en attente',
      placeHolder:
        'Sélectionnez l’appareil à associer',
      matchOnDescription: true,
      matchOnDetail: true,
    },
  );
}
