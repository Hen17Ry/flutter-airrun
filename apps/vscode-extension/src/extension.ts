import {
  EnvironmentService,
  type ToolInspection,
} from '@flutter-airrun/core';

import * as vscode from 'vscode';

import {
  registerPairDeviceCommand,
} from './commands/pairDeviceCommand';

import {
  registerRunWirelessCommand,
} from './commands/runWirelessCommand';

import {
  registerShowDevicesCommand,
} from './commands/showDevicesCommand';

import {
  registerShowWirelessStatusCommand,
} from './commands/showWirelessStatusCommand';

import {
  registerHelperDoctorCommand,
} from './commands/helperDoctorCommand';

import {
  registerQrSessionPreviewCommand,
} from './commands/qrSessionPreviewCommand';

const EXTENSION_NAME = 'Flutter AirRun';

const COMMANDS = {
  hello: 'flutterAirRun.hello',
  doctor: 'flutterAirRun.doctor',
} as const;

export function activate(
  context: vscode.ExtensionContext,
): void {
  const outputChannel =
    vscode.window.createOutputChannel(
      EXTENSION_NAME,
    );

  const environmentService =
    new EnvironmentService();

  outputChannel.appendLine(
    `${EXTENSION_NAME} activated successfully.`,
  );

  const helloCommand =
    vscode.commands.registerCommand(
      COMMANDS.hello,
      async (): Promise<void> => {
        await vscode.window.showInformationMessage(
          'Flutter AirRun fonctionne correctement !',
        );
      },
    );

  const doctorCommand =
    vscode.commands.registerCommand(
      COMMANDS.doctor,
      async (): Promise<void> => {
        await vscode.window.withProgress(
          {
            location:
              vscode.ProgressLocation.Notification,
            title:
              'Flutter AirRun analyse votre environnement…',
            cancellable: false,
          },
          async () => {
            outputChannel.clear();

            outputChannel.appendLine(
              '========================================',
            );

            outputChannel.appendLine(
              'Flutter AirRun Doctor',
            );

            outputChannel.appendLine(
              '========================================',
            );

            const report =
              await environmentService.inspect();

            outputChannel.appendLine(
              `Inspection : ${report.inspectedAt}`,
            );

            outputChannel.appendLine('');

            writeToolInspection(
              outputChannel,
              report.flutter,
            );

            outputChannel.appendLine('');

            writeToolInspection(
              outputChannel,
              report.adb,
            );

            outputChannel.show(true);

            if (
              report.flutter.available &&
              report.adb.available
            ) {
              await vscode.window.showInformationMessage(
                `Environnement prêt — Flutter ${
                  report.flutter.version ??
                  'inconnue'
                }, ADB ${
                  report.adb.version ??
                  'inconnue'
                }.`,
              );

              return;
            }

            await vscode.window.showErrorMessage(
              'Flutter AirRun a détecté un problème. Consultez le panneau Output.',
            );
          },
        );
      },
    );

  const devicesCommand =
    registerShowDevicesCommand(
      outputChannel,
    );

  const wirelessStatusCommand =
    registerShowWirelessStatusCommand(
      outputChannel,
    );

  const pairDeviceCommand =
    registerPairDeviceCommand(
      outputChannel,
    );

  const runWirelessCommand =
    registerRunWirelessCommand(
      outputChannel,
    );

  const helperDoctorCommand =
    registerHelperDoctorCommand(
      context,
      outputChannel,
    );
  const qrSessionPreviewCommand =
  registerQrSessionPreviewCommand(
    context,
    outputChannel,
  );

  context.subscriptions.push(
    outputChannel,
    helloCommand,
    doctorCommand,
    devicesCommand,
    wirelessStatusCommand,
    pairDeviceCommand,
    runWirelessCommand,
    helperDoctorCommand,
    qrSessionPreviewCommand,
  );
}

function writeToolInspection(
  outputChannel: vscode.OutputChannel,
  tool: ToolInspection,
): void {
  outputChannel.appendLine(
    `${tool.available ? '✓' : '✗'} ${tool.name.toUpperCase()}`,
  );

  outputChannel.appendLine(
    `Disponible : ${tool.available ? 'oui' : 'non'}`,
  );

  outputChannel.appendLine(
    `Version : ${tool.version ?? 'inconnue'}`,
  );

  outputChannel.appendLine(
    `Chemin : ${tool.executablePath ?? 'introuvable'}`,
  );

  if (tool.error) {
    outputChannel.appendLine(
      `Erreur : ${tool.error}`,
    );
  }

  if (tool.rawOutput) {
    outputChannel.appendLine('');
    outputChannel.appendLine(
      'Sortie brute :',
    );

    for (
      const line of
      tool.rawOutput.split(/\r?\n/)
    ) {
      outputChannel.appendLine(
        `  ${line}`,
      );
    }
  }
}

export function deactivate(): void {
  // VS Code libère automatiquement les ressources.
}
