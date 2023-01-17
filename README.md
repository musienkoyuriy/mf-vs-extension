# VSCode Extension for Module Federation

This extension allows to monitor and operate with federated remotes connected to frontend project. How it works:

- Parses `webpack.config` from the application root (Supports both `.js` and `.ts`)
- Receives the remote entry URL's from `remotes` dictionary.
- Fetches received remote entry url via HTTP and gets the exposed modules from each federated container.
- Displays information about federated containeres end exposed modules via `TreeView` in separare view container


![Package Explorer](./media/mf.svg)

## Running locally

- Open this example in VS Code Insiders
- `yarn install`
- `yarn watch`
- `F5` to start debugging
- Module Federation view is shown in **Module Federation** view container in Activity bar.
