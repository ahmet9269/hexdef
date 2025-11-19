import * as vscode from 'vscode';
import { createProject } from './commands/scaffold';
import { createMultipleProjects } from './commands/multiScaffold';
import { addRemoveDatagrams, createNewDatagram, runMake, regenerateCode } from './commands/kafka';

export function activate(context: vscode.ExtensionContext) {
    console.log('HexDef extension is now active!');

    // Çevre değişkeninden MW_NAME al
    const mwName = process.env.MW_NAME || 'Kafka';
    console.log(`Using middleware name: ${mwName}`);

    // Submenu label'ını güncelle (VS Code API'sinde bu mümkün değil)
    // Ancak komut title'larını güncelleyebiliriz

    // Yeni dinamik tek proje oluşturma komutu
    context.subscriptions.push(
        vscode.commands.registerCommand('hexdef.createNewProject', async (uri: vscode.Uri) => {
            await createMultipleProjects(uri);
        })
    );
    
    // ✨ Run Make komutu (ana seviyede)
    context.subscriptions.push(
        vscode.commands.registerCommand('hexdef.runMake', async (uri: vscode.Uri) => {
            await runMake(uri);
        })
    );

    // ✨ Regenerate Code komutu
    context.subscriptions.push(
        vscode.commands.registerCommand('hexdef.regenerateCode', async (uri: vscode.Uri) => {
            await regenerateCode(uri);
        })
    );

    // Kafka komutları - Title'ları dinamik yap
    let kafkaAddRemove = vscode.commands.registerCommand(
        'hexdef.kafka.addRemoveDatagrams', 
        async (uri: vscode.Uri) => {
            await addRemoveDatagrams(uri);
        }
    );

    let kafkaCreate = vscode.commands.registerCommand(
        'hexdef.kafka.createNewDatagram', 
        async (uri: vscode.Uri) => {
            await createNewDatagram(uri);
        }
    );

    context.subscriptions.push(kafkaAddRemove, kafkaCreate);

    // Bilgilendirme mesajı göster
    if (process.env.MW_NAME && process.env.MW_NAME !== 'Kafka') {
        vscode.window.showInformationMessage(
            `HexDef loaded with middleware: ${mwName}`
        );
    }
}

export function deactivate() {}
