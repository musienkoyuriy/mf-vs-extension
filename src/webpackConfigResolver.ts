import * as fs from 'fs';
import { parseModule, Syntax, Program } from 'esprima';
import { parse as typescriptParse } from '@typescript-eslint/parser';
import { traverse } from './ast-utils';
import { MFConfig, WebpackConfigOptions } from './types';

const resolveDynamicEntry = (ast: any, remoteEntry: string): string => {
  const regexp = /\[(.+?)\]/g;
  const matches = remoteEntry.match(regexp);

  if (!matches || matches.length === 0) {
    return remoteEntry;
  }

  const removeBrackets = (match: string) => match.slice(1, match.length - 1);
  const matchesWithoutBrackets = matches.map(removeBrackets);

  let transpiledMap = new Map();

  traverse(ast, (node) => {
    if (node.type === Syntax.VariableDeclaration) {
      const neededDeclarator = node.declarations.find((declarator: any) => {
        return matchesWithoutBrackets.includes(declarator.id.name);
      });
      if (!neededDeclarator) {
        return;
      }
      const {
        id: { name },
        init: { value },
      } = neededDeclarator;
      transpiledMap.set(name, value);
    }
  });

  if (matches.length !== transpiledMap.size) {
    throw new Error(
      "MF: Can't resolve one of dynamic parameters in remote entry."
    );
  }

  return remoteEntry.replaceAll(regexp, (match) => {
    return transpiledMap.get(removeBrackets(match));
  });
};

const mapAstToPlainJS = (ast: any, mfPluginProperties: any[]): MFConfig => {
  return Array.from(mfPluginProperties).reduce((acc: MFConfig, prop: any) => {
    if (prop.value.type === Syntax.Literal) {
      acc[prop.key?.name] = resolveDynamicEntry(ast, prop.value.value);
    }
    if (prop.value.type === Syntax.TemplateLiteral) {
      acc[prop.key?.name] = resolveDynamicEntry(
        ast,
        prop.value.quasis[0].value.cooked
      );
    }
    if (
      prop.value.type === Syntax.ObjectExpression &&
      prop.key?.name === 'remotes'
    ) {
      acc[prop.key.name] = <Record<string, string>>(
        mapAstToPlainJS(ast, prop.value.properties)
      );
    }
    return acc;
  }, {});
};

const resolveWebpackConfigBody = (
  config: WebpackConfigOptions
): Program | any => {
  const fileBody = fs.readFileSync(config.fileUri!).toString();

  if (config.extension === 'js') {
    return parseModule(fileBody);
  }

  return typescriptParse(fileBody);
};

export const parseWebpackConfig = (config: WebpackConfigOptions) => {
  const configSyntaxTree = resolveWebpackConfigBody(config);

  let mfPluginOptions: any;

  traverse(configSyntaxTree, (node: any) => {
    if (node.type !== Syntax.Property || node.key.name !== 'plugins') {
      return;
    }
    const mfPlugin: any = (Array.from(node.value.elements) || []).find(
      (pluginNode: any) => {
        return (
          pluginNode.type === Syntax.NewExpression &&
          pluginNode.callee?.property?.name === 'ModuleFederationPlugin'
        );
      }
    );
    mfPluginOptions = Array.from(mfPlugin?.arguments || []).find(
      (pluginArgument: any) => pluginArgument.type === Syntax.ObjectExpression
    );
  });

  return mapAstToPlainJS(configSyntaxTree, mfPluginOptions.properties);
};
