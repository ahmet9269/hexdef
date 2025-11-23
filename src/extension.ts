import * as vscode from 'vscode';
import { createMultipleProjects } from './commands/multiScaffold';
import { addRemoveDatagrams, createNewDatagram, regenerateCode, runMake } from './commands/kafka';
import { addIncomingPort, addOutgoingPort } from './commands/addPort';
import { addIncomingAdapter, addOutgoingAdapter } from './commands/addAdapter';

export function activate(context: vscode.ExtensionContext) {
    console.log('HexDef extension is now active!');

    // Çevre değişkeninden MW_NAME al
    const mwName = process.env.MW_NAME || 'Kafka';
    console.log(`Using middleware name: ${mwName}`);

    // Komutları kaydet
    context.subscriptions.push(
        vscode.commands.registerCommand('hexdef.createNewProject', async (uri: vscode.Uri) => {
            await createMultipleProjects(uri);
        }),
        
        vscode.commands.registerCommand('hexdef.runMake', async (uri: vscode.Uri) => {
            await runMake(uri);
        }),

        vscode.commands.registerCommand('hexdef.regenerateCode', async (uri: vscode.Uri) => {
            await regenerateCode(uri);
        }),

        vscode.commands.registerCommand('hexdef.middleware.addRemoveDatagrams', async (uri: vscode.Uri) => {
            await addRemoveDatagrams(uri);
        }),

        vscode.commands.registerCommand('hexdef.middleware.createNewDatagram', async (uri: vscode.Uri) => {
            await createNewDatagram(uri);
        }),

        vscode.commands.registerCommand('hexdef.addPort.incoming', async (uri: vscode.Uri) => {
            await addIncomingPort(uri);
        }),

        vscode.commands.registerCommand('hexdef.addPort.outgoing', async (uri: vscode.Uri) => {
            await addOutgoingPort(uri);
        }),

        vscode.commands.registerCommand('hexdef.addAdapter.incoming', async (uri: vscode.Uri) => {
            await addIncomingAdapter(uri);
        }),

        vscode.commands.registerCommand('hexdef.addAdapter.outgoing', async (uri: vscode.Uri) => {
            await addOutgoingAdapter(uri);
        })
    );

    // Bilgilendirme mesajı göster
    if (mwName !== 'Kafka') {
        vscode.window.showInformationMessage(
            `HexDef loaded with middleware: ${mwName}`
        );
    }
}

export function deactivate() {
    console.log('HexDef extension deactivated');
}
