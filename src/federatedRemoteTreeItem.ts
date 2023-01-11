import { TreeItem } from "vscode";
import * as path from "path";
import { FederatedRemoteTreeItemOptions } from "./types";

export class FederatedRemoteTreeItem extends TreeItem {
  public isExposedModule;

  constructor(options: FederatedRemoteTreeItemOptions) {
    const { label, collapsibleState, remoteEntry, isExposedModule } = options;

    super(label, collapsibleState);

    this.tooltip = remoteEntry;
    this.description = remoteEntry;
    this.isExposedModule = isExposedModule;

    this.iconPath = {
      light: path.join(
        __filename,
        "..",
        "..",
        "resources",
        "light",
        this.isExposedModule ? "module-light.svg" : "container-light.svg"
      ),
      dark: path.join(
        __filename,
        "..",
        "..",
        "resources",
        "dark",
        this.isExposedModule ? "module-dark.svg" : "container-dark.svg"
      ),
    };
  }
}
