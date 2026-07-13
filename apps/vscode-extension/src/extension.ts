import * as vscode from 'vscode';

const EXTENSION_NAME = 'Flutter AirRun';
const HELLO_COMMAND = 'flutterAirRun.hello';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);

  outputChannel.appendLine(`${EXTENSION_NAME} activated successfully.`);

  const helloCommand = vscode.commands.registerCommand(
    HELLO_COMMAND,
    async (): Promise<void> => {
      outputChannel.appendLine('Hello command executed.');
      outputChannel.show(true);

      await vscode.window.showInformationMessage(
        'Flutter AirRun fonctionne correctement !',
      );
    },
  );

  context.subscriptions.push(outputChannel, helloCommand);
}

export function deactivate(): void {
  // Les ressources enregistrées dans context.subscriptions
  // sont automatiquement libérées par VS Code.
}
