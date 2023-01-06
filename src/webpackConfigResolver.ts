import * as fs from "fs";
import * as esprima from "esprima";
import { traverse } from "./ast-utils";
import { MFConfig, WebpackConfigOptions } from "./types";

const mapAstToPlainJS = (mfPluginProperties: any[]): MFConfig => {
  return Array.from(mfPluginProperties).reduce((acc: MFConfig, prop: any) => {
    if (prop.value.type === "Literal") {
      return {
        ...acc,
        [prop.key?.name]: prop.value.value,
      };
    }
    if (prop.value.type === "TemplateLiteral") {
      return {
        ...acc,
        [prop.key?.name]: prop.value.quasis[0].value.cooked,
      };
    }
    if (
      prop.value.type === "ObjectExpression" &&
      prop.key?.name === "remotes"
    ) {
      return {
        ...acc,
        [prop.key.name]: mapAstToPlainJS(prop.value.properties),
      };
    }
    return acc;
  }, {});
};

export const parseWebpackConfig = (config: WebpackConfigOptions) => {
  const ast = esprima.parseModule(fs.readFileSync(config.fileUri!).toString());

  let mfPluginOptions: any;

  traverse(ast, (node: any) => {
    if (node.type !== "Property" || node.key.name !== "plugins") {
      return;
    }
    const mfPlugin: any = (Array.from(node.value.elements) || []).find(
      (pluginNode: any) => {
        return (
          pluginNode.type === "NewExpression" &&
          pluginNode.callee?.property?.name === "ModuleFederationPlugin"
        );
      }
    );
    mfPluginOptions = Array.from(mfPlugin?.arguments || []).find(
      (pluginArgument: any) => pluginArgument.type === "ObjectExpression"
    );
  });

  return mapAstToPlainJS(mfPluginOptions.properties);
};
