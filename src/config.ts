import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function loadConfig() {
    let schemasDir = process.env.SCHEMAS_DIR;
    
    if (!schemasDir) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            schemasDir = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'schemas');
            console.log(`SCHEMAS_DIR not set, defaulting to: ${schemasDir}`);
        } else {
            console.warn('SCHEMAS_DIR environment variable is not set and no workspace folder found. Skipping config loading.');
            return;
        }
    }

    const configPath = path.join(schemasDir, 'hex.cfg', 'config.json');
    if (!fs.existsSync(configPath)) {
        console.warn(`Config file not found at ${configPath}`);
        return;
    }

    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);

        console.log(`Loading configuration from ${configPath}...`);

        for (const key in config) {
            let value = config[key];
            if (typeof value === 'string') {
                // Resolve ${SCHEMAS_DIR} and $SCHEMAS_DIR
                value = value.replace(/\$\{SCHEMAS_DIR\}/g, schemasDir);
                value = value.replace(/\$SCHEMAS_DIR/g, schemasDir);
                
                // Update process.env
                // We overwrite existing env vars because the user explicitly wants to manage them via this file.
                process.env[key] = value;
                console.log(`  ${key}=${value}`);
            }
        }
        console.log('Configuration loaded successfully.');
    } catch (error) {
        console.error(`Error loading config from ${configPath}:`, error);
        vscode.window.showErrorMessage(`Error loading hexdef config: ${error}`);
    }
}
