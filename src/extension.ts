import * as vscode from 'vscode';
import { createMultipleProjects } from './commands/multiScaffold';

export function activate(context: vscode.ExtensionContext) {
    console.log('HexDef extension is now active!');

    let disposable = vscode.commands.registerCommand('hexdef.createMultipleProjects', async () => {
        await createMultipleProjects();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
