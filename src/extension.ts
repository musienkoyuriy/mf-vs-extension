import { Request, Response } from 'express';
import { window, workspace, ExtensionContext, commands } from 'vscode';
const express = require('express');
const app = express();
import { FederatedRemotesProvider } from './federatedRemotesProvider';
import stateManager from './stateManager';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export function deactivate(context: ExtensionContext): void {
  const state = stateManager(context);

  state.write({ remoteEntries: undefined });
}

export function activate(context: ExtensionContext): void {
  const state = stateManager(context);
  const rootPath =
    workspace.workspaceFolders && workspace.workspaceFolders.length > 0
      ? workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  const federatedRemotesProvider = new FederatedRemotesProvider(
    state,
    rootPath!
  );
  window.registerTreeDataProvider('moduleFederation', federatedRemotesProvider);
  context.subscriptions.push(
    commands.registerCommand('moduleFederation.refreshEntry', () => {
      federatedRemotesProvider.refresh();
      window.showInformationMessage(
        'MF: Federated remotes were successfully refreshed'
      );
    })
  );

  app.post('/entries', (req: Request, res: Response) => {
    state.write({ remoteEntries: req.body });
    federatedRemotesProvider.refresh();
    res.end(req.body);
  });

  app.listen(3000, () => {
    console.log('Server is started');
  });
}
