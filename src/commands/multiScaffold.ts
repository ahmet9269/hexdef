import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectTemplate, getTemplates } from '../templates';

export async function createMultipleProjects(uri?: vscode.Uri) {
    // Kullanıcıdan proje adını al
    const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: 'e.g., UserService',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Project name cannot be empty';
            }
            if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(value)) {
                return 'Project name must start with a letter and contain only letters, numbers, hyphens, and underscores';
            }
            return null;
        }
    });

    if (!projectName) {
        return;
    }

    // Pseudo App Name al
    const pseudoAppName = await vscode.window.showInputBox({
        prompt: 'Enter pseudo app name',
        placeHolder: 'e.g., hex_c, user_svc',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Pseudo app name cannot be empty';
            }
            if (!/^[a-z][a-z0-9_]*$/.test(value)) {
                return 'Pseudo app name must start with lowercase letter and contain only lowercase letters, numbers, and underscores';
            }
            return null;
        }
    });

    if (!pseudoAppName) {
        return;
    }

    // Eğer uri verilmişse (sağ tık ile çağrıldıysa) onu kullan
    let targetPath: string;
    
    if (uri && uri.fsPath) {
        targetPath = uri.fsPath;
    } else {
        // Proje oluşturulacak dizini seç
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select project location'
        });

        if (!folderUri || folderUri.length === 0) {
            return;
        }
        
        targetPath = folderUri[0].fsPath;
    }

    const baseProjectPath = path.join(targetPath, projectName);

    // Ana proje dizini zaten varsa uyar
    if (fs.existsSync(baseProjectPath)) {
        const overwrite = await vscode.window.showWarningMessage(
            `"${projectName}" folder already exists! Do you want to overwrite it?`,
            'Yes', 'No'
        );
        
        if (overwrite !== 'Yes') {
            return;
        }
    }

    try {
        // Ana dizini oluştur
        fs.mkdirSync(baseProjectPath, { recursive: true });

        // Değişkenler objesi oluştur
        const variables = {
            PROJECT_NAME: projectName,
            PSEUDO_APP_NAME: pseudoAppName,
            DB: process.env.DB || 'TEST_DB',
            NEW_DATAGRAM_TARGET_NAME: process.env.NEW_DATAGRAM_TARGET_NAME || 'new_datagram'
        };

        // Her template için alt klasör oluştur
        const templates: Array<{ name: string, template: ProjectTemplate }> = [
            { name: 'white', template: getTemplates('white') },            
            { name: 'app', template: getTemplates('app') },
            { name: 'dark', template: getTemplates('dark') }
        ];

        let successCount = 0;
        const errors: string[] = [];

        for (const { name, template } of templates) {
            try {
                const templatePath = path.join(baseProjectPath, name);
                await createProjectStructure(templatePath, template, variables);
                successCount++;
            } catch (error) {
                errors.push(`${name}: ${error}`);
            }
        }

        if (successCount === templates.length) {
            vscode.window.showInformationMessage(
                `Project "${projectName}" (${pseudoAppName}) created successfully! (${successCount} templates)`
            );
        } else {
            vscode.window.showWarningMessage(
                `${successCount}/${templates.length} templates created. Errors: ${errors.join(', ')}`
            );
        }

        // Kullanıcıya yeni projeyi açmak isteyip istemediğini sor
        const openProject = await vscode.window.showInformationMessage(
            'Do you want to open the new project?',
            'Yes',
            'No'
        );

        if (openProject === 'Yes') {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(baseProjectPath));
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating project: ${error}`);
    }
}

async function createProjectStructure(
    projectPath: string, 
    template: ProjectTemplate, 
    variables: { [key: string]: string }
) {
    // Ana dizini oluştur
    fs.mkdirSync(projectPath, { recursive: true });

    // Template'deki tüm dosya ve klasörleri oluştur
    for (const item of template.structure) {
        // Path'i değişkenlerle değiştir
        let itemPath = replaceVariables(item.path, variables);
        
        const fullPath = path.join(projectPath, itemPath);

        if (item.type === 'directory') {
            fs.mkdirSync(fullPath, { recursive: true });
        } else if (item.type === 'file') {
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Content'i de değişkenlerle değiştir
            let content = item.content || '';
            content = replaceVariables(content, variables);
            fs.writeFileSync(fullPath, content);
        }
    }
}

function replaceVariables(text: string, variables: { [key: string]: string }): string {
    let result = text;
    
    // ${VAR_NAME} formatındaki tüm değişkenleri değiştir
    for (const [key, value] of Object.entries(variables)) {
        const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
        result = result.replace(pattern, value);
    }
    
    return result;
}
