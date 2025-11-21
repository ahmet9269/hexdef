import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

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

// ...existing code for addRemoveDatagrams, findDatagramDirectories, createDatagramDirectories, saveDatagramsToXML, getWebviewContent...

export async function addRemoveDatagrams(uri: vscode.Uri) {
    const folderPath = uri.fsPath;
    
    // Proje kök dizinini bul
    const projectRoot = findProjectRoot(folderPath);
    
    if (!projectRoot) {
        vscode.window.showErrorMessage(
            'Could not find project root. Make sure you are inside a HexArch project.'
        );
        return;
    }

    const projectName = path.basename(projectRoot);
    
    // MW_NAME'i al (Kafka, RabbitMQ, vb.)
    const config = vscode.workspace.getConfiguration('hexdef');
    const mwName = config.get<string>('middlewareName') || process.env.MW_NAME || 'Kafka';
    
    // Datagram kayıt dizini pattern'i
    const datagramSaveDir = process.env.DATAGRAM_SAVE_DIR || 'adapters/common';
    
    // Tüm adapters/common/{MW_NAME}/ dizinlerini bul
    const datagramDirs = findDatagramDirectories(projectRoot, datagramSaveDir, mwName);
    
    if (datagramDirs.length === 0) {
        vscode.window.showWarningMessage(
            `No datagram directories found in ${projectName}.\n` +
            `Expected pattern: */${datagramSaveDir}/${mwName}/\n\n` +
            `Would you like to create them?`,
            'Yes', 'No'
        ).then(async (selection) => {
            if (selection === 'Yes') {
                await createDatagramDirectories(projectRoot, datagramSaveDir, mwName);
                // Yeniden çalıştır
                addRemoveDatagrams(uri);
            }
        });
        return;
    }

    // DATAGRAM_DIR_PATH'den mevcut datagram'ları listele
    const datagramDirPath = process.env.DATAGRAM_DIR_PATH;
    if (!datagramDirPath || !fs.existsSync(datagramDirPath)) {
        vscode.window.showErrorMessage(
            'DATAGRAM_DIR_PATH environment variable is not set or directory does not exist.'
        );
        return;
    }

    const availableDatagrams = fs.readdirSync(datagramDirPath)
        .filter(file => file.endsWith('.xml'))
        .map(file => file.replace('.xml', ''));

    // Webview panel oluştur
    const panel = vscode.window.createWebviewPanel(
        'datagramManager',
        `Manage Datagrams - ${projectName}`,
        vscode.ViewColumn.One,
        {
            enableScripts: true
        }
    );

    // Webview içeriği
    panel.webview.html = getWebviewContent(availableDatagrams, [], datagramDirs.length);

    // Mesaj dinleyici
    panel.webview.onDidReceiveMessage(async message => {
        switch (message.command) {
            case 'saveAll':
                // Her dizine kaydet
                for (const dir of datagramDirs) {
                    const xmlPath = path.join(dir, `${projectName}.xml`);
                    await saveDatagramsToXML(xmlPath, message.datagrams);
                }
                
                vscode.window.showInformationMessage(
                    `Datagrams saved to ${datagramDirs.length} location(s):\n` +
                    datagramDirs.map(d => `  • ${path.relative(projectRoot, d)}`).join('\n')
                );
                panel.dispose();
                break;
        }
    });
}

function findDatagramDirectories(
    projectRoot: string, 
    saveDir: string, 
    mwName: string
): string[] {
    const dirs: string[] = [];
    
    // adapters/common/{MW_NAME} pattern'ini ara
    const searchPattern = path.join(saveDir, mwName);
    
    function searchRecursive(dir: string, depth: number = 0) {
        if (depth > 10) return; // Maksimum derinlik
        
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                
                const fullPath = path.join(dir, entry.name);
                
                // Pattern eşleşmesi kontrol et
                if (fullPath.includes(searchPattern)) {
                    dirs.push(fullPath);
                    console.log(`Found datagram directory: ${fullPath}`);
                } else {
                    // Alt dizinlerde ara
                    searchRecursive(fullPath, depth + 1);
                }
            }
        } catch (error) {
            // Erişilemeyen dizinleri atla
        }
    }
    
    searchRecursive(projectRoot);
    return dirs;
}

async function createDatagramDirectories(
    projectRoot: string,
    saveDir: string,
    mwName: string
): Promise<void> {
    // Tipik HexArch yapısında olası yerler
    const components = ['src/app', 'src/dark_src', 'src/white_src'];
    const projectName = path.basename(projectRoot);
    
    for (const component of components) {
        const componentPath = path.join(projectRoot, component, 'src', projectName);
        
        if (fs.existsSync(componentPath)) {
            const datagramPath = path.join(componentPath, saveDir, mwName);
            
            if (!fs.existsSync(datagramPath)) {
                fs.mkdirSync(datagramPath, { recursive: true });
                console.log(`Created: ${datagramPath}`);
                vscode.window.showInformationMessage(
                    `Created directory: ${path.relative(projectRoot, datagramPath)}`
                );
            }
        }
    }
}

async function saveDatagramsToXML(
    xmlPath: string, 
    datagrams: Array<{ name: string, pub: boolean, sub: boolean }>
): Promise<void> {
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<datagrams>\n';
    
    for (const dg of datagrams) {
        let type = '';
        if (dg.pub && dg.sub) {
            type = 'pubsub';
        } else if (dg.pub) {
            type = 'pub';
        } else if (dg.sub) {
            type = 'sub';
        }
        
        if (type) {
            xmlContent += `  <datagram name="${dg.name}" type="${type}"/>\n`;
        }
    }
    
    xmlContent += '</datagrams>\n';
    
    // Dizin yoksa oluştur
    const dir = path.dirname(xmlPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(xmlPath, xmlContent, 'utf-8');
    console.log(`Saved datagrams to: ${xmlPath}`);
}

function getWebviewContent(
    available: string[], 
    selected: Array<{ name: string, pub: boolean, sub: boolean }>,
    targetCount: number
): string {
    return `<!DOCTYPE html>
    <html>
    <head>
        <style>
            body { 
                font-family: var(--vscode-font-family); 
                padding: 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            .info-banner {
                background-color: var(--vscode-editorInfo-background);
                color: var(--vscode-editorInfo-foreground);
                padding: 10px;
                margin-bottom: 20px;
                border-radius: 4px;
                border-left: 4px solid var(--vscode-editorInfo-border);
            }
            .container { 
                display: flex; 
                gap: 20px; 
                margin-top: 20px;
            }
            .list-container { 
                flex: 1; 
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                padding: 10px;
            }
            .list-container h3 { 
                margin-top: 0; 
                color: var(--vscode-foreground);
            }
            .datagram-item { 
                padding: 8px; 
                margin: 5px 0; 
                background-color: var(--vscode-list-hoverBackground);
                border-radius: 3px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .datagram-item:hover { 
                background-color: var(--vscode-list-activeSelectionBackground);
            }
            .checkboxes { 
                display: flex; 
                gap: 10px; 
            }
            .checkboxes label {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .search-box { 
                width: 100%; 
                padding: 8px;
                margin-bottom: 10px;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 3px;
            }
            .button-container { 
                margin-top: 20px; 
                text-align: center; 
            }
            button { 
                padding: 10px 30px; 
                font-size: 14px;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 3px;
                cursor: pointer;
            }
            button:hover { 
                background-color: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <h2>Add/Remove Datagrams</h2>
        <div class="info-banner">
            ℹ️ Datagrams will be saved to <strong>${targetCount}</strong> location(s) in your project
        </div>
        
        <div class="container">
            <div class="list-container">
                <h3>Available Datagrams</h3>
                <input type="text" class="search-box" id="searchBox" placeholder="Search datagrams...">
                <div id="availableList"></div>
            </div>
            <div class="list-container">
                <h3>Selected Datagrams</h3>
                <div id="selectedList"></div>
            </div>
        </div>
        
        <div class="button-container">
            <button onclick="saveAll()">Save All</button>
        </div>
        
        <script>
            const vscode = acquireVsCodeApi();
            let available = ${JSON.stringify(available)};
            let selected = ${JSON.stringify(selected)};
            
            function render() {
                const searchTerm = document.getElementById('searchBox').value.toLowerCase();
                const filtered = available.filter(name => 
                    name.toLowerCase().includes(searchTerm) &&
                    !selected.find(s => s.name === name)
                );
                
                document.getElementById('availableList').innerHTML = filtered.map(name => 
                    '<div class="datagram-item" onclick="addToSelected(\'' + name + '\')">' + name + '</div>'
                ).join('');
                
                document.getElementById('selectedList').innerHTML = selected.map(item => 
                    '<div class="datagram-item">' +
                    '<span>' + item.name + '</span>' +
                    '<div class="checkboxes">' +
                    '<label><input type="checkbox" ' + (item.pub ? 'checked' : '') + 
                    ' onchange="togglePub(\'' + item.name + '\')"> Pub</label>' +
                    '<label><input type="checkbox" ' + (item.sub ? 'checked' : '') + 
                    ' onchange="toggleSub(\'' + item.name + '\')"> Sub</label>' +
                    '<button onclick="removeFromSelected(\'' + item.name + '\')" style="padding: 2px 8px;">✕</button>' +
                    '</div></div>'
                ).join('');
            }
            
            function addToSelected(name) {
                selected.push({ name, pub: true, sub: false });
                render();
            }
            
            function removeFromSelected(name) {
                selected = selected.filter(s => s.name !== name);
                render();
            }
            
            function togglePub(name) {
                const item = selected.find(s => s.name === name);
                if (item) item.pub = !item.pub;
            }
            
            function toggleSub(name) {
                const item = selected.find(s => s.name === name);
                if (item) item.sub = !item.sub;
            }
            
            function saveAll() {
                vscode.postMessage({ command: 'saveAll', datagrams: selected });
            }
            
            document.getElementById('searchBox').addEventListener('input', render);
            render();
        </script>
    </body>
    </html>`;
}

/**
 * Yeni datagram oluştur
 */
export async function createNewDatagram(uri: vscode.Uri) {
    const folderPath = uri.fsPath;
    
    try {
        console.log('🔍 Starting Create New Datagram...');
        console.log('  Clicked folder:', folderPath);

        // 1. Kullanıcıdan datagram adını al
        const datagramName = await vscode.window.showInputBox({
            prompt: 'Enter datagram name',
            placeHolder: 'e.g., UserCreated, OrderPlaced',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Datagram name cannot be empty';
                }
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                    return 'Invalid datagram name. Use letters, numbers, and underscores only';
                }
                return null;
            }
        });

        if (!datagramName) {
            vscode.window.showWarningMessage('Datagram creation cancelled');
            return;
        }

        // 2. Çevresel değişkenleri al
        const datagramTemplatePath = process.env.DATAGRAM || '/workspaces/hexdef/schemas/datagram.xml';
        const mwName = process.env.MW_NAME || 'Kafka';
        const datagramDescription = process.env.DATAGRAM_DESCRIPTION || 'datagram';
        const newDatagramTargetName = process.env.NEW_DATAGRAM_TARGET_NAME || 'new_datagram';

        console.log('📋 Environment Variables:');
        console.log('  DATAGRAM:', datagramTemplatePath);
        console.log('  MW_NAME:', mwName);
        console.log('  NEW_DATAGRAM_TARGET_NAME:', newDatagramTargetName);

        // 3. Template dosyasını kontrol et
        if (!fs.existsSync(datagramTemplatePath)) {
            vscode.window.showErrorMessage(`Template file not found: ${datagramTemplatePath}`);
            return;
        }

        // 4. Template dosyasını oku ve değişkenleri değiştir
        let templateContent = fs.readFileSync(datagramTemplatePath, 'utf-8');
        let finalContent = templateContent
            .replace(/\$\{DATAGRAM_NAME\}/g, datagramName)
            .replace(/\$\{MW_NAME\}/g, mwName)
            .replace(/\$\{DATAGRAM_DESCRIPTION\}/g, datagramDescription);

        // 5. Marker klasörlerini ara
        const projectRootDir = findMarkerDirectory(folderPath, '.project_root');
        const darkMarkerDir = findMarkerDirectory(folderPath, '.project_dark');
        const grayMarkerDir = findMarkerDirectory(folderPath, '.project_gray');

        console.log('🔍 Marker search results:');
        console.log('  .project_root found at:', projectRootDir);
        console.log('  .project_dark found at:', darkMarkerDir);
        console.log('  .project_gray found at:', grayMarkerDir);

        // 6. Eğer hiçbir marker bulunamadıysa hata ver
        if (!projectRootDir && !darkMarkerDir && !grayMarkerDir) {
            vscode.window.showErrorMessage(
                'Could not find any project markers (.project_root, .project_dark, or .project_gray).\n\n' +
                'Please create marker directories:\n' +
                '  mkdir -p <project>/.project_root\n' +
                '  mkdir -p <project>/src/dark_src/.project_dark\n' +
                '  mkdir -p <project>/src/<project_name>/.project_gray'
            );
            return;
        }

        const targetDirs: string[] = [];

        // 7. Hedef dizinleri belirle
        if (projectRootDir) {
            // .project_root bulundu - hem dark hem gray'e oluştur
            console.log('✅ .project_root found, will create in both dark and gray');
            
            // Dark dizinini bul veya oluştur
            const darkDir = darkMarkerDir || path.join(projectRootDir, 'src', 'dark_src');
            if (fs.existsSync(darkDir)) {
                const darkTargetDir = path.join(darkDir, 'adapters', 'common', mwName, newDatagramTargetName);
                targetDirs.push(darkTargetDir);
                console.log('  Dark target:', darkTargetDir);
            }
            
            // Gray dizinini bul
            if (grayMarkerDir) {
                const grayTargetDir = path.join(grayMarkerDir, 'adapters', 'common', mwName, newDatagramTargetName);
                targetDirs.push(grayTargetDir);
                console.log('  Gray target:', grayTargetDir);
            } else {
                // Gray marker yoksa proje adından tahmin et
                const projectName = path.basename(projectRootDir);
                const possibleGray = path.join(projectRootDir, 'src', projectName);
                if (fs.existsSync(possibleGray)) {
                    const grayTargetDir = path.join(possibleGray, 'adapters', 'common', mwName, newDatagramTargetName);
                    targetDirs.push(grayTargetDir);
                    console.log('  Gray target (inferred):', grayTargetDir);
                }
            }
        } else {
            // .project_root yok - sadece dark veya gray'e oluştur
            if (darkMarkerDir) {
                console.log('✅ .project_dark found, creating in dark only');
                const darkTargetDir = path.join(darkMarkerDir, 'adapters', 'common', mwName, newDatagramTargetName);
                targetDirs.push(darkTargetDir);
            } else if (grayMarkerDir) {
                console.log('✅ .project_gray found, creating in gray only');
                const grayTargetDir = path.join(grayMarkerDir, 'adapters', 'common', mwName, newDatagramTargetName);
                targetDirs.push(grayTargetDir);
            }
        }

        console.log('🎯 Final target directories:');
        targetDirs.forEach((dir, idx) => console.log(`  [${idx + 1}] ${dir}`));

        if (targetDirs.length === 0) {
            vscode.window.showErrorMessage('Could not determine target directories for datagram creation.');
            return;
        }

        // 8. Dosyaları oluştur
        let savedCount = 0;
        const createdFiles: string[] = [];

        for (const targetDir of targetDirs) {
            try {
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                    console.log(`✅ Created directory: ${targetDir}`);
                }

                const targetFile = path.join(targetDir, `${datagramName}.xml`);
                fs.writeFileSync(targetFile, finalContent, 'utf-8');
                savedCount++;
                createdFiles.push(targetFile);

                console.log(`✅ Created file: ${targetFile}`);
            } catch (err) {
                console.error(`❌ Failed to create in ${targetDir}:`, err);
            }
        }

        if (savedCount === 0) {
            vscode.window.showErrorMessage('Failed to create datagram files!');
            return;
        }

        const message = `✅ Datagram "${datagramName}.xml" created in ${savedCount} location(s)`;
        vscode.window.showInformationMessage(message);
        console.log(message);
        createdFiles.forEach(f => console.log(`  • ${f}`));

        if (createdFiles.length > 0 && fs.existsSync(createdFiles[0])) {
            const doc = await vscode.workspace.openTextDocument(createdFiles[0]);
            await vscode.window.showTextDocument(doc);
        }

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create datagram: ${error}`);
        console.error('❌ Create datagram error:', error);
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
