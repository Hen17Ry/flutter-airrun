import {
  NativeHelperService,
} from '@flutter-airrun/core';

import * as vscode from 'vscode';

import {
  showQrSessionPanel,
} from '../panels/qrSessionPanel';

import {
  resolveHelperPath,
} from '../services/helperPathResolver';

export const QR_SESSION_PREVIEW_COMMAND =
  'flutterAirRun.qrSessionPreview';

export function registerQrSessionPreviewCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
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
            const resolution =
              await resolveHelperPath(context);

            if (!resolution.executablePath) {
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

            if (doctor.status !== 'ok') {
              throw new Error(
                'Le helper natif QR n’est pas prêt.',
              );
            }

            const session =
              await helper.createQrSession();

            await showQrSessionPanel(
              session,
            );

            outputChannel.appendLine(
              '[QR] Prévisualisation de session créée.',
            );

            await vscode.window
              .showInformationMessage(
                'Session QR générée. Le serveur d’association sera ajouté à l’étape suivante.',
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
