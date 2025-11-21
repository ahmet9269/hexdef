import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { File } from 'buffer';

const execAsync = promisify(exec);

/**
 * Marker klasörünü içeren dizini bul
 */
function findMarkerDirectory(startPath: string, markerName: string): string | null {
    let currentPath = startPath;
    
    // Maksimum 15 seviye yukarı çık
    for (let i = 0; i < 15; i++) {
        const markerPath = path.join(currentPath, markerName);
        
        // Marker klasörünün varlığını kontrol et
        if (fs.existsSync(markerPath) && fs.statSync(markerPath).isDirectory()) {
            console.log(`✅ Found marker directory: ${markerPath}`);
            return currentPath; // Marker'ı içeren dizini döndür
        }
        
        // Bir üst dizine çık
        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) {
            break;
        }
        currentPath = parentPath;
    }
    
    console.log(`❌ Marker not found: ${markerName} (searched from ${startPath})`);
    return null;
}

/**
 * Proje kök dizinini bul (.project_root marker'ını ara)
 */
function findProjectRoot(folderPath: string): string | null {
    const projectRootDir = findMarkerDirectory(folderPath, '.project_root');
    
    if (projectRootDir) {
        // .project_root klasörü proje kök dizinindedir
        console.log(`🔍 Found project root: ${projectRootDir}`);
        return projectRootDir;
    }
    
    return null;
}

/**
 * Dark veya Gray proje dizinini bul
 */
function findComponentDirectory(folderPath: string): { type: 'dark' | 'gray', dir: string } | null {
    // Önce .project_dark ara
    const darkDir = findMarkerDirectory(folderPath, '.project_dark');
    if (darkDir) {
        console.log(`🔍 Found dark component: ${darkDir}`);
        return { type: 'dark', dir: darkDir };
    }
    
    // Sonra .project_gray ara
    const grayDir = findMarkerDirectory(folderPath, '.project_gray');
    if (grayDir) {
        console.log(`🔍 Found gray component: ${grayDir}`);
        return { type: 'gray', dir: grayDir };
    }
    
    return null;
}

function generateProgramXml(selections: any[]): string {
    const programDatagramDescription = process.env.PROGRAM_DATAGRAM_DESCRIPTION || '';
    const datagramTag = process.env.DATAGRAM || 'datagram';
    
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xmlContent += `<program ${programDatagramDescription}>\n`;
    
    for (const selection of selections) {
        const { name, publish, subscribe } = selection;
        
        let role = '';
        if (publish && subscribe) {
            role = 'pubsub';
        } else if (publish) {
            role = 'pub';
        } else if (subscribe) {
            role = 'sub';
        }
        
        if (role) {
            xmlContent += `     <${datagramTag} name="${name}" role="${role}"/>\n`;
        }
    }
    
    xmlContent += `</program>\n`;
    
    return xmlContent;
}

/**
 * Yeni datagram oluştur
 */
export async function createNewDatagram(uri?: vscode.Uri) {
    try {
        // Uri'yi path'e çevir
        const startPath = uri?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        if (!startPath) {
            vscode.window.showErrorMessage('No folder selected or workspace opened!');
            return;
        }

        // Datagram adı sor
        const datagramName = await vscode.window.showInputBox({
            prompt: 'Enter datagram name',
            placeHolder: 'e.g., UserCreated',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Datagram name cannot be empty';
                }
                if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
                    return 'Datagram name must start with a letter and contain only letters, numbers, and underscores';
                }
                return null;
            }
        });

        if (!datagramName) {
            vscode.window.showWarningMessage('Datagram creation cancelled');
            return;
        }

        // Proje root'unu bul
        const projectRoot = await findProjectRoot(startPath);
        if (!projectRoot) {
            vscode.window.showErrorMessage('Project root (.project_root marker) not found!');
            return;
        }

        // PROJECT_NAME'i bul (proje klasör adından)
        const projectName = path.basename(projectRoot);
        
        // Template'i yükle
        const schemasDir = process.env.SCHEMAS_DIR || path.join(__dirname, '../../schemas');
        const datagramTemplatePath = path.join(schemasDir, 'datagram.xml');
        
        if (!fs.existsSync(datagramTemplatePath)) {
            vscode.window.showErrorMessage(`Datagram template not found: ${datagramTemplatePath}`);
            return;
        }

        let datagramContent = fs.readFileSync(datagramTemplatePath, 'utf-8');
        
        // Değişkenleri değiştir
        datagramContent = datagramContent.replace(/\${DATAGRAM_NAME}/g, datagramName);
        
        // Kayıt yerlerini belirle
        const mwName = process.env.MW_NAME || 'Kafka';
        const newDatagramTarget = process.env.NEW_DATAGRAM_TARGET_NAME || 'new_datagram';
        
        // Gray component path (doğru yapı)
        const grayPath = path.join(
            projectRoot,
            'src',
            projectName,
            'src',
            projectName,
            'adapters',
            'common',
            mwName,
            newDatagramTarget,
            `${datagramName}.xml`
        );
        
        // Dark component path (doğru yapı)
        const darkPath = path.join(
            projectRoot,
            'src',
            'dark_src',
            'src',
            projectName,
            'adapters',
            'common',
            mwName,
            newDatagramTarget,
            `${datagramName}.xml`
        );
        
        console.log('Creating datagram files:');
        console.log('Gray path:', grayPath);
        console.log('Dark path:', darkPath);
        
        // Dosyaları kaydet
        fs.mkdirSync(path.dirname(grayPath), { recursive: true });
        fs.writeFileSync(grayPath, datagramContent, 'utf-8');
        
        fs.mkdirSync(path.dirname(darkPath), { recursive: true });
        fs.writeFileSync(darkPath, datagramContent, 'utf-8');
        
        // Dosyayı aç
        const document = await vscode.workspace.openTextDocument(grayPath);
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage(
            `Datagram '${datagramName}' created successfully!\n\nGray: ${grayPath}\nDark: ${darkPath}`
        );

    } catch (error) {
        vscode.window.showErrorMessage(`Error creating datagram: ${error}`);
        console.error('Create datagram error:', error);
    }
}

/**
 * Make komutunu çalıştır
 */
export async function runMake(uri: vscode.Uri) {
    const folderPath = uri.fsPath;
    const projectRoot = findProjectRoot(folderPath);
    
    if (!projectRoot) {
        vscode.window.showErrorMessage('Could not find project root (.project_root marker)');
        return;
    }
    
    const makefilePath = path.join(projectRoot, 'Makefile');
    
    if (!fs.existsSync(makefilePath)) {
        vscode.window.showErrorMessage(`Makefile not found in ${projectRoot}`);
        return;
    }
    
    try {
        vscode.window.showInformationMessage('Running make...');
        
        const { stdout, stderr } = await execAsync('make', { cwd: projectRoot });
        
        if (stderr) {
            console.error('Make stderr:', stderr);
        }
        
        vscode.window.showInformationMessage('✅ Make completed successfully');
        console.log('Make output:', stdout);
        
    } catch (error: any) {
        vscode.window.showErrorMessage(`Make failed: ${error.message}`);
        console.error('Make error:', error);
    }
}

/**
 * Kodu yeniden oluştur
 */
export async function regenerateCode(uri: vscode.Uri) {
    const folderPath = uri.fsPath;
    const projectRoot = findProjectRoot(folderPath);
    
    if (!projectRoot) {
        vscode.window.showErrorMessage('Could not find project root (.project_root marker)');
        return;
    }
    
    try {
        vscode.window.showInformationMessage('Regenerating code...');
        
        // Önce make clean
        await execAsync('make clean', { cwd: projectRoot });
        
        // Sonra make
        await execAsync('make', { cwd: projectRoot });
        
        vscode.window.showInformationMessage('✅ Code regenerated successfully');
        
    } catch (error: any) {
        vscode.window.showErrorMessage(`Regenerate failed: ${error.message}`);
        console.error('Regenerate error:', error);
    }
}

export async function addRemoveDatagrams(uri?: vscode.Uri) {
    try {
        // Uri'yi path'e çevir
        const startPath = uri?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        if (!startPath) {
            vscode.window.showErrorMessage('No folder selected or workspace opened!');
            return;
        }

        // Proje root'unu bul
        const projectRoot = await findProjectRoot(startPath);
        if (!projectRoot) {
            vscode.window.showErrorMessage('Project root (.project_root marker) not found!');
            return;
        }

        // DATAGRAM_DIR_PATH'den mevcut datagram'ları bul
        const datagramDirPath = process.env.DATAGRAM_DIR_PATH;
        if (!datagramDirPath || !fs.existsSync(datagramDirPath)) {
            vscode.window.showErrorMessage('DATAGRAM_DIR_PATH not found or invalid!');
            return;
        }

        // Datagram dosyalarını listele
        const datagramFiles = fs.readdirSync(datagramDirPath)
            .filter(file => file.endsWith('.xml'));

        if (datagramFiles.length === 0) {
            vscode.window.showWarningMessage('No datagram files found in DATAGRAM_DIR_PATH');
            return;
        }

        // WebView oluştur
        const panel = vscode.window.createWebviewPanel(
            'datagramSelector',
            'Add/Remove Datagrams',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        // WebView HTML
        panel.webview.html = getDatagramSelectorHtml(datagramFiles);

        // WebView'dan mesaj al
        panel.webview.onDidReceiveMessage(
            async message => {
                if (message.command === 'save') {
                    const selections = message.selections;
                    
                    // XML içeriğini oluştur
                    const xmlContent = generateProgramXml(selections);
                    
                    // PROJECT_NAME.xml dosyasını bul ve kaydet
                    const projectName = process.env.PROJECT_NAME || 'Project';
                    const mwName = process.env.MW_NAME || 'Kafka';
                    
                    // Gray component'e kaydet
                    const grayPath = path.join(projectRoot, 'src', projectName, 'src', projectName, 'adapters', 'common', mwName, `${projectName}.xml`);
                    
                    // Dark component'e kaydet
                    const darkPath = path.join(projectRoot, 'src', 'dark_src', 'src', projectName, 'adapters', 'common', mwName, `${projectName}.xml`);
                    
                    // Dosyaları kaydet
                    fs.mkdirSync(path.dirname(grayPath), { recursive: true });
                    fs.writeFileSync(grayPath, xmlContent, 'utf-8');
                    
                    fs.mkdirSync(path.dirname(darkPath), { recursive: true });
                    fs.writeFileSync(darkPath, xmlContent, 'utf-8');
                    
                    vscode.window.showInformationMessage(
                        `Datagrams saved to:\n- ${grayPath}\n- ${darkPath}`
                    );
                    
                    panel.dispose();
                }
            },
            undefined,
            []
        );

    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error}`);
    }
}

function getDatagramSelectorHtml(datagramFiles: string[]): string {
    const datagramList = datagramFiles.map(file => {
        const name = file.replace('.xml', '');
        return `
            <tr>
                <td>${name}</td>
                <td><input type="checkbox" class="pub-checkbox" data-name="${name}"/></td>
                <td><input type="checkbox" class="sub-checkbox" data-name="${name}"/></td>
            </tr>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0;
                }
                th, td { 
                    padding: 10px; 
                    text-align: left; 
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                th { 
                    background-color: var(--vscode-editor-selectionBackground);
                    font-weight: bold;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 20px;
                    cursor: pointer;
                    font-size: 14px;
                    margin: 10px 5px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .header {
                    margin-bottom: 20px;
                }
                input[type="checkbox"] {
                    cursor: pointer;
                    width: 18px;
                    height: 18px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Select Datagrams</h2>
                <p>Choose publish/subscribe options for each datagram</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Datagram Name</th>
                        <th>Publish</th>
                        <th>Subscribe</th>
                    </tr>
                </thead>
                <tbody>
                    ${datagramList}
                </tbody>
            </table>
            
            <button onclick="saveSelections()">Save All</button>
            <button onclick="cancel()">Cancel</button>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function saveSelections() {
                    const selections = [];
                    const rows = document.querySelectorAll('tbody tr');
                    
                    rows.forEach(row => {
                        const name = row.querySelector('.pub-checkbox').getAttribute('data-name');
                        const publish = row.querySelector('.pub-checkbox').checked;
                        const subscribe = row.querySelector('.sub-checkbox').checked;
                        
                        if (publish || subscribe) {
                            selections.push({ name, publish, subscribe });
                        }
                    });
                    
                    vscode.postMessage({
                        command: 'save',
                        selections: selections
                    });
                }
                
                function cancel() {
                    vscode.postMessage({
                        command: 'cancel'
                    });
                }
            </script>
        </body>
        </html>
    `;
}
