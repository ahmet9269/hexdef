import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export async function addRemoveDatagrams(uri: vscode.Uri) {
    try {
        console.log('addRemoveDatagrams called with uri:', uri?.fsPath);
        
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage('No folder selected');
            return;
        }
        
        const folderPath = uri.fsPath;
        const projectName = path.basename(folderPath);
        const projectXmlPath = path.join(folderPath, `${projectName}.xml`);
        
        console.log('Project path:', projectXmlPath);
        
        // Get available datagrams (this is mock data - you can replace with actual logic)
        const selectedDatagrams = getSelectedDatagrams(projectXmlPath);
        const availableDatagrams = getAvailableDatagrams(folderPath, projectXmlPath);
        
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

        panel.webview.html = getWebviewContent(availableDatagrams, selectedDatagrams);
        console.log('Webview HTML set');

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'moveToSelected':
                        // Don't save yet, just notify
                        break;
                    case 'moveToAvailable':
                        // Don't save yet, just notify
                        break;
                    case 'updateCheckbox':
                        // Don't save yet, just track changes
                        break;
                    case 'saveAll':
                        // Save all selected datagrams with their checkbox states
                        await saveAllDatagrams(projectXmlPath, message.datagrams);
                        vscode.window.showInformationMessage(`Saved datagrams to ${projectName}.xml`);
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

async function addDatagramToProject(projectXmlPath: string, datagramName: string, pub: boolean = false, sub: boolean = false) {
    try {
        let content = '';
        
        // Create or read existing file
        if (fs.existsSync(projectXmlPath)) {
            content = fs.readFileSync(projectXmlPath, 'utf-8');
        } else {
            content = '<?xml version="1.0" encoding="UTF-8"?>\n<datagrams>\n</datagrams>';
        }
        
        // Check if datagram already exists
        if (content.includes(`name="${datagramName}"`)) {
            return;
        }
        
        // Add new datagram before closing tag
        const datagramEntry = `  <datagram name="${datagramName}" pub="${pub}" sub="${sub}"/>`;
        content = content.replace('</datagrams>', `${datagramEntry}\n</datagrams>`);
        
        fs.writeFileSync(projectXmlPath, content, 'utf-8');
    } catch (error) {
        vscode.window.showErrorMessage(`Error adding datagram: ${error}`);
    }
}

async function removeDatagramFromProject(projectXmlPath: string, datagramName: string) {
    try {
        if (!fs.existsSync(projectXmlPath)) {
            return;
        }
        
        let content = fs.readFileSync(projectXmlPath, 'utf-8');
        
        // Remove the datagram line
        const regex = new RegExp(`\\s*<datagram name="${datagramName}"[^/]*/>\\n?`, 'g');
        content = content.replace(regex, '');
        
        fs.writeFileSync(projectXmlPath, content, 'utf-8');
    } catch (error) {
        vscode.window.showErrorMessage(`Error removing datagram: ${error}`);
    }
}

async function updateDatagramCheckbox(projectXmlPath: string, datagramName: string, type: string, checked: boolean) {
    try {
        if (!fs.existsSync(projectXmlPath)) {
            return;
        }
        
        let content = fs.readFileSync(projectXmlPath, 'utf-8');
        
        // Find and update the datagram's pub or sub attribute
        const regex = new RegExp(`(<datagram name="${datagramName}"[^>]*${type}=")([^"]+)(")`, 'g');
        content = content.replace(regex, `$1${checked}$3`);
        
        fs.writeFileSync(projectXmlPath, content, 'utf-8');
    } catch (error) {
        vscode.window.showErrorMessage(`Error updating datagram: ${error}`);
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

function getWebviewContent(available: string[], selected: Array<{name: string, pub: boolean, sub: boolean}>): string {
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

        // Checkbox change handler
        function handleCheckboxChange(checkbox) {
            // Just update the checkbox state, will be saved on OK
        }

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

export async function createNewDatagram(uri: vscode.Uri) {
    const folderPath = uri.fsPath;
    
    // Prompt for datagram name
    const datagramName = await vscode.window.showInputBox({
        prompt: 'Enter the name for the new datagram',
        placeHolder: 'e.g., UserEvent, OrderMessage',
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
        return; // User cancelled
    }

    vscode.window.showInformationMessage(`Creating datagram "${datagramName}" in: ${path.basename(folderPath)}`);
    
    // TODO: Implement datagram creation logic
    // This could:
    // 1. Create necessary files for the datagram
    // 2. Generate boilerplate code
    // 3. Update configuration files if needed
}
