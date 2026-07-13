import {
  FlutterProjectService,
  FlutterRunService,
  WirelessFlutterDeviceService,
  WirelessRecoveryService,
  type FlutterProject,
  type WirelessFlutterDevice,
} from '@flutter-airrun/core';

import * as vscode from 'vscode';

import {
  PAIR_DEVICE_COMMAND,
} from './pairDeviceCommand';

import {
  SHOW_WIRELESS_STATUS_COMMAND,
} from './showWirelessStatusCommand';

export const RUN_WIRELESS_COMMAND =
  'flutterAirRun.runWireless';

interface FlutterProjectItem
  extends vscode.QuickPickItem {
  project: FlutterProject;
  folder: vscode.WorkspaceFolder;
}

interface WirelessDeviceItem
  extends vscode.QuickPickItem {
  device: WirelessFlutterDevice;
}

export function registerRunWirelessCommand(
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  const projectService =
    new FlutterProjectService();

  const wirelessDeviceService =
    new WirelessFlutterDeviceService();

  const recoveryService =
    new WirelessRecoveryService();

  const flutterRunService =
    new FlutterRunService();

  return vscode.commands.registerCommand(
    RUN_WIRELESS_COMMAND,
    async (): Promise<void> => {
      try {
        const projectItem =
          await selectFlutterProject(
            projectService,
          );

        if (!projectItem) {
          return;
        }

        let deviceList =
          await vscode.window.withProgress(
            {
              location:
                vscode.ProgressLocation.Notification,
              title:
                'Flutter AirRun recherche les appareils sans fil…',
              cancellable: false,
            },
            async () =>
              wirelessDeviceService.listDevices(),
          );

        let recoveryStatus:
          | 'not-needed'
          | 'already-connected'
          | 'reconnected' =
          'not-needed';

        if (deviceList.devices.length === 0) {
          const recovery =
            await vscode.window.withProgress(
              {
                location:
                  vscode.ProgressLocation.Notification,
                title:
                  'Flutter AirRun tente de reconnecter votre téléphone…',
                cancellable: false,
              },
              async () =>
                recoveryService.recover(),
            );

          if (recovery.device) {
            deviceList = {
              adbPath: '',
              flutterPath: '',
              devices: [
                recovery.device,
              ],
            };

            recoveryStatus =
              recovery.status ===
              'already-connected'
                ? 'already-connected'
                : 'reconnected';
          }
        }

        if (deviceList.devices.length === 0) {
          const action =
            await vscode.window.showWarningMessage(
              'Aucun téléphone Android sans fil n’est disponible. Vérifiez que le débogage sans fil est activé et que le téléphone utilise le même réseau Wi-Fi.',
              'Réessayer',
              'Associer un appareil',
              'État sans fil',
            );

          if (action === 'Réessayer') {
            await vscode.commands.executeCommand(
              RUN_WIRELESS_COMMAND,
            );

            return;
          }

          if (
            action ===
            'Associer un appareil'
          ) {
            await vscode.commands.executeCommand(
              PAIR_DEVICE_COMMAND,
            );

            return;
          }

          if (action === 'État sans fil') {
            await vscode.commands.executeCommand(
              SHOW_WIRELESS_STATUS_COMMAND,
            );
          }

          return;
        }

        const selectedDevice =
          await selectWirelessDevice(
            deviceList.devices,
          );

        if (!selectedDevice) {
          return;
        }

        const plan =
          await flutterRunService.createRunPlan(
            projectItem.project.rootPath,
            selectedDevice.device
              .flutterDevice.id,
          );

        outputChannel.clear();

        outputChannel.appendLine(
          '========================================',
        );

        outputChannel.appendLine(
          'Flutter AirRun',
        );

        outputChannel.appendLine(
          '========================================',
        );

        outputChannel.appendLine(
          `Projet       : ${projectItem.project.name}`,
        );

        outputChannel.appendLine(
          `Dossier      : ${projectItem.project.rootPath}`,
        );

        outputChannel.appendLine(
          `Appareil     : ${
            selectedDevice.device
              .flutterDevice.name
          }`,
        );

        outputChannel.appendLine(
          `Device ID    : ${plan.deviceId}`,
        );

        outputChannel.appendLine(
          `Récupération : ${formatRecoveryStatus(
            recoveryStatus,
          )}`,
        );

        outputChannel.appendLine(
          `Commande     : ${plan.displayCommand}`,
        );

        outputChannel.appendLine('');

        outputChannel.appendLine(
          'Flutter est exécuté dans un terminal de tâches VS Code.',
        );

        outputChannel.show(true);

        const taskDefinition:
          vscode.TaskDefinition = {
            type: 'flutter-airrun',
            command: 'run',
            project:
              projectItem.project.name,
            deviceId: plan.deviceId,
          };

        const processExecution =
          new vscode.ProcessExecution(
            plan.executablePath,
            [...plan.args],
            {
              cwd: plan.cwd,
            },
          );

        const task = new vscode.Task(
          taskDefinition,
          projectItem.folder,
          `Run ${projectItem.project.name} on ${selectedDevice.device.flutterDevice.name}`,
          'Flutter AirRun',
          processExecution,
          [],
        );

        task.presentationOptions = {
          reveal:
            vscode.TaskRevealKind.Always,
          panel:
            vscode.TaskPanelKind.Dedicated,
          focus: true,
          echo: true,
          clear: false,
          showReuseMessage: true,
        };

        await vscode.tasks.executeTask(task);

        await vscode.window.showInformationMessage(
          `Lancement de ${projectItem.project.name} sur ${selectedDevice.device.flutterDevice.name}.`,
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

async function selectFlutterProject(
  projectService: FlutterProjectService,
): Promise<FlutterProjectItem | undefined> {
  const workspaceFolders =
    vscode.workspace.workspaceFolders;

  if (
    !workspaceFolders ||
    workspaceFolders.length === 0
  ) {
    await vscode.window.showWarningMessage(
      'Ouvrez d’abord un projet Flutter dans VS Code.',
    );

    return undefined;
  }

  const inspectedProjects =
    await Promise.all(
      workspaceFolders.map(
        async folder => {
          try {
            const project =
              await projectService.inspect(
                folder.uri.fsPath,
              );

            return {
              project,
              folder,
            };
          } catch {
            return null;
          }
        },
      ),
    );

  const projects =
    inspectedProjects.filter(
      (
        item,
      ): item is {
        project: FlutterProject;
        folder: vscode.WorkspaceFolder;
      } => item !== null,
    );

  if (projects.length === 0) {
    await vscode.window.showWarningMessage(
      'Le dossier ouvert ne contient aucun projet Flutter valide.',
    );

    return undefined;
  }

  if (projects.length === 1) {
    const onlyProject = projects[0];

    if (!onlyProject) {
      return undefined;
    }

    return {
      label:
        `$(folder) ${onlyProject.project.name}`,
      description:
        onlyProject.folder.name,
      detail:
        onlyProject.project.rootPath,
      project:
        onlyProject.project,
      folder:
        onlyProject.folder,
    };
  }

  return vscode.window.showQuickPick(
    projects.map(
      ({ project, folder }) => ({
        label:
          `$(folder) ${project.name}`,
        description: folder.name,
        detail: project.rootPath,
        project,
        folder,
      }),
    ),
    {
      title:
        'Flutter AirRun — Projet Flutter',
      placeHolder:
        'Sélectionnez le projet à exécuter',
      matchOnDescription: true,
      matchOnDetail: true,
    },
  );
}

async function selectWirelessDevice(
  devices:
    readonly WirelessFlutterDevice[],
): Promise<WirelessDeviceItem | undefined> {
  if (devices.length === 1) {
    const onlyDevice = devices[0];

    if (!onlyDevice) {
      return undefined;
    }

    return createDeviceItem(
      onlyDevice,
    );
  }

  return vscode.window.showQuickPick(
    devices.map(createDeviceItem),
    {
      title:
        'Flutter AirRun — Appareil sans fil',
      placeHolder:
        'Sélectionnez le téléphone',
      matchOnDescription: true,
      matchOnDetail: true,
    },
  );
}

function createDeviceItem(
  device: WirelessFlutterDevice,
): WirelessDeviceItem {
  return {
    label:
      `$(device-mobile) ${device.flutterDevice.name}`,
    description:
      device.flutterDevice.targetPlatform ??
      'Android',
    detail:
      `${device.flutterDevice.sdk ?? 'SDK inconnu'} — ${device.flutterDevice.id}`,
    device,
  };
}

function formatRecoveryStatus(
  status:
    | 'not-needed'
    | 'already-connected'
    | 'reconnected',
): string {
  switch (status) {
    case 'already-connected':
      return 'appareil déjà connecté';

    case 'reconnected':
      return 'reconnexion automatique réussie';

    case 'not-needed':
      return 'non nécessaire';
  }
}
