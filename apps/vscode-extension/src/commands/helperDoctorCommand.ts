import {
  QrPairingSessionService,
} from '@flutter-airrun/core';

import * as vscode from 'vscode';

export const HELPER_DOCTOR_COMMAND =
  'flutterAirRun.helperDoctor';

export function registerHelperDoctorCommand(
context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    HELPER_DOCTOR_COMMAND,
    async (): Promise<void> => {
      await vscode.window.withProgress(
        {
          location:
            vscode.ProgressLocation.Notification,
          title:
            'Flutter AirRun vérifie le générateur QR…',
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

            outputChannel.appendLine(
              '========================================',
            );

            outputChannel.appendLine(
              'Flutter AirRun QR Generator Doctor',
            );

            outputChannel.appendLine(
              '========================================',
            );

            outputChannel.appendLine(
              `Générateur : ${doctor.generator}`,
            );

            outputChannel.appendLine(
              `Version : ${doctor.generatorVersion}`,
            );

            outputChannel.appendLine(
              `Protocole : ${doctor.protocolVersion}`,
            );

            outputChannel.appendLine(
              `Plateforme : ${doctor.platform}`,
            );

            outputChannel.appendLine(
              `Architecture : ${doctor.architecture}`,
            );

            outputChannel.appendLine(
              `État : ${doctor.status}`,
            );

            outputChannel.show(true);

            await vscode.window
              .showInformationMessage(
                [
                  'Générateur QR prêt',
                  `— version ${doctor.generatorVersion},`,
                  `${doctor.platform}/${doctor.architecture}.`,
                ].join(' '),
              );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : String(error);

            outputChannel.appendLine(
              `[QR GENERATOR] ERREUR : ${message}`,
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
