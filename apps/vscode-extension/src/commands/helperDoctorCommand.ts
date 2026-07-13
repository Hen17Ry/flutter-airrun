import {
  NativeHelperService,
} from '@flutter-airrun/core';

import * as vscode from 'vscode';

import {
  resolveHelperPath,
} from '../services/helperPathResolver';

export const HELPER_DOCTOR_COMMAND =
  'flutterAirRun.helperDoctor';

export function registerHelperDoctorCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    HELPER_DOCTOR_COMMAND,
    async (): Promise<void> => {
      await vscode.window.withProgress(
        {
          location:
            vscode.ProgressLocation.Notification,
          title:
            'Flutter AirRun vérifie le helper QR…',
          cancellable: false,
        },
        async () => {
          try {
            const resolution =
              await resolveHelperPath(context);

            outputChannel.clear();

            outputChannel.appendLine(
              '========================================',
            );

            outputChannel.appendLine(
              'Flutter AirRun QR Helper Doctor',
            );

            outputChannel.appendLine(
              '========================================',
            );

            outputChannel.appendLine(
              `Source : ${resolution.source}`,
            );

            outputChannel.appendLine('');
            outputChannel.appendLine(
              'Chemins vérifiés :',
            );

            for (
              const checkedPath of
              resolution.checkedPaths
            ) {
              outputChannel.appendLine(
                `  - ${checkedPath}`,
              );
            }

            if (!resolution.executablePath) {
              throw new Error(
                'Le helper natif QR est introuvable.',
              );
            }

            const helperService =
              new NativeHelperService(
                resolution.executablePath,
              );

            const [version, doctor] =
              await Promise.all([
                helperService.getVersion(),
                helperService.doctor(),
              ]);

            outputChannel.appendLine('');
            outputChannel.appendLine(
              `Exécutable   : ${resolution.executablePath}`,
            );

            outputChannel.appendLine(
              `Helper       : ${version.helperVersion}`,
            );

            outputChannel.appendLine(
              `Protocole    : ${version.protocolVersion}`,
            );

            outputChannel.appendLine(
              `Plateforme   : ${doctor.platform}`,
            );

            outputChannel.appendLine(
              `Architecture : ${doctor.architecture}`,
            );

            outputChannel.appendLine(
              `État         : ${doctor.status}`,
            );

            outputChannel.show(true);

            await vscode.window.showInformationMessage(
              `Helper QR prêt — version ${doctor.helperVersion}, protocole ${doctor.protocolVersion}.`,
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
