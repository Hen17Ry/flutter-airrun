import { homedir } from 'node:os';

import * as vscode from 'vscode';

import {
  addCliDirectoryToUserPath,
  ExistingCliConflictError,
  getCliLauncherPath,
  getCliStatus,
  installCli,
  uninstallCli,
} from '../services/cliInstaller';

export const OPEN_CLI_COMMAND =
  'flutterAirRun.openCli';

export const INSTALL_CLI_COMMAND =
  'flutterAirRun.installCli';

export const CHECK_CLI_COMMAND =
  'flutterAirRun.checkCli';

export const UPDATE_CLI_COMMAND =
  'flutterAirRun.updateCli';

export const UNINSTALL_CLI_COMMAND =
  'flutterAirRun.uninstallCli';

const DISABLE_PROMPT_KEY =
  'flutterAirRun.cliPrompt.disabled';

export function registerCliCommands(
  context: vscode.ExtensionContext,
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(
      OPEN_CLI_COMMAND,
      async () => {
        await openCli(context);
      },
    ),

    vscode.commands.registerCommand(
      INSTALL_CLI_COMMAND,
      async () => {
        await installWithInterface(
          context,
        );
      },
    ),

    vscode.commands.registerCommand(
      CHECK_CLI_COMMAND,
      async () => {
        await showCliStatus(
          context,
        );
      },
    ),

    vscode.commands.registerCommand(
      UPDATE_CLI_COMMAND,
      async () => {
        await installWithInterface(
          context,
          true,
        );
      },
    ),

    vscode.commands.registerCommand(
      UNINSTALL_CLI_COMMAND,
      async () => {
        await uninstallWithInterface(
          context,
        );
      },
    ),
  ];
}

export async function offerCliInstallation(
  context: vscode.ExtensionContext,
): Promise<void> {
  if (
    ![
      'linux',
      'darwin',
      'win32',
    ].includes(
      process.platform,
    )
  ) {
    return;
  }

  const status =
    await getCliStatus(context);

  if (status.current) {
    return;
  }

  if (
    status.installed &&
    !status.current
  ) {
    const updateChoice =
      await vscode.window
        .showInformationMessage(
          `AirRun CLI ${status.bundledVersion} est disponible.`,
          'Mettre à jour la CLI',
          'Plus tard',
        );

    if (
      updateChoice ===
      'Mettre à jour la CLI'
    ) {
      await installWithInterface(
        context,
        true,
      );
    }

    return;
  }

  const promptDisabled =
    context.globalState.get<boolean>(
      DISABLE_PROMPT_KEY,
      false,
    );

  if (promptDisabled) {
    return;
  }

  const choice =
    await vscode.window
      .showInformationMessage(
        [
          'Flutter AirRun est conçu autour de sa CLI interactive.',
          'Installez la commande “airrun” pour profiter du parcours recommandé.',
        ].join(' '),
        {
          modal: true,
        },
        'Installer la CLI AirRun',
        'Plus tard',
        'Ne plus demander',
      );

  if (
    choice ===
    'Installer la CLI AirRun'
  ) {
    await installWithInterface(
      context,
    );

    return;
  }

  if (
    choice ===
    'Ne plus demander'
  ) {
    await context.globalState.update(
      DISABLE_PROMPT_KEY,
      true,
    );
  }
}

async function installWithInterface(
  context: vscode.ExtensionContext,
  replaceExisting = false,
): Promise<void> {
  try {
    const status =
      await installCli(
        context,
        replaceExisting,
      );

    await showInstallationSuccess(
      context,
      status.binDirectoryInPath,
    );
  } catch (error) {
    if (
      error instanceof
      ExistingCliConflictError
    ) {
      const choice =
        await vscode.window
          .showWarningMessage(
            [
              'Une commande “airrun” existe déjà.',
              error.launcherPath,
              'Flutter AirRun peut la remplacer après confirmation.',
            ].join('\n'),
            {
              modal: true,
            },
            'Remplacer la commande existante',
          );

      if (
        choice ===
        'Remplacer la commande existante'
      ) {
        const status =
          await installCli(
            context,
            true,
          );

        await showInstallationSuccess(
          context,
          status.binDirectoryInPath,
        );
      }

      return;
    }

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    await vscode.window
      .showErrorMessage(
        `Installation de la CLI impossible : ${message}`,
      );
  }
}

async function showInstallationSuccess(
  context: vscode.ExtensionContext,
  binDirectoryInPath: boolean,
): Promise<void> {
  const pathAction =
    process.platform === 'win32'
      ? 'Ajouter au PATH'
      : 'Copier la commande PATH';

  const choice =
    await vscode.window
      .showInformationMessage(
        [
          'AirRun CLI autonome est installée.',
          'Commande recommandée : airrun',
        ].join(' '),
        'Ouvrir la CLI',
        binDirectoryInPath
          ? 'Fermer'
          : pathAction,
      );

  if (
    choice === 'Ouvrir la CLI'
  ) {
    await openCli(context);
    return;
  }

  if (
    choice === 'Ajouter au PATH'
  ) {
    try {
      await addCliDirectoryToUserPath(
        context,
      );

      await vscode.window
        .showInformationMessage(
          [
            'AirRun a été ajouté au PATH utilisateur.',
            'Ouvrez un nouveau terminal pour utiliser la commande airrun.',
          ].join(' '),
        );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      await vscode.window
        .showErrorMessage(
          `Ajout au PATH impossible : ${message}`,
        );
    }

    return;
  }

  if (
    choice ===
    'Copier la commande PATH'
  ) {
    await vscode.env.clipboard.writeText(
      'export PATH="$HOME/.local/bin:$PATH"',
    );

    await vscode.window
      .showInformationMessage(
        [
          'Commande PATH copiée.',
          'Ajoutez-la au profil de votre terminal.',
        ].join(' '),
      );
  }
}

async function openCli(
  context: vscode.ExtensionContext,
): Promise<void> {
  let status =
    await getCliStatus(context);

  if (!status.installed) {
    const choice =
      await vscode.window
        .showInformationMessage(
          'La CLI AirRun doit être installée avant son ouverture.',
          'Installer maintenant',
        );

    if (
      choice !==
      'Installer maintenant'
    ) {
      return;
    }

    await installWithInterface(
      context,
    );

    status =
      await getCliStatus(context);

    if (!status.installed) {
      return;
    }
  }

  const workspaceDirectory =
    vscode.workspace
      .workspaceFolders?.[0]
      ?.uri.fsPath ??
    homedir();

  const terminal =
    vscode.window.createTerminal({
      name:
        'Flutter AirRun CLI',

      cwd:
        workspaceDirectory,
  });

  terminal.show();

  terminal.sendText(
    shellQuote(
      getCliLauncherPath(
        context,
      ),
    ),
    true,
  );
}

async function showCliStatus(
  context: vscode.ExtensionContext,
): Promise<void> {
  const status =
    await getCliStatus(context);

  const state =
    status.current
      ? 'installée et à jour'
      : status.installed
        ? 'installée, mais une mise à jour est disponible'
        : 'non installée';

  await vscode.window
    .showInformationMessage(
      [
        `AirRun CLI : ${state}.`,
        `Version intégrée : ${status.bundledVersion}.`,
        status.installedVersion
          ? `Version installée : ${status.installedVersion}.`
          : '',
        `Commande : ${status.launcherPath}`,
      ]
        .filter(Boolean)
        .join(' '),
    );
}

async function uninstallWithInterface(
  context: vscode.ExtensionContext,
): Promise<void> {
  const choice =
    await vscode.window
      .showWarningMessage(
        'Désinstaller la CLI AirRun de ce compte utilisateur ?',
        {
          modal: true,
        },
        'Désinstaller',
      );

  if (
    choice !== 'Désinstaller'
  ) {
    return;
  }

  await uninstallCli(context);

  await vscode.window
    .showInformationMessage(
      'AirRun CLI a été désinstallée.',
    );
}

function shellQuote(
  value: string,
): string {
  return `'${value.replace(
    /'/g,
    `'\\''`,
  )}'`;
}
