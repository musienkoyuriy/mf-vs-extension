# VSCode Extension for Module Federation

This extension allows to monitor and operate with federated remotes connected to frontend project. How it works:

- Parses `webpack.config` from the application root (Supports both `.js` and `.ts`)
- Receives the remote entry URL's from `remotes` dictionary.
- Fetches received remote entry url via HTTP and gets the exposed modules from each federated container.
- Displays information about federated containeres end exposed modules via `TreeView` in separare view container


![Package Explorer](./media/mf.png)

## Running locally

In order to make extensions works propery you'll need to use this [webpack plugin](https://github.com/musienkoyuriy/share-remote-entries-plugin) to share remotes from you `webpack.config` to extension.

- Open this example in VS Code Insiders
- `yarn install`
- `yarn watch`
- `F5` to start debugging
- Module Federation view is shown in **Module Federation** view container in Activity bar.


## To do:

- Versions management via VSCode interface
- Integrate with marketplace (discoverability functionality) when it will be done
- (?) Rethink the communication layer between [webpack plugin](https://github.com/musienkoyuriy/share-remote-entries-plugin) and VSCode extension to provide more cohesion.
- Handle production minified remote entries bundles
- Unify AST manipulation (remove typescript-eslint/parser and use TS preset for `@babel/parser`)