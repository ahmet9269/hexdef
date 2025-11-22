import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ProjectTemplate, getTemplates } from '../templates';

const execAsync = promisify(exec);

export async function createMultipleProjects(uri?: vscode.Uri) {
    try {
        // Kullanıcıdan proje adını al
        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter project name',
            placeHolder: 'e.g., UserService',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Project name cannot be empty';
                }
                if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
                    return 'Project name must start with a letter and contain only letters, numbers, and underscores';
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

        // ✅ KULLANICIDAN PATH SOR
        let targetPath: string;

        if (uri && uri.fsPath) {
            // Sağ tık ile çağrıldıysa, o klasörü varsayılan olarak göster
            const stat = fs.statSync(uri.fsPath);
            targetPath = stat.isDirectory() ? uri.fsPath : path.dirname(uri.fsPath);
        } else {
            // Workspace root'u varsayılan olarak al
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            targetPath = workspaceFolders[0].uri.fsPath;
        }

        // ✅ Kullanıcıya folder picker göster
        const selectedUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: vscode.Uri.file(targetPath),
            openLabel: 'Select Project Location',
            title: `Select where to create "${projectName}"`
        });

        if (!selectedUri || selectedUri.length === 0) {
            vscode.window.showWarningMessage('No folder selected. Project creation cancelled.');
            return;
        }

        targetPath = selectedUri[0].fsPath;

        const baseProjectPath = path.join(targetPath, projectName);

        // Ana proje dizini zaten varsa uyar
        if (fs.existsSync(baseProjectPath)) {
            const overwrite = await vscode.window.showWarningMessage(
                `Project "${projectName}" already exists. Overwrite?`,
                'Yes', 'No'
            );
            
            if (overwrite !== 'Yes') {
                return;
            }
            
            // Mevcut projeyi sil
            fs.rmSync(baseProjectPath, { recursive: true, force: true });
        }

        try {
            // Environment variables'ı al
            const db = process.env.DB || 'postgres';
            const schemasDir = process.env.SCHEMAS_DIR || path.join(__dirname, '../../schemas');
            const newDatagramTargetName = process.env.NEW_DATAGRAM_TARGET_NAME || 'new_datagram';
            const mwName = process.env.MW_NAME || 'Kafka'; // ✅ EKLENEN

            console.log('🔍 Environment Variables:');
            console.log('  DB:', db);
            console.log('  SCHEMAS_DIR:', schemasDir);
            console.log('  NEW_DATAGRAM_TARGET_NAME:', newDatagramTargetName);
            console.log('  MW_NAME:', mwName); // ✅ EKLENEN

            // ✅ Variables objesini oluştur
            const variables = {
                PROJECT_NAME: projectName,
                PSEUDO_APP_NAME: pseudoAppName,
                DB: db,
                SCHEMAS_DIR: schemasDir,
                NEW_DATAGRAM_TARGET_NAME: newDatagramTargetName,
                MW_NAME: mwName // ✅ EKLENEN
            };

            console.log('📋 All Variables:', variables);

            // Template'i yükle
            const templatePath = path.join(schemasDir, 'app.json');
            
            if (!fs.existsSync(templatePath)) {
                vscode.window.showErrorMessage(`Template file not found: ${templatePath}`);
                return;
            }

            const templateContent = fs.readFileSync(templatePath, 'utf-8');
            const template = JSON.parse(templateContent) as ProjectTemplate;

            // ✅ Progress Bar ile Proje Oluşturma (Show Amaçlı)
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification, // VS Code API sınırlaması: Ekranın ortasında progress bar yok.
                title: `Creating HexArch Project: ${projectName}`,
                cancellable: false
            }, async (progress) => {
                // Başlangıç
                progress.report({ increment: 0, message: 'Initializing project structure...' });
                
                // Gerçek işlem: Proje yapısını oluştur
                await createProjectStructure(baseProjectPath, template, variables);

                // ✅ DOSYALAR OLUŞTU, HEMEN MAKE ÇALIŞTIR (Progress bar bitmeden)
                const makefilePath = path.join(baseProjectPath, 'Makefile');
                if (fs.existsSync(makefilePath)) {
                    console.log(`🔨 Auto-running make in: ${baseProjectPath}`);
                    
                    // Terminal oluştur ve make çalıştır
                    const terminal = vscode.window.createTerminal({
                        name: `Build: ${projectName}`,
                        cwd: baseProjectPath
                    });
                    
                    terminal.show();
                    terminal.sendText('make');
                }
                
                // Show amaçlı bekleme adımları (Toplam ~3 saniye)
                progress.report({ increment: 30, message: 'Applying templates and variables...' });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                progress.report({ increment: 60, message: 'Configuring middleware settings...' });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                progress.report({ increment: 90, message: 'Finalizing project setup...' });
                await new Promise(resolve => setTimeout(resolve, 1000));
            });

            // ✅ Ekranın ortasında MODAL mesaj göster
            vscode.window.showInformationMessage(
                `Project '${projectName}' created successfully!`,
                { modal: true, detail: 'The project structure has been generated and the build process has started in the terminal.' },
                'OK'
            );

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create project: ${error}`);
            console.error('❌ Project creation error:', error);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error}`);
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

    console.log('🏗️  Creating project structure...');
    console.log('📋 Variables:', variables); // ✅ Debug: Variables'ı yazdır

    for (const item of template.structure) {
        try {
            // ✅ item.path her zaman değişkenlerle değiştirilmeli
            let itemPath = item.path || '';
            
            // Path'teki değişkenleri değiştir
            itemPath = replaceVariables(itemPath, variables);
            
            const fullPath = path.join(projectPath, itemPath);

            console.log(`  Processing: ${item.type || 'unknown'} - ${itemPath}`);

            if (item.type === 'directory') {
                // Klasör oluştur
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { recursive: true });
                    console.log(`    ✅ Created directory: ${itemPath}`);
                } else {
                    console.log(`    ⏭️  Directory exists: ${itemPath}`);
                }
            } else if (item.type === 'file') {
                // Dosya oluştur
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                let content = item.content || '';

                // ✅ Content'teki değişkenleri önce değiştir
                content = replaceVariables(content, variables);

                // Eğer content bir dosya yolu ise (template dosyası)
                if (fs.existsSync(content)) {
                    const templateContent = fs.readFileSync(content, 'utf-8');
                    // ✅ Template dosyasının içeriğindeki değişkenleri de değiştir
                    content = replaceVariables(templateContent, variables);
                    console.log(`    📄 Loaded template from: ${content}`);
                }

                // Dosyayı yaz
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`    ✅ Created file: ${itemPath}`);
            }
        } catch (error) {
            console.error(`    ❌ Error processing ${item.path}:`, error);
        }
    }

    console.log('✅ Project structure created successfully');
}

function replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        result = result.replace(regex, value);
    }
    
    return result;
}

export async function createMultiScaffoldProject(uri: vscode.Uri) {
    const folderPath = uri.fsPath;

    // Get project name
    const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: 'e.g., MyHexagonalApp',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Project name cannot be empty';
            }
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
                return 'Project name must start with a letter and contain only letters, numbers, and underscores';
            }
            return null;
        }
    });

    if (!projectName) {
        return;
    }

    // Get pseudo app name
    const pseudoAppName = await vscode.window.showInputBox({
        prompt: 'Enter pseudo app name',
        placeHolder: 'e.g., my_app',
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

    // Get environment variables
    const db = process.env.DB || 'postgres';
    const schemasDir = process.env.SCHEMAS_DIR || path.join(__dirname, '../../schemas');
    const newDatagramTargetName = process.env.NEW_DATAGRAM_TARGET_NAME || 'new_datagram';
    const mwName = process.env.MW_NAME || 'Kafka'; // ✅ MW_NAME'i al

    console.log('🔍 Environment Variables:');
    console.log('  DB:', db);
    console.log('  SCHEMAS_DIR:', schemasDir);
    console.log('  NEW_DATAGRAM_TARGET_NAME:', newDatagramTargetName);
    console.log('  MW_NAME:', mwName); // ✅ Log ekle

    // Create variables object
    const variables = {
        PROJECT_NAME: projectName,
        PSEUDO_APP_NAME: pseudoAppName,
        DB: db,
        SCHEMAS_DIR: schemasDir,
        NEW_DATAGRAM_TARGET_NAME: newDatagramTargetName,
        MW_NAME: mwName // ✅ MW_NAME'i ekle
    };

    console.log('📋 Variables:', variables);

    // Load template
    const templatePath = path.join(schemasDir, 'app.json');
    
    if (!fs.existsSync(templatePath)) {
        vscode.window.showErrorMessage(`Template file not found: ${templatePath}`);
        return;
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const template = JSON.parse(templateContent);

    // Create project directory
    const projectPath = path.join(folderPath, projectName);
    
    if (fs.existsSync(projectPath)) {
        const overwrite = await vscode.window.showWarningMessage(
            `Project directory "${projectName}" already exists. Overwrite?`,
            'Yes', 'No'
        );
        
        if (overwrite !== 'Yes') {
            return;
        }
    }

    try {
        fs.mkdirSync(projectPath, { recursive: true });
        console.log(`✅ Created project directory: ${projectPath}`);

        // Process template structure
        for (const item of template.structure) {
            const itemPath = replaceVariables(item.path, variables);
            const fullPath = path.join(projectPath, itemPath);

            if (item.type === 'directory') {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`✅ Created directory: ${itemPath}`);
            } else if (item.type === 'file') {
                const dir = path.dirname(fullPath);
                fs.mkdirSync(dir, { recursive: true });

                let content = item.content || '';
                
                // Check if content is a file path (starts with ${SCHEMAS_DIR})
                if (content.startsWith('${SCHEMAS_DIR}')) {
                    const templateFilePath = replaceVariables(content, variables);
                    
                    if (fs.existsSync(templateFilePath)) {
                        content = fs.readFileSync(templateFilePath, 'utf-8');
                    } else {
                        console.warn(`⚠️ Template file not found: ${templateFilePath}`);
                        content = `# File from template: ${templateFilePath}\n`;
                    }
                }

                // Replace variables in content
                content = replaceVariables(content, variables);

                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`✅ Created file: ${itemPath}`);
            }
        }

        vscode.window.showInformationMessage(
            `✅ Project "${projectName}" created successfully!`
        );

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create project: ${error}`);
        console.error('❌ Project creation error:', error);
    }
}

export async function regenerateCode(uri?: vscode.Uri) {
    vscode.window.showInformationMessage('Regenerate Code - Coming Soon!');
}

export async function runMake(uri?: vscode.Uri) {
    vscode.window.showInformationMessage('Run Make - Coming Soon!');
}
