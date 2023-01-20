import { window, workspace, ExtensionContext, commands } from 'vscode';
import { FederatedRemotesProvider } from './federatedRemotesProvider';

export function activate(context: ExtensionContext): void {
  const rootPath =
    workspace.workspaceFolders && workspace.workspaceFolders.length > 0
      ? workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  const federatedRemotesProvider = new FederatedRemotesProvider(rootPath!);

  window.registerTreeDataProvider('moduleFederation', federatedRemotesProvider);
  context.subscriptions.push(
    commands.registerCommand('moduleFederation.refreshEntry', () => {
      federatedRemotesProvider.refresh();
      window.showInformationMessage(
        'MF: Federated remotes were successfully refreshed'
      );
    })
  );
}

export function deactivate(): void {}
