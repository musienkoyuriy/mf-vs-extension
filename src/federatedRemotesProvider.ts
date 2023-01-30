import * as fs from 'fs';
import { parseScript, Syntax } from 'esprima';
import fetch from 'node-fetch';
import {
  window,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  EventEmitter,
  Event,
} from 'vscode';
import { FederatedRemoteTreeItem } from './federatedRemoteTreeItem';
import {
  MappedMFRemote,
  MappedMFRemotes,
  MFConfig,
  WebpackConfigOptions,
} from './types';
import { parseWebpackConfig } from './webpackConfigResolver';
import { traverse } from './ast-utils';

const errorMessages = {
  noWorkspaceRoot: 'MF: No workspace root.',
  noWebpackConfig: 'MF: No webpack config found.',
  remoteEntryError: 'MF: Unable to read remote entry for',
};

export class FederatedRemotesProvider
  implements TreeDataProvider<FederatedRemoteTreeItem>
{
  constructor(private workspaceRoot: string) {}

  private _onDidChangeTreeData: EventEmitter<
    FederatedRemoteTreeItem | undefined | null | void
  > = new EventEmitter<FederatedRemoteTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: Event<
    FederatedRemoteTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: FederatedRemoteTreeItem): TreeItem {
    return element;
  }

  public async getChildren(
    element?: FederatedRemoteTreeItem
  ): Promise<FederatedRemoteTreeItem[]> {
    let remotes: MappedMFRemotes;
    let remoteEntryBody: string;

    if (!this.workspaceRoot) {
      window.showInformationMessage(errorMessages.noWorkspaceRoot);
      return Promise.resolve([]);
    }
    const сonfigMetadata = this.getWebpackConfigMetadata();

    if (!сonfigMetadata.configExists) {
      window.showInformationMessage(errorMessages.noWebpackConfig);
      return Promise.resolve([]);
    }

    try {
      remotes = this.mapRemotes(parseWebpackConfig(сonfigMetadata));
    } catch (error: any) {
      window.showErrorMessage(error.message);
      return Promise.resolve([]);
    }

    if (!element) {
      return Promise.resolve(this.getFederatedRemotesFromConfig(remotes));
    }

    try {
      const response = await fetch(element.description as string);
      if (!response.ok) {
        window.showErrorMessage(
          `${errorMessages.remoteEntryError} ${element.label} container.`
        );
        return Promise.resolve([]);
      }
      remoteEntryBody = await response.text();
    } catch (_) {
      window.showErrorMessage(
        `${errorMessages.remoteEntryError} ${element.label} container.`
      );
      return Promise.resolve([]);
    }

    const remoteEntryBodyLines = remoteEntryBody.split('\n');
    const isDevMode = Boolean(
      remoteEntryBodyLines.find((line: string) =>
        line.includes('mode: "development"')
      )
    );
    const exposedEntries = this.extractExposedModules(remoteEntryBody, {
      isDevMode,
      remoteEntryBodyLines,
    });

    return exposedEntries.length === 0
      ? Promise.resolve([])
      : Promise.resolve(
          exposedEntries.map((module: any) => {
            const [modulePublicName, moduleLocalPath] = module;
            return new FederatedRemoteTreeItem({
              label: modulePublicName,
              remoteEntry: moduleLocalPath,
              collapsibleState: TreeItemCollapsibleState.None,
              isExposedModule: true,
            });
          })
        );
  }

  private getExposedModulesPropsInProdMode(remoteEntrySyntaxTree: any): any[] {
    let moduleMapDeclarator = null;

    traverse(remoteEntrySyntaxTree, (node: any) => {
      if (
        node.type === Syntax.VariableDeclaration &&
        node.declarations[0].id.name === 'moduleMap'
      ) {
        moduleMapDeclarator = node.declarations[0];
      }
    });

    return (<any>moduleMapDeclarator).init.properties;
  }

  private getExposedModulesPropsInDevMode(remoteEntrySyntaxTree: any): any[] {
    let expressionContainedModuleMap: any;
    let moduleMapBody = '';

    traverse(remoteEntrySyntaxTree, (node: any) => {
      if (
        node.type === Syntax.ExpressionStatement &&
        (expressionContainedModuleMap = node.expression?.arguments?.find(
          (arg: any) =>
            arg.type === Syntax.Literal &&
            typeof arg.value === 'string' &&
            arg.value.startsWith('var moduleMap')
        ))
      ) {
        moduleMapBody = expressionContainedModuleMap.value;
      }
    });

    const moduleMapSyntaxTree = parseScript(moduleMapBody);
    return (<any>moduleMapSyntaxTree.body[0]).declarations[0].init.properties;
  }

  private extractExposedModules(
    remoteEntryBody: string,
    extractOptions: {
      remoteEntryBodyLines: string[];
      isDevMode: boolean;
    }
  ): [string, unknown][] {
    const remoteEntrySyntaxTree = parseScript(remoteEntryBody);
    const { isDevMode } = extractOptions;

    const exposedModulesProps = isDevMode
      ? this.getExposedModulesPropsInDevMode(remoteEntrySyntaxTree)
      : this.getExposedModulesPropsInProdMode(remoteEntrySyntaxTree);

    const exposedModulesMap = this.mapExposedModulesToDictionary(
      exposedModulesProps,
      extractOptions
    );

    return exposedModulesMap;
  }

  private mapExposedModulesToDictionary(
    exposedModulesProps: any[],
    extractOptions: {
      remoteEntryBodyLines: string[];
      isDevMode: boolean;
    }
  ) {
    const { remoteEntryBodyLines, isDevMode } = extractOptions;
    let exposedModulesDictionary = Array.from(exposedModulesProps).reduce(
      (acc: Record<string, unknown>, prop: any) => {
        let exposedModulePath = null;
        traverse(prop, (node: any) => {
          if (
            node.type === Syntax.Literal &&
            typeof node.value !== 'undefined'
          ) {
            exposedModulePath = node.value;
          }
        });
        if (exposedModulePath) {
          acc[prop.key?.value] = exposedModulePath;
        }
        return acc;
      },
      {}
    );

    let exposedEntries = Object.entries(exposedModulesDictionary);
    if (exposedEntries.length === 0) {
      return [];
    }

    if (!isDevMode) {
      exposedEntries = exposedEntries.map(([key, value]) => {
        const line = remoteEntryBodyLines.find((line: string) =>
          line.includes(<string>value)
        );
        const commentStart = '/*!';
        const commentStartIndex = line?.indexOf(commentStart);
        const srcRelativePath = line
          ?.slice(commentStartIndex! + commentStart.length)
          .trim()
          .split(' ')[0];

        return [key, srcRelativePath];
      });
    }

    return exposedEntries;
  }

  private getFederatedRemotesFromConfig(
    remotes: MappedMFRemotes
  ): FederatedRemoteTreeItem[] {
    return remotes.map(({ remoteName, remoteEntryUrl }: MappedMFRemote) => {
      return new FederatedRemoteTreeItem({
        label: remoteName,
        remoteEntry: remoteEntryUrl,
        collapsibleState: TreeItemCollapsibleState.Collapsed,
      });
    });
  }

  private mapRemotes(config: MFConfig): MappedMFRemotes {
    const remotesDictionary = config.remotes as Record<string, string>;

    let entries: [string, string][];

    if (!config || (entries = Object.entries(remotesDictionary)).length === 0) {
      return [];
    }

    return entries.map((remote: [string, string]) => {
      const [remoteName, remoteEntry] = remote;
      return {
        remoteName,
        remoteEntryUrl: this.receiveRemoteEntryURL(remoteEntry),
      };
    });
  }

  private receiveRemoteEntryURL(remoteEntry: string): string {
    return remoteEntry.split('@')[1];
  }

  private getWebpackConfigMetadata(): WebpackConfigOptions {
    const jsConfigPathToResolve = `${this.workspaceRoot}/webpack.config.js`;
    const tsConfigPathToResolve = `${this.workspaceRoot}/webpack.config.ts`;

    let configMetadata: WebpackConfigOptions = {
      configExists: true,
      setURI(uri: string) {
        this.fileUri = uri;
        this.extension = uri.split('.').pop() as 'js' | 'ts';
      },
    };

    try {
      fs.accessSync(jsConfigPathToResolve);
      configMetadata.setURI(jsConfigPathToResolve);
    } catch (_) {
      try {
        fs.accessSync(tsConfigPathToResolve);
        configMetadata.setURI(tsConfigPathToResolve);
      } catch (_) {
        configMetadata.configExists = false;
      }
    }

    return configMetadata;
  }
}
