import { window, workspace, ExtensionContext } from "vscode";
import { FederatedRemotesProvider } from "./federatedRemotesProvider";

export function activate(context: ExtensionContext): void {
  const rootPath =
    workspace.workspaceFolders && workspace.workspaceFolders.length > 0
      ? workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  window.registerTreeDataProvider(
    "moduleFederation",
    new FederatedRemotesProvider(rootPath!)
  );
}

export function deactivate(): void {}
