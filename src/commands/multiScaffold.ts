import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectTemplate, getTemplates } from '../templates';

export async function createMultipleProjects() {
    // Kullanıcıdan proje adını al
    const projectName = await vscode.window.showInputBox({
        prompt: 'Proje adını girin (her template için alt klasör oluşturulacak)',
        placeHolder: 'my-project',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Proje adı boş olamaz';
            }
            if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
                return 'Proje adı sadece harf, rakam, tire ve alt çizgi içerebilir';
            }
            return null;
        }
    });

    if (!projectName) {
        return;
    }

    // Proje oluşturulacak dizini seç
    const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Proje konumunu seç'
    });

    if (!folderUri || folderUri.length === 0) {
        return;
    }

    const baseProjectPath = path.join(folderUri[0].fsPath, projectName);

    // Ana proje dizini zaten varsa uyar
    if (fs.existsSync(baseProjectPath)) {
        vscode.window.showErrorMessage(`"${projectName}" klasörü zaten mevcut!`);
        return;
    }

    try {
        // Ana dizini oluştur
        fs.mkdirSync(baseProjectPath, { recursive: true });

        // Her template için alt klasör oluştur
        const templates: Array<{ name: string, template: ProjectTemplate }> = [
            { name: 'white', template: getTemplates('white') },
            { name: 'gray', template: getTemplates('gray') },
            { name: 'dark', template: getTemplates('dark') }
        ];

        let successCount = 0;
        const errors: string[] = [];

        for (const { name, template } of templates) {
            try {
                const templatePath = path.join(baseProjectPath, name);
                await createProjectStructure(templatePath, template);
                successCount++;
            } catch (error) {
                errors.push(`${name}: ${error}`);
            }
        }

        if (successCount === templates.length) {
            vscode.window.showInformationMessage(
                `Proje "${projectName}" başarıyla oluşturuldu! (${successCount} template)`
            );
        } else {
            vscode.window.showWarningMessage(
                `${successCount}/${templates.length} template oluşturuldu. Hatalar: ${errors.join(', ')}`
            );
        }

        // Kullanıcıya yeni projeyi açmak isteyip istemediğini sor
        const openProject = await vscode.window.showInformationMessage(
            'Yeni projeyi açmak ister misiniz?',
            'Evet',
            'Hayır'
        );

        if (openProject === 'Evet') {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(baseProjectPath));
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Proje oluşturulurken hata: ${error}`);
    }
}

async function createProjectStructure(projectPath: string, template: ProjectTemplate) {
    // Ana dizini oluştur
    fs.mkdirSync(projectPath, { recursive: true });

    // Template'deki tüm dosya ve klasörleri oluştur
    for (const item of template.structure) {
        // Environment variable'ları değiştir (${VAR_NAME} formatında)
        let itemPath = item.path;
        itemPath = replaceEnvironmentVariables(itemPath);
        
        const fullPath = path.join(projectPath, itemPath);

        if (item.type === 'directory') {
            fs.mkdirSync(fullPath, { recursive: true });
        } else if (item.type === 'file') {
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Content içindeki environment variable'ları da değiştir
            let content = item.content || '';
            content = replaceEnvironmentVariables(content);
            fs.writeFileSync(fullPath, content);
        }
    }
}

function replaceEnvironmentVariables(text: string): string {
    return text.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const envValue = process.env[varName];
        if (envValue === undefined) {
            if (varName === 'DB') {
                return 'TEST_DB';
            }
            return match;
        }
        return envValue;
    });
}
