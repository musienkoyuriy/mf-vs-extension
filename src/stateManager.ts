import { ExtensionContext } from 'vscode';

export interface GlobalState {
  remoteEntries: { [key: string]: string } | undefined;
}

export interface StateManager {
  read: () => {
    remoteEntries: { [key: string]: string } | undefined;
  };
  write: (newState: GlobalState) => Promise<void>;
}

export default function stateManager(context: ExtensionContext): StateManager {
  return {
    read,
    write,
  };

  function read(): GlobalState {
    return {
      remoteEntries: context.workspaceState.get('remoteEntries') as {
        [key: string]: string;
      },
    };
  }

  async function write(newState: GlobalState) {
    await context.workspaceState.update(
      'remoteEntries',
      newState.remoteEntries
    );
  }
}
