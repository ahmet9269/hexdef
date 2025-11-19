import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ProjectTemplate, getTemplates } from '../templates';

const execAsync = promisify(exec);

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
            NEW_DATAGRAM_TARGET_NAME: process.env.NEW_DATAGRAM_TARGET_NAME || 'new_datagram',
            SCHEMAS_DIR: process.env.SCHEMAS_DIR || '/workspaces/hexdef/schemas'
        };

        console.log('Variables:', variables);

        // Sadece app template'ini kullan
        const appTemplate = getTemplates('app');
        
        await createProjectStructure(baseProjectPath, appTemplate, variables);

        vscode.window.showInformationMessage(
            `Project "${projectName}" (${pseudoAppName}) created successfully!`
        );

        // Makefile'ı otomatik olarak arka planda çalıştır
        const makefilePath = path.join(baseProjectPath, 'Makefile');
        
        if (fs.existsSync(makefilePath)) {
            // Arka planda make çalıştır
            runMakeInBackground(baseProjectPath, projectName);
        }

        // İlk dosyayı aç (varsa main.cpp veya başka bir dosya)
        const possibleFiles = [
            'main.cpp',
            'src/main.cpp',
            'README.md'
        ];
        
        for (const file of possibleFiles) {
            const filePath = path.join(baseProjectPath, file);
            if (fs.existsSync(filePath)) {
                const document = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(document);
                break;
            }
        }

    } catch (error) {
        vscode.window.showErrorMessage(`Error creating project: ${error}`);
        console.error('Project creation error:', error);
    }
}

async function runMakeInBackground(projectPath: string, projectName: string) {
    try {
        console.log(`Running make in background for ${projectName}...`);
        
        // Arka planda make çalıştır
        const { stdout, stderr } = await execAsync('make', {
            cwd: projectPath,
            env: process.env
        });

        // Başarılı build
        if (stdout) {
            console.log('Make output:', stdout);
        }
        
        if (stderr && stderr.trim().length > 0) {
            console.warn('Make warnings:', stderr);
        }

        vscode.window.showInformationMessage(
            `${projectName} built successfully! ✓`
        );

    } catch (error: any) {
        console.error('Make failed:', error);
        
        // Hata durumunda kullanıcıya bildir
        const message = error.stderr || error.message || 'Unknown error';
        vscode.window.showWarningMessage(
            `Build failed for ${projectName}. You can build manually with 'make'.`,
            'Show Error'
        ).then(selection => {
            if (selection === 'Show Error') {
                const channel = vscode.window.createOutputChannel('HexDef Build');
                channel.appendLine(`Build failed for ${projectName}`);
                channel.appendLine(`Error: ${message}`);
                if (error.stdout) {
                    channel.appendLine('\nOutput:');
                    channel.appendLine(error.stdout);
                }
                channel.show();
            }
        });
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
            
            // Content'i al
            let content = item.content || '';
            
            // Önce değişkenleri değiştir (content bir dosya yolu olabilir)
            const processedContent = replaceVariables(content, variables);
            
            // Eğer işlenmiş content bir dosya yolu ise, dosyayı oku
            if (processedContent.startsWith('/') || processedContent.includes('schemas/')) {
                if (fs.existsSync(processedContent)) {
                    console.log(`Reading template file: ${processedContent}`);
                    content = fs.readFileSync(processedContent, 'utf-8');
                    // Okunan dosya içeriğindeki değişkenleri de değiştir
                    content = replaceVariables(content, variables);
                } else {
                    console.warn(`Template file not found: ${processedContent}, using as-is`);
                    content = processedContent;
                }
            } else {
                // Normal içerik, değişkenleri değiştir
                content = processedContent;
            }
            
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
