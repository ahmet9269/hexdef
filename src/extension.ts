import * as vscode from 'vscode';
import { createMultipleProjects } from './commands/multiScaffold';
import { addRemoveDatagrams, createNewDatagram } from './commands/kafka';

export function activate(context: vscode.ExtensionContext) {
    console.log('HexDef extension is now active!');

    let disposable = vscode.commands.registerCommand('hexdef.createMultipleProjects', async () => {
        await createMultipleProjects();
    });

    let kafkaAddRemove = vscode.commands.registerCommand('hexdef.kafka.addRemoveDatagrams', async (uri: vscode.Uri) => {
        await addRemoveDatagrams(uri);
    });

    let kafkaCreate = vscode.commands.registerCommand('hexdef.kafka.createNewDatagram', async (uri: vscode.Uri) => {
        await createNewDatagram(uri);
    });

    context.subscriptions.push(disposable, kafkaAddRemove, kafkaCreate);
}

export function deactivate() {}
