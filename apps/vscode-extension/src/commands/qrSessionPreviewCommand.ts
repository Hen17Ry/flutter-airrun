import {
  QrPairingSessionService,
} from '@flutter-airrun/core';

import * as vscode from 'vscode';

import {
  showQrSessionPanel,
} from '../panels/qrSessionPanel';

export const QR_SESSION_PREVIEW_COMMAND =
  'flutterAirRun.qrSessionPreview';

export function registerQrSessionPreviewCommand(
context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    QR_SESSION_PREVIEW_COMMAND,
    async (): Promise<void> => {
      await vscode.window.withProgress(
        {
          location:
            vscode.ProgressLocation.Notification,
          title:
            'Flutter AirRun prépare la session QR…',
          cancellable: false,
        },
        async () => {
          try {
            const generator =
              new QrPairingSessionService();

            const doctor =
              generator.doctor();

            if (doctor.status !== 'ok') {
              throw new Error(
                'Le générateur QR TypeScript n’est pas prêt.',
              );
            }

            const session =
              generator.createQrSession();

            await showQrSessionPanel(
              session,
            );

            outputChannel.appendLine(
              [
                '[QR]',
                'Prévisualisation générée avec',
                `QrPairingSessionService ${doctor.generatorVersion}.`,
              ].join(' '),
            );

            await vscode.window
              .showInformationMessage(
                'Session QR générée.',
              );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : String(error);

            outputChannel.appendLine(
              `[QR] ERREUR : ${message}`,
            );

            outputChannel.show(true);

            await vscode.window
              .showErrorMessage(
                `Flutter AirRun : ${message}`,
              );
          }
        },
      );
    },
  );
}
