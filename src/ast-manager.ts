export class ASTManager {
  lang = 'js';

  constructor(lang: 'js' | 'ts') {
    this.lang = lang;
  }

  isPluginsNode(node: any): boolean {
    return this.lang === 'js'
      ? this.#isPluginsNodeBabel(node)
      : this.#isPluginsNodeTypescript(node);
  }

  findNodeContainedModuleMap(node: any): any | null {
    return node.expression?.arguments?.find(
      (arg: any) =>
        arg.type === (this.lang === 'js' ? 'StringLiteral' : 'Literal') &&
        typeof arg.value === 'string' &&
        arg.value.startsWith('var moduleMap')
    );
  }

  getModuleFederationPluginNode(pluginsNode: any): any {
    return (Array.from(pluginsNode.value.elements) || []).find(
      (pluginNode: any) => {
        return (
          pluginNode.type === 'NewExpression' &&
          pluginNode.callee?.property?.name === 'ModuleFederationPlugin'
        );
      }
    );
  }

  getModuleFederationPluginOptions(mfPlugin: any) {
    return Array.from(mfPlugin?.arguments || []).find(
      (pluginArgument: any) => pluginArgument.type === 'ObjectExpression'
    );
  }

  #isPluginsNodeBabel(node: any): boolean {
    return node.type === 'ObjectProperty' && node.key.name === 'plugins';
  }

  #isPluginsNodeTypescript(node: any): boolean {
    return node.type === 'Property' && node.key.name === 'plugins';
  }
}
