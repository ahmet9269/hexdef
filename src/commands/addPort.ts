import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function addIncomingPort(uri: vscode.Uri) {
    await addPort(uri, 'incoming');
}

export async function addOutgoingPort(uri: vscode.Uri) {
    await addPort(uri, 'outgoing');
}

async function addPort(uri: vscode.Uri, type: 'incoming' | 'outgoing') {
    if (!uri) {
        vscode.window.showErrorMessage('Please select a project folder (dark_src or white_src).');
        return;
    }

    const projectPath = uri.fsPath;
    const isWhite = projectPath.includes('white_src');
    const headerExt = isWhite ? '.hpp' : '.h';
    
    // Find domain/model directory
    const modelDir = findModelDirectory(projectPath);
    if (!modelDir) {
        vscode.window.showErrorMessage('Could not find domain/model directory. Make sure you selected a valid project folder (dark_src or white_src).');
        return;
    }

    // List models
    const files = fs.readdirSync(modelDir);
    const models = files
        .filter(f => f.endsWith('.h') || f.endsWith('.hpp'))
        .map(f => f.replace(/\.(h|hpp)$/, ''));

    if (models.length === 0) {
        vscode.window.showWarningMessage('No models found in domain/model.');
        return;
    }

    // Select model
    const selectedModel = await vscode.window.showQuickPick(models, {
        placeHolder: `Select a model to create an ${type} port for`
    });

    if (!selectedModel) {
        return;
    }

    // Find the actual file name for the selected model
    const selectedModelFile = files.find(f => f.startsWith(selectedModel) && (f.endsWith('.h') || f.endsWith('.hpp')));

    // Generate Port Interface
    // modelDir is .../domain/model
    // portsDir should be .../domain/ports/${type}
    const portsDir = path.join(modelDir, '..', 'ports', type);
    
    if (!fs.existsSync(portsDir)) {
        fs.mkdirSync(portsDir, { recursive: true });
    }

    const suffix = type === 'incoming' ? 'IncomingPort' : 'OutgoingPort';
    const portName = `I${selectedModel}${suffix}`;
    const portFile = path.join(portsDir, `${portName}${headerExt}`);

    if (fs.existsSync(portFile)) {
        vscode.window.showErrorMessage(`Port ${portName} already exists.`);
        return;
    }

    // Determine namespace
    const namespace = getNamespaceFromPath(modelDir);

    const content = generatePortContent(selectedModel, namespace, selectedModelFile || `${selectedModel}${headerExt}`, type);
    
    fs.writeFileSync(portFile, content);
    
    // Open the file
    const doc = await vscode.workspace.openTextDocument(portFile);
    await vscode.window.showTextDocument(doc);
    
    vscode.window.showInformationMessage(`Created ${type} port: ${portName}${headerExt}`);
}

function findModelDirectory(startPath: string): string | null {
    // Check if startPath itself contains src/*/domain/model (e.g. if user clicked dark_src)
    const srcPath = path.join(startPath, 'src');
    if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
        const subdirs = fs.readdirSync(srcPath).filter(f => fs.statSync(path.join(srcPath, f)).isDirectory());
        for (const subdir of subdirs) {
            const modelPath = path.join(srcPath, subdir, 'domain', 'model');
            if (fs.existsSync(modelPath)) {
                return modelPath;
            }
        }
    }
    
    return null;
}

function getNamespaceFromPath(modelDir: string): string {
    // modelDir is .../src/${APP_NAME}/domain/model
    const parts = modelDir.split(path.sep);
    // parts[parts.length - 1] = model
    // parts[parts.length - 2] = domain
    // parts[parts.length - 3] = APP_NAME
    return parts[parts.length - 3];
}

function generatePortContent(modelName: string, namespace: string, modelFileName: string, type: 'incoming' | 'outgoing'): string {
    const suffix = type === 'incoming' ? 'IncomingPort' : 'OutgoingPort';
    const className = `I${modelName}${suffix}`;
    const methodName = type === 'incoming' ? 'onDataReceived' : 'send';

    return `#pragma once

#include "domain/model/${modelFileName}"

namespace ${namespace} {
namespace domain {
namespace ports {
namespace ${type} {

    class ${className} {
    public:
        virtual ~${className}() = default;
        
        virtual void ${methodName}(const model::${modelName}& data) = 0;
    };

} // namespace ${type}
} // namespace ports
} // namespace domain
} // namespace ${namespace}
`;
}
