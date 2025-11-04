import * as vscode from 'vscode';
import { createProject } from './commands/scaffold';
import { createMultipleProjects } from './commands/multiScaffold';
import { addRemoveDatagrams, createNewDatagram } from './commands/kafka';

export function activate(context: vscode.ExtensionContext) {
    console.log('HexDef extension is now active!');

    // Yeni dinamik tek proje oluşturma komutu - multiScaffold'u çağırır
    context.subscriptions.push(
        vscode.commands.registerCommand('hexdef.createNewProject', async (uri: vscode.Uri) => {
            await createMultipleProjects(uri);
        })
    );
    
    // Eski çoklu proje oluşturma komutu (isteğe bağlı, kaldırılabilir)
    context.subscriptions.push(
        vscode.commands.registerCommand('hexdef.createMultipleProjects', createMultipleProjects)
    );

    let kafkaAddRemove = vscode.commands.registerCommand('hexdef.kafka.addRemoveDatagrams', async (uri: vscode.Uri) => {
        await addRemoveDatagrams(uri);
    });

    let kafkaCreate = vscode.commands.registerCommand('hexdef.kafka.createNewDatagram', async (uri: vscode.Uri) => {
        await createNewDatagram(uri);
    });

    context.subscriptions.push(kafkaAddRemove, kafkaCreate);
}

export function deactivate() {}
