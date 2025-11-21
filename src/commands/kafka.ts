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
        return `<option value="${name}">${name}</option>`;
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
                .container {
                    display: flex;
                    gap: 20px;
                    align-items: center;
                    margin: 20px 0;
                }
                .panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .panel h3 {
                    margin-bottom: 10px;
                    color: var(--vscode-foreground);
                }
                select {
                    width: 100%;
                    height: 300px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 5px;
                    font-size: 14px;
                }
                select option {
                    padding: 5px;
                }
                .controls {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    justify-content: center;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 20px;
                    cursor: pointer;
                    font-size: 16px;
                    min-width: 60px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .action-buttons {
                    margin-top: 20px;
                    display: flex;
                    gap: 10px;
                }
                .selected-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 5px;
                    margin: 2px 0;
                }
                .role-selector {
                    display: flex;
                    gap: 10px;
                    font-size: 12px;
                }
                .role-selector label {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                }
            </style>
        </head>
        <body>
            <h2>Add/Remove Datagrams</h2>
            <p>Select datagrams and choose their roles (Publish/Subscribe)</p>
            
            <div class="container">
                <div class="panel">
                    <h3>Available Datagrams</h3>
                    <select id="availableList" multiple>
                        ${datagramList}
                    </select>
                </div>
                
                <div class="controls">
                    <button id="addBtn" title="Add selected datagrams →">→</button>
                    <button id="removeBtn" title="← Remove selected datagrams">←</button>
                </div>
                
                <div class="panel">
                    <h3>Selected Datagrams</h3>
                    <div id="selectedList" style="border: 1px solid var(--vscode-input-border); padding: 10px; min-height: 300px; background-color: var(--vscode-input-background);"></div>
                </div>
            </div>
            
            <div class="action-buttons">
                <button id="saveBtn">Save All</button>
                <button id="cancelBtn">Cancel</button>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                let selectedDatagrams = [];
                
                const availableList = document.getElementById('availableList');
                const selectedListDiv = document.getElementById('selectedList');
                const addBtn = document.getElementById('addBtn');
                const removeBtn = document.getElementById('removeBtn');
                const saveBtn = document.getElementById('saveBtn');
                const cancelBtn = document.getElementById('cancelBtn');
                
                // Add datagram
                addBtn.addEventListener('click', () => {
                    const selected = Array.from(availableList.selectedOptions);
                    selected.forEach(option => {
                        const name = option.value;
                        if (!selectedDatagrams.find(d => d.name === name)) {
                            selectedDatagrams.push({
                                name: name,
                                publish: true,
                                subscribe: false
                            });
                        }
                    });
                    renderSelectedList();
                });
                
                // Remove datagram
                removeBtn.addEventListener('click', () => {
                    const toRemove = Array.from(document.querySelectorAll('.selected-item input[type="checkbox"]:checked'))
                        .map(cb => cb.closest('.selected-item').dataset.name);
                    
                    selectedDatagrams = selectedDatagrams.filter(d => !toRemove.includes(d.name));
                    renderSelectedList();
                });
                
                // Render selected list
                function renderSelectedList() {
                    selectedListDiv.innerHTML = selectedDatagrams.map(datagram => \`
                        <div class="selected-item" data-name="\${datagram.name}">
                            <input type="checkbox" class="remove-checkbox">
                            <span>\${datagram.name}</span>
                            <div class="role-selector">
                                <label>
                                    <input type="checkbox" 
                                           class="pub-check" 
                                           data-name="\${datagram.name}"
                                           \${datagram.publish ? 'checked' : ''}>
                                    Pub
                                </label>
                                <label>
                                    <input type="checkbox" 
                                           class="sub-check" 
                                           data-name="\${datagram.name}"
                                           \${datagram.subscribe ? 'checked' : ''}>
                                    Sub
                                </label>
                            </div>
                        </div>
                    \`).join('');
                    
                    // Add event listeners for pub/sub checkboxes
                    document.querySelectorAll('.pub-check').forEach(cb => {
                        cb.addEventListener('change', (e) => {
                            const name = e.target.dataset.name;
                            const datagram = selectedDatagrams.find(d => d.name === name);
                            if (datagram) {
                                datagram.publish = e.target.checked;
                            }
                        });
                    });
                    
                    document.querySelectorAll('.sub-check').forEach(cb => {
                        cb.addEventListener('change', (e) => {
                            const name = e.target.dataset.name;
                            const datagram = selectedDatagrams.find(d => d.name === name);
                            if (datagram) {
                                datagram.subscribe = e.target.checked;
                            }
                        });
                    });
                }
                
                // Save
                saveBtn.addEventListener('click', () => {
                    if (selectedDatagrams.length === 0) {
                        alert('Please select at least one datagram!');
                        return;
                    }
                    
                    vscode.postMessage({
                        command: 'save',
                        selections: selectedDatagrams
                    });
                });
                
                // Cancel
                cancelBtn.addEventListener('click', () => {
                    vscode.postMessage({ command: 'cancel' });
                });
                
                // Initial render
                renderSelectedList();
            </script>
        </body>
        </html>
    `;
}
