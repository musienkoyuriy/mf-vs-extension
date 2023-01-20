import { TreeItemCollapsibleState } from 'vscode';

export type FederatedRemoteTreeItemOptions = {
  label: string;
  remoteEntry: string;
  collapsibleState: TreeItemCollapsibleState;
  isExposedModule?: boolean;
};

export type WebpackConfigOptions = {
  configExists: boolean;
  fileUri?: string;
  extension?: 'js' | 'ts';
  setURI(uri: string): void;
};

export type MappedMFRemote = { remoteName: string; remoteEntryUrl: string };
export type MappedMFRemotes = MappedMFRemote[];
export type MFConfig = Record<string, string | Record<string, string>>;
