import * as vscode from 'vscode';
import { createMultipleProjects, regenerateCode, runMake } from './commands/multiScaffold';
import { addRemoveDatagrams, createNewDatagram } from './commands/kafka';

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
