import * as vscode from 'vscode';

export const AIRRUN_ACTIONS_VIEW_ID =
  'flutterAirRun.actions';

export const REFRESH_AIRRUN_ACTIONS_COMMAND =
  'flutterAirRun.refreshActions';

interface CommandContribution {
  command: string;
  title: string;
  category?: string;
}

interface AirRunAction {
  command: string;
  title: string;
  description: string;
  icon: string;
  priority: number;
}

class AirRunActionItem
  extends vscode.TreeItem {
  public constructor(
    action: AirRunAction,
  ) {
    super(
      action.title,
      vscode.TreeItemCollapsibleState.None,
    );

    this.id = action.command;

    this.description =
      action.description;

    this.iconPath =
      new vscode.ThemeIcon(
        action.icon,
      );

    this.command = {
      command: action.command,
      title: action.title,
    };

    this.contextValue =
      'flutterAirRun.action';

    this.tooltip =
      new vscode.MarkdownString(
        `**${action.title}**\n\n${action.description}`,
      );
  }
}

export class AirRunActionsProvider
  implements
    vscode.TreeDataProvider<AirRunActionItem> {
  private readonly changeEmitter =
    new vscode.EventEmitter<
      AirRunActionItem |
      undefined |
      null |
      void
    >();

  public readonly onDidChangeTreeData =
    this.changeEmitter.event;

  public constructor(
    private readonly extension:
      vscode.Extension<unknown>,
  ) {}

  public refresh(): void {
    this.changeEmitter.fire();
  }

  public getTreeItem(
    element: AirRunActionItem,
  ): vscode.TreeItem {
    return element;
  }

  public getChildren(
    element?: AirRunActionItem,
  ): AirRunActionItem[] {
    if (element) {
      return [];
    }

    return this.readActions()
      .map(
        action =>
          new AirRunActionItem(
            action,
          ),
      );
  }

  private readActions():
    readonly AirRunAction[] {
    const manifest: unknown =
      this.extension.packageJSON;

    if (!this.isRecord(manifest)) {
      return [];
    }

    const contributes =
      manifest['contributes'];

    if (!this.isRecord(contributes)) {
      return [];
    }

    const commands =
      contributes['commands'];

    if (!Array.isArray(commands)) {
      return [];
    }

    return commands
      .filter(
        (
          value,
        ): value is CommandContribution =>
          this.isCommandContribution(
            value,
          ),
      )
      .filter(
        contribution =>
          contribution.command.startsWith(
            'flutterAirRun.',
          ),
      )
      .filter(
        contribution =>
          contribution.command !==
            REFRESH_AIRRUN_ACTIONS_COMMAND &&
          !/\.hello$/i.test(
            contribution.command,
          ),
      )
      .map(
        contribution =>
          this.toAirRunAction(
            contribution,
          ),
      )
      .sort(
        (first, second) =>
          first.priority -
            second.priority ||
          first.title.localeCompare(
            second.title,
          ),
      );
  }

  private toAirRunAction(
    contribution:
      CommandContribution,
  ): AirRunAction {
    const searchableValue =
      `${contribution.command} ${contribution.title}`
        .toLowerCase();

    if (
      contribution.command ===
      'flutterAirRun.openCli'
    ) {
      return {
        command:
          contribution.command,
        title:
          'Open AirRun CLI',
        description:
          'Recommended workflow for Flutter AirRun',
        icon:
          'terminal',
        priority: 0,
      };
    }

    if (
      contribution.command ===
      'flutterAirRun.installCli'
    ) {
      return {
        command:
          contribution.command,
        title:
          'Install AirRun CLI',
        description:
          'Install the airrun command for this user',
        icon:
          'cloud-download',
        priority: 1,
      };
    }

    if (
      contribution.command ===
      'flutterAirRun.checkCli'
    ) {
      return {
        command:
          contribution.command,
        title:
          'Check AirRun CLI',
        description:
          'Check installation and version',
        icon:
          'check',
        priority: 2,
      };
    }

    if (
      searchableValue.includes(
        'pairdevicewithqr',
      ) ||
      (
        searchableValue.includes(
          'pair',
        ) &&
        searchableValue.includes(
          'qr',
        )
      )
    ) {
      return {
        command:
          contribution.command,
        title:
          contribution.title,
        description:
          'Associer un téléphone en scannant un QR code',
        icon:
          'device-mobile',
        priority: 20,
      };
    }

    if (
      searchableValue.includes(
        'pair',
      )
    ) {
      return {
        command:
          contribution.command,
        title:
          contribution.title,
        description:
          'Associer un téléphone avec un code à six chiffres',
        icon: 'key',
        priority: 30,
      };
    }

    if (
      contribution.command
        .toLowerCase()
        .endsWith(
          'runwireless',
        ) ||
      /\brun\b/.test(
        contribution.title
          .toLowerCase(),
      ) ||
      contribution.title
        .toLowerCase()
        .includes(
          'lancer',
        )
    ) {
      return {
        command:
          contribution.command,
        title:
          contribution.title,
        description:
          'Lancer le projet Flutter sur un téléphone sans fil',
        icon:
          'play-circle',
        priority: 10,
      };
    }

    if (
      searchableValue.includes(
        'doctor',
      ) &&
      searchableValue.includes(
        'helper',
      )
    ) {
      return {
        command:
          contribution.command,
        title:
          contribution.title,
        description:
          'Vérifier le helper natif utilisé pour le QR code',
        icon: 'tools',
        priority: 70,
      };
    }

    if (
      searchableValue.includes(
        'doctor',
      ) ||
      searchableValue.includes(
        'environment',
      )
    ) {
      return {
        command:
          contribution.command,
        title:
          contribution.title,
        description:
          'Vérifier Flutter, Android SDK et ADB',
        icon: 'pass',
        priority: 40,
      };
    }

    if (
      searchableValue.includes(
        'wireless',
      ) ||
      searchableValue.includes(
        'status',
      )
    ) {
      return {
        command:
          contribution.command,
        title:
          contribution.title,
        description:
          'Vérifier mDNS et la connexion sans fil',
        icon:
          'radio-tower',
        priority: 60,
      };
    }

    if (
      searchableValue.includes(
        'device',
      )
    ) {
      return {
        command:
          contribution.command,
        title:
          contribution.title,
        description:
          'Afficher les appareils Android disponibles',
        icon:
          'device-mobile',
        priority: 50,
      };
    }

    if (
      searchableValue.includes(
        'preview',
      )
    ) {
      return {
        command:
          contribution.command,
        title:
          contribution.title,
        description:
          'Prévisualiser une session QR',
        icon: 'preview',
        priority: 80,
      };
    }

    return {
      command:
        contribution.command,
      title:
        contribution.title,
      description:
        'Exécuter cette action Flutter AirRun',
      icon:
        'symbol-event',
      priority: 100,
    };
  }

  private isCommandContribution(
    value: unknown,
  ): value is CommandContribution {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['command'] ===
        'string' &&
      typeof value['title'] ===
        'string' &&
      (
        value['category'] ===
          undefined ||
        typeof value['category'] ===
          'string'
      )
    );
  }

  private isRecord(
    value: unknown,
  ): value is Record<
    string,
    unknown
  > {
    return (
      typeof value ===
        'object' &&
      value !== null &&
      !Array.isArray(value)
    );
  }
}

export function registerAirRunActionsView(
  context: vscode.ExtensionContext,
): readonly vscode.Disposable[] {
  const provider =
    new AirRunActionsProvider(
      context.extension,
    );

  const treeView =
    vscode.window.createTreeView(
      AIRRUN_ACTIONS_VIEW_ID,
      {
        treeDataProvider:
          provider,
        showCollapseAll: false,
      },
    );

  const refreshCommand =
    vscode.commands.registerCommand(
      REFRESH_AIRRUN_ACTIONS_COMMAND,
      () => {
        provider.refresh();
      },
    );

  return [
    treeView,
    refreshCommand,
  ];
}
