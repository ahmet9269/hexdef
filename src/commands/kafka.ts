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
        
        // Çevresel değişkenler
        const mwName = process.env.MW_NAME || 'Kafka';
        const newDatagramTarget = process.env.NEW_DATAGRAM_TARGET_NAME || 'new_datagram';
        
        // adapters/common/${MW_NAME}/${NEW_DATAGRAM_TARGET_NAME} dizinlerini bul
        console.log(`🔍 Searching for pattern: **/adapters/common/${mwName}/${newDatagramTarget}`);
        console.log(`📁 Starting from: ${projectRoot}`);
        
        // Glob pattern ile dizinleri bul
        const { execSync } = require('child_process');
        const findCommand = `find "${projectRoot}" -type d -path "*/adapters/common/${mwName}/${newDatagramTarget}"`;
        
        let targetDirs: string[] = [];
        try {
            const output = execSync(findCommand, { encoding: 'utf-8' });
            targetDirs = output.trim().split('\n').filter((dir: string) => dir.length > 0);
        } catch (error) {
            console.log('No existing target directories found, will create them');
        }
        
        // Eğer dizin bulunamazsa, standart konumlarda oluştur
        if (targetDirs.length === 0) {
            const projectName = path.basename(projectRoot);
            
            targetDirs = [
                path.join(projectRoot, 'src', projectName, 'src', projectName, 'adapters', 'common', mwName, newDatagramTarget),
                path.join(projectRoot, 'src', 'dark_src', 'src', projectName, 'adapters', 'common', mwName, newDatagramTarget)
            ];
            
            console.log('⚠️  No existing directories found, using default paths');
        }
        
        console.log(`📂 Found ${targetDirs.length} target directories:`);
        targetDirs.forEach((dir: string) => console.log(`   - ${dir}`));
        
        // Her dizine dosyayı oluştur
        const createdFiles: string[] = [];
        
        for (const targetDir of targetDirs) {
            const datagramFilePath = path.join(targetDir, `${datagramName}.xml`);
            
            // Dizini oluştur (yoksa)
            fs.mkdirSync(targetDir, { recursive: true });
            
            // Dosyayı yaz
            fs.writeFileSync(datagramFilePath, datagramContent, 'utf-8');
            createdFiles.push(datagramFilePath);
            
            console.log(`✅ Created: ${datagramFilePath}`);
        }
        
        // İlk dosyayı aç
        if (createdFiles.length > 0) {
            const document = await vscode.workspace.openTextDocument(createdFiles[0]);
            await vscode.window.showTextDocument(document);
        }
        
        // Başarı mesajı
        vscode.window.showInformationMessage(
            `✅ Datagram '${datagramName}' created in ${createdFiles.length} location(s):\n\n${createdFiles.map((f: string) => `• ${f}`).join('\n')}`,
            { modal: false }
        );

    } catch (error) {
        vscode.window.showErrorMessage(`Error creating datagram: ${error}`);
        console.error('Create datagram error:', error);
    }
}

/**
 * Make komutunu çalıştır
 */
export async function runMake(uri?: vscode.Uri) {
    try {
        // Uri'yi path'e çevir
        const startPath = uri?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        if (!startPath) {
            vscode.window.showErrorMessage('No folder selected or workspace opened!');
            return;
        }

        // Proje root'unu bul (.project_root marker)
        const projectRoot = await findProjectRoot(startPath);
        if (!projectRoot) {
            vscode.window.showErrorMessage('Project root (.project_root marker) not found!');
            return;
        }

        // Makefile var mı kontrol et
        const makefilePath = path.join(projectRoot, 'Makefile');
        if (!fs.existsSync(makefilePath)) {
            vscode.window.showErrorMessage(`Makefile not found in ${projectRoot}`);
            return;
        }

        console.log(`🔨 Running make in: ${projectRoot}`);

        // Terminal oluştur ve make komutunu çalıştır
        const terminal = vscode.window.createTerminal({
            name: `Make: ${path.basename(projectRoot)}`,
            cwd: projectRoot
        });

        terminal.show();
        terminal.sendText('make');

        vscode.window.showInformationMessage(
            `Running make in ${path.basename(projectRoot)}...`
        );

    } catch (error) {
        vscode.window.showErrorMessage(`Error running make: ${error}`);
        console.error('Run make error:', error);
    }
}

/**
 * Kodu yeniden oluştur
 */
export async function regenerateCode(uri?: vscode.Uri) {
    try {
        // Uri'yi path'e çevir
        const startPath = uri?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        if (!startPath) {
            vscode.window.showErrorMessage('No folder selected or workspace opened!');
            return;
        }

        // Proje root'unu bul
        const projectRoot = findProjectRoot(startPath);
        if (!projectRoot) {
            vscode.window.showErrorMessage('Project root (.project_root marker) not found!');
            return;
        }

        // dark_src dizinini bul
        const darkSrcPath = path.join(projectRoot, 'src', 'dark_src');
        
        if (!fs.existsSync(darkSrcPath)) {
            vscode.window.showErrorMessage(`dark_src directory not found in ${projectRoot}`);
            return;
        }

        // dark_src altındaki Makefile'ı kontrol et
        const makefilePath = path.join(darkSrcPath, 'Makefile');
        if (!fs.existsSync(makefilePath)) {
            vscode.window.showErrorMessage(`Makefile not found in ${darkSrcPath}`);
            return;
        }

        console.log(`🔄 Regenerating code in: ${darkSrcPath}`);

        // Terminal oluştur
        const terminal = vscode.window.createTerminal({
            name: `Regenerate Code: ${path.basename(projectRoot)}`,
            cwd: darkSrcPath
        });

        terminal.show();
        
        // make regenerate_code çalıştır
        terminal.sendText('make regenerate_code');

        vscode.window.showInformationMessage(
            `Regenerating code in ${path.basename(projectRoot)}/src/dark_src...`
        );

    } catch (error) {
        vscode.window.showErrorMessage(`Error regenerating code: ${error}`);
        console.error('Regenerate code error:', error);
    }
}

/**
 * Proje XML dosyasını dinamik olarak bul
 * Hem gray hem dark dizinlerinde ara
 */
function findProjectXmlPaths(projectRoot: string, projectName: string, mwName: string): {
    gray: string | null;
    dark: string | null;
} {
    const result = { gray: null as string | null, dark: null as string | null };
    
    // Gray dizininde ara (src/${PROJECT_NAME}/ altında)
    const graySearchRoot = path.join(projectRoot, 'src', projectName);
    if (fs.existsSync(graySearchRoot)) {
        const grayXmlPath = findXmlInAdapters(graySearchRoot, projectName, mwName);
        if (grayXmlPath) {
            result.gray = grayXmlPath;
            console.log(`✅ Found gray XML: ${grayXmlPath}`);
        }
    }
    
    // Dark dizininde ara (src/dark_src/ altında)
    const darkSearchRoot = path.join(projectRoot, 'src', 'dark_src');
    if (fs.existsSync(darkSearchRoot)) {
        const darkXmlPath = findXmlInAdapters(darkSearchRoot, projectName, mwName);
        if (darkXmlPath) {
            result.dark = darkXmlPath;
            console.log(`✅ Found dark XML: ${darkXmlPath}`);
        }
    }
    
    return result;
}

/**
 * adapters/common/${MW_NAME}/${PROJECT_NAME}.xml dosyasını ara
 * Belirsiz sayıda ara dizin olabilir
 */
function findXmlInAdapters(startPath: string, projectName: string, mwName: string): string | null {
    const targetPattern = path.join('adapters', 'common', mwName, `${projectName}.xml`);
    
    // Recursive olarak ara
    function searchRecursive(currentPath: string, depth: number = 0): string | null {
        // Max depth kontrolü (sonsuz döngüden kaçın)
        if (depth > 10) return null;
        
        try {
            const entries = fs.readdirSync(currentPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                
                if (entry.isDirectory()) {
                    // Eğer bu dizin 'adapters' ise, altında common/${MW_NAME} ara
                    if (entry.name === 'adapters') {
                        const possibleXml = path.join(fullPath, 'common', mwName, `${projectName}.xml`);
                        if (fs.existsSync(possibleXml)) {
                            return possibleXml;
                        }
                    }
                    
                    // Recursive olarak alt dizinlere de bak
                    const result = searchRecursive(fullPath, depth + 1);
                    if (result) return result;
                }
            }
        } catch (error) {
            // Permission denied vs. hatalarını göz ardı et
        }
        
        return null;
    }
    
    return searchRecursive(startPath);
}

/**
 * Add/Remove Datagrams - GELİŞTİRİLMİŞ VERSİYON
 */
export async function addRemoveDatagrams(uri?: vscode.Uri) {
    try {
        console.log('addRemoveDatagrams called with uri:', uri?.fsPath);
        
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage('No folder selected');
            return;
        }
        
        const folderPath = uri.fsPath;
        
        // Proje root'unu bul
        const projectRoot = findProjectRoot(folderPath);
        if (!projectRoot) {
            vscode.window.showErrorMessage('Could not find project root (.project_root marker not found)');
            return;
        }
        
        const projectName = path.basename(projectRoot);
        const mwName = process.env.MW_NAME || 'Kafka';
        
        console.log('Project root:', projectRoot);
        console.log('Project name:', projectName);
        console.log('MW name:', mwName);
        
        // XML dosyalarını dinamik olarak bul
        const xmlPaths = findProjectXmlPaths(projectRoot, projectName, mwName);
        
        if (!xmlPaths.gray && !xmlPaths.dark) {
            vscode.window.showErrorMessage(
                `Could not find ${projectName}.xml in adapters/common/${mwName}/\n\n` +
                'Expected locations:\n' +
                `  • src/${projectName}/.../adapters/common/${mwName}/${projectName}.xml\n` +
                `  • src/dark_src/.../adapters/common/${mwName}/${projectName}.xml`
            );
            return;
        }
        
        // Primary XML path (gray varsa onu kullan, yoksa dark)
        const primaryXmlPath = xmlPaths.gray || xmlPaths.dark!;
        
        console.log('Primary XML path:', primaryXmlPath);
        
        // Get available datagrams
        const selectedDatagrams = getSelectedDatagrams(primaryXmlPath);
        const availableDatagrams = getAvailableDatagrams(folderPath, primaryXmlPath);
        
        console.log('Selected datagrams:', selectedDatagrams.length);
        console.log('Available datagrams:', availableDatagrams.length);
        
        // Create and show webview panel
        const panel = vscode.window.createWebviewPanel(
            'kafkaDatagrams',
            `Kafka Datagrams - ${projectName}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        console.log('Webview panel created');

        panel.webview.html = getDatagramWebviewContent(availableDatagrams, selectedDatagrams);
        console.log('Webview HTML set');

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'moveToSelected':
                    case 'moveToAvailable':
                    case 'updateCheckbox':
                        // Don't save yet, just track changes
                        break;
                    case 'saveAll':
                        // Save to both gray and dark if both exist
                        const savedPaths: string[] = [];
                        
                        if (xmlPaths.gray) {
                            await saveAllDatagrams(xmlPaths.gray, message.datagrams);
                            savedPaths.push(xmlPaths.gray);
                        }
                        
                        if (xmlPaths.dark) {
                            await saveAllDatagrams(xmlPaths.dark, message.datagrams);
                            savedPaths.push(xmlPaths.dark);
                        }
                        
                        const locations = savedPaths.map(p => `  • ${p}`).join('\n');
                        vscode.window.showInformationMessage(
                            `Saved datagrams to ${savedPaths.length} location(s):\n${locations}`
                        );
                        
                        // ✅ File Explorer'ı yenile
                        await vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
                        
                        panel.dispose();
                        break;
                }
            },
            undefined,
            []
        );
    } catch (error) {
        console.error('Error in addRemoveDatagrams:', error);
        vscode.window.showErrorMessage(`Failed to open datagram panel: ${error}`);
    }
}

function getAvailableDatagrams(folderPath: string, projectXmlPath: string): string[] {
    // Check environment variable (mandatory)
    const datagramDir = process.env.DATAGRAM_DIR_PATH;
    
    if (!datagramDir) {
        vscode.window.showErrorMessage('DATAGRAM_DIR_PATH environment variable is not defined. Please set it to the path of your datagram directory.');
        return [];
    }
    
    try {
        if (!fs.existsSync(datagramDir)) {
            vscode.window.showErrorMessage(`DATAGRAM_DIR_PATH is set to "${datagramDir}" but the directory does not exist.`);
            return [];
        }
        
        console.log('Using datagram directory:', datagramDir);
        
        // Read all files in datagram_dir
        const files = fs.readdirSync(datagramDir);
        
        // Filter XML files and remove extension
        const xmlFiles = files
            .filter(file => file.toLowerCase().endsWith('.xml'))
            .map(file => path.basename(file, '.xml'));
        
        // Get already selected datagrams to filter them out
        const selectedDatagrams = getSelectedDatagrams(projectXmlPath);
        const selectedNames = selectedDatagrams.map(d => d.name);
        
        // Return only datagrams not already in the project
        return xmlFiles.filter(name => !selectedNames.includes(name));
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading datagram directory: ${error}`);
        return [];
    }
}

function getSelectedDatagrams(projectXmlPath: string): Array<{name: string, pub: boolean, sub: boolean}> {
    try {
        if (!fs.existsSync(projectXmlPath)) {
            return [];
        }
        
        const content = fs.readFileSync(projectXmlPath, 'utf-8');
        const datagrams: Array<{name: string, pub: boolean, sub: boolean}> = [];
        
        // Parse XML to extract datagrams with type info
        const datagramRegex = /<datagram name="([^"]+)" type="([^"]+)"\/>/g;
        let match;
        
        while ((match = datagramRegex.exec(content)) !== null) {
            const name = match[1];
            const type = match[2];
            
            datagrams.push({
                name: name,
                pub: type === 'pub' || type === 'pubsub',
                sub: type === 'sub' || type === 'pubsub'
            });
        }
        
        return datagrams;
    } catch (error) {
        return [];
    }
}

async function saveAllDatagrams(projectXmlPath: string, datagrams: Array<{name: string, pub: boolean, sub: boolean}>) {
    try {
        // Create XML content
        let content = '<?xml version="1.0" encoding="UTF-8"?>\n<datagrams>\n';
        
        for (const datagram of datagrams) {
            const type = datagram.pub && datagram.sub ? 'pubsub' : 
                        datagram.pub ? 'pub' : 
                        datagram.sub ? 'sub' : '';
            
            if (type) {
                content += `  <datagram name="${datagram.name}" type="${type}"/>\n`;
            }
        }
        
        content += '</datagrams>';
        
        // Ensure directory exists
        const dir = path.dirname(projectXmlPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(projectXmlPath, content, 'utf-8');
    } catch (error) {
        vscode.window.showErrorMessage(`Error saving datagrams: ${error}`);
    }
}

function getDatagramWebviewContent(available: string[], selected: Array<{name: string, pub: boolean, sub: boolean}>): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kafka Datagrams</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .container {
            display: flex;
            gap: 20px;
            height: calc(100vh - 40px);
        }
        .panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: var(--vscode-editor-background);
        }
        .panel-header {
            padding: 10px;
            padding-left: 15px;
            padding-right: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: bold;
            background-color: var(--vscode-editor-background);
        }
        .header-row {
            display: grid;
            grid-template-columns: 1fr 40px 40px;
            align-items: center;
            gap: 8px;
            padding-right: 13px;
        }
        .header-label {
            text-align: left;
            padding-left: 0;
            margin-left: 0px;
        }
        .header-checkbox {
            text-align: center;
            font-size: 11px;
        }
        .search-box {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .search-box input {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-size: 13px;
        }
        .search-box input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        .list-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        .list-item {
            padding: 8px 12px;
            margin-bottom: 4px;
            background-color: var(--vscode-list-inactiveSelectionBackground);
            border-radius: 2px;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.1s;
        }
        .list-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .list-item.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
        }
        .list-item-row {
            display: grid;
            grid-template-columns: 1fr 40px 40px;
            align-items: center;
            gap: 8px;
            padding-left: 4px;
            padding-right: 4px;
        }
        .item-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .checkbox-col {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .checkbox-col input[type="checkbox"] {
            cursor: pointer;
            width: 16px;
            height: 16px;
        }
        .controls {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 10px;
            min-width: 60px;
        }
        .arrow-btn {
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 20px;
            transition: background-color 0.1s;
        }
        .arrow-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .arrow-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .ok-btn {
            padding: 8px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.1s;
            margin-top: 10px;
        }
        .ok-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="panel">
            <div class="search-box">
                <input type="text" id="searchAvailable" placeholder="Search" />
            </div>
            <div class="panel-header">
                <div class="header-label">Datagram Name:</div>
            </div>
            <div class="list-container" id="availableList">
                ${available.map(item => `<div class="list-item" data-name="${item}">${item}</div>`).join('')}
            </div>
        </div>
        
        <div class="controls">
            <button class="arrow-btn" id="moveRight" disabled>→</button>
            <button class="arrow-btn" id="moveLeft" disabled>←</button>
            <button class="ok-btn" id="okBtn">OK</button>
        </div>
        
        <div class="panel">
            <div class="search-box">
                <input type="text" id="searchSelected" placeholder="search" />
            </div>
            <div class="panel-header">
                <div class="header-row">
                    <div class="header-label">Datagram Name:</div>
                    <div class="header-checkbox">pub</div>
                    <div class="header-checkbox">sub</div>
                </div>
            </div>
            <div class="list-container" id="selectedList">
                ${selected.map(item => `
                    <div class="list-item" data-name="${item.name}">
                        <div class="list-item-row">
                            <div class="item-name">${item.name}</div>
                            <div class="checkbox-col">
                                <input type="checkbox" data-type="pub" data-name="${item.name}" ${item.pub ? 'checked' : ''} onclick="event.stopPropagation(); handleCheckboxChange(this)">
                            </div>
                            <div class="checkbox-col">
                                <input type="checkbox" data-type="sub" data-name="${item.name}" ${item.sub ? 'checked' : ''} onclick="event.stopPropagation(); handleCheckboxChange(this)">
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let selectedAvailable = null;
        let selectedItem = null;

        // Checkbox change handler
        function handleCheckboxChange(checkbox) {
            vscode.postMessage({
                command: 'updateCheckbox',
                datagram: checkbox.dataset.name,
                type: checkbox.dataset.type,
                checked: checkbox.checked
            });
        }

        // Available list handling
        document.getElementById('availableList').addEventListener('click', (e) => {
            if (e.target.classList.contains('list-item')) {
                document.querySelectorAll('#availableList .list-item').forEach(item => {
                    item.classList.remove('selected');
                });
                e.target.classList.add('selected');
                selectedAvailable = e.target.dataset.name;
                selectedItem = e.target;
                document.getElementById('moveRight').disabled = false;
                document.getElementById('moveLeft').disabled = true;
            }
        });

        // Selected list handling
        document.getElementById('selectedList').addEventListener('click', (e) => {
            if (e.target.classList.contains('list-item')) {
                document.querySelectorAll('#selectedList .list-item').forEach(item => {
                    item.classList.remove('selected');
                });
                e.target.classList.add('selected');
                selectedAvailable = e.target.dataset.name;
                selectedItem = e.target;
                document.getElementById('moveLeft').disabled = false;
                document.getElementById('moveRight').disabled = true;
            }
        });

        // Move right button
        document.getElementById('moveRight').addEventListener('click', () => {
            if (selectedAvailable && selectedItem) {
                vscode.postMessage({
                    command: 'moveToSelected',
                    datagram: selectedAvailable,
                    pub: false,
                    sub: false
                });
                // Create new item with checkboxes for selected list (both checked by default)
                const newItem = document.createElement('div');
                newItem.className = 'list-item';
                newItem.dataset.name = selectedAvailable;
                newItem.innerHTML = \`
                    <div class="list-item-row">
                        <div class="item-name">\${selectedAvailable}</div>
                        <div class="checkbox-col">
                            <input type="checkbox" data-type="pub" data-name="\${selectedAvailable}" checked onclick="event.stopPropagation(); handleCheckboxChange(this)">
                        </div>
                        <div class="checkbox-col">
                            <input type="checkbox" data-type="sub" data-name="\${selectedAvailable}" checked onclick="event.stopPropagation(); handleCheckboxChange(this)">
                        </div>
                    </div>
                \`;
                document.getElementById('selectedList').appendChild(newItem);
                selectedItem.remove();
                selectedAvailable = null;
                selectedItem = null;
                document.getElementById('moveRight').disabled = true;
            }
        });

        // Move left button
        document.getElementById('moveLeft').addEventListener('click', () => {
            if (selectedAvailable && selectedItem) {
                vscode.postMessage({
                    command: 'moveToAvailable',
                    datagram: selectedAvailable
                });
                // Create simple item for available list
                const newItem = document.createElement('div');
                newItem.className = 'list-item';
                newItem.dataset.name = selectedAvailable;
                newItem.textContent = selectedAvailable;
                document.getElementById('availableList').appendChild(newItem);
                selectedItem.remove();
                selectedAvailable = null;
                selectedItem = null;
                document.getElementById('moveLeft').disabled = true;
            }
        });

        // OK button handler
        document.getElementById('okBtn').addEventListener('click', () => {
            // Collect all datagrams in selected list with their checkbox states
            const datagrams = [];
            document.querySelectorAll('#selectedList .list-item').forEach(item => {
                const name = item.dataset.name;
                const pubCheckbox = item.querySelector('input[data-type="pub"]');
                const subCheckbox = item.querySelector('input[data-type="sub"]');
                
                datagrams.push({
                    name: name,
                    pub: pubCheckbox ? pubCheckbox.checked : false,
                    sub: subCheckbox ? subCheckbox.checked : false
                });
            });

            // Send to extension
            vscode.postMessage({
                command: 'saveAll',
                datagrams: datagrams
            });
        });

        // Search functionality
        document.getElementById('searchAvailable').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('#availableList .list-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? 'block' : 'none';
            });
        });

        document.getElementById('searchSelected').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('#selectedList .list-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? 'block' : 'none';
            });
        });
    </script>
</body>
</html>`;
}
