import {
  NativeHelperService,
  QrPairingService,
  type QrPairingStage,
} from '@flutter-airrun/core';

import * as vscode from 'vscode';

import {
  showQrSessionPanel,
} from '../panels/qrSessionPanel';

import {
  resolveHelperPath,
} from '../services/helperPathResolver';

export const QR_PAIR_DEVICE_COMMAND =
  'flutterAirRun.pairDeviceWithQr';

export function registerQrPairDeviceCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    QR_PAIR_DEVICE_COMMAND,
    async (): Promise<void> => {
      await vscode.window.withProgress(
        {
          location:
            vscode.ProgressLocation.Notification,
          title:
            'Flutter AirRun — Association QR',
          cancellable: true,
        },
        async (
          progress,
          cancellationToken,
        ) => {
          const controller =
            new AbortController();

          let panel:
            vscode.WebviewPanel |
            undefined;

          let panelDisposable:
            vscode.Disposable |
            undefined;

          const cancellationDisposable =
            cancellationToken
              .onCancellationRequested(
                () => {
                  controller.abort();
                },
              );

          try {
            progress.report({
              message:
                'Préparation de la session…',
            });

            const resolution =
              await resolveHelperPath(
                context,
              );

            if (
              !resolution.executablePath
            ) {
              throw new Error(
                'Le helper natif QR est introuvable.',
              );
            }

            const helper =
              new NativeHelperService(
                resolution.executablePath,
              );

            const doctor =
              await helper.doctor();

            if (
              doctor.status !== 'ok'
            ) {
              throw new Error(
                'Le helper natif QR n’est pas prêt.',
              );
            }

            const session =
              await helper
                .createQrSession();

            panel =
              await showQrSessionPanel(
                session,
                'pairing',
              );

            panelDisposable =
              panel.onDidDispose(
                () => {
                  controller.abort();
                },
              );

            const qrPairingService =
              new QrPairingService();

            const result =
              await qrPairingService.pair(
                session.serviceName,
                session.password,
                {
                  signal:
                    controller.signal,
                  timeoutMs: 120_000,
                  onStage: stage => {
                    progress.report({
                      message:
                        stageMessage(
                          stage,
                        ),
                    });
                  },
                },
              );

            panelDisposable.dispose();
            panelDisposable =
              undefined;

            panel.dispose();
            panel = undefined;

            outputChannel.appendLine(
              '========================================',
            );

            outputChannel.appendLine(
              'Flutter AirRun QR Pairing',
            );

            outputChannel.appendLine(
              '========================================',
            );

            outputChannel.appendLine(
              `Service     : ${result.instanceName}`,
            );

            outputChannel.appendLine(
              `Endpoint    : ${result.endpoint}`,
            );

            outputChannel.appendLine(
              `Associé     : ${result.paired ? 'oui' : 'non'}`,
            );

            outputChannel.appendLine(
              `Connecté    : ${result.connected ? 'oui' : 'non'}`,
            );

            if (result.device) {
              outputChannel.appendLine(
                `Appareil    : ${
                  result.device.model ??
                  result.device.serial
                }`,
              );

              outputChannel.appendLine(
                `Série       : ${result.device.serial}`,
              );
            }

            outputChannel.appendLine(
              `ADB         : ${result.adbOutput}`,
            );

            outputChannel.show(true);

            void vscode.window
              .showInformationMessage(
                'Téléphone associé avec succès par QR code.',
              );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : String(error);

            const wasCancelled =
              controller.signal.aborted ||
              /annulée/i.test(message);

            if (wasCancelled) {
              outputChannel.appendLine(
                '[QR] Association annulée.',
              );

              void vscode.window
                .showInformationMessage(
                  'Association QR annulée.',
                );

              return;
            }

            outputChannel.appendLine(
              `[QR] ERREUR : ${message}`,
            );

            outputChannel.show(true);

            void vscode.window
              .showErrorMessage(
                `Flutter AirRun : ${message}`,
              );
          } finally {
            cancellationDisposable
              .dispose();

            panelDisposable
              ?.dispose();

            panel?.dispose();
          }
        },
      );
    },
  );
}

function stageMessage(
  stage: QrPairingStage,
): string {
  switch (stage) {
    case 'waiting-for-scan':
      return 'Scannez le QR avec le téléphone…';

    case 'service-found':
      return 'Téléphone détecté sur le réseau…';

    case 'pairing':
      return 'Association sécurisée en cours…';

    case 'paired':
      return 'Association réussie…';
  }
}
