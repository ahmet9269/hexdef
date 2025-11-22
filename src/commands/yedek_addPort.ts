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
    
    // Read model file content to analyze attributes
    const modelFilePath = path.join(modelDir, selectedModelFile!);
    const modelContent = fs.readFileSync(modelFilePath, 'utf-8');
    const attributes = parseModelAttributes(modelContent);

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

    // NEW STEP: Ask user which methods to include
    const selectedMethods = await selectMethods(attributes, type, selectedModel);
    if (!selectedMethods || selectedMethods.length === 0) {
        return; // User cancelled or selected nothing
    }

    const content = generatePortContent(selectedModel, namespace, selectedModelFile || `${selectedModel}${headerExt}`, type, attributes, selectedMethods);
    
    fs.writeFileSync(portFile, content);
    
    // Open the file
    const doc = await vscode.workspace.openTextDocument(portFile);
    await vscode.window.showTextDocument(doc);
    
    vscode.window.showInformationMessage(`Created ${type} port: ${portName}${headerExt}`);
}

async function selectMethods(attributes: ModelAttribute[], type: 'incoming' | 'outgoing', modelName: string): Promise<string[] | undefined> {
    const idAttr = findIdAttribute(attributes, modelName);
    const idName = idAttr.name;
    const capitalizedIdName = idName.charAt(0).toUpperCase() + idName.slice(1);
    
    const items: vscode.QuickPickItem[] = [];

    if (type === 'incoming') {
        items.push(
            { label: 'create', description: `void create(const ${modelName}&)` },
            { label: 'update', description: `void update(const ${modelName}&)` },
            { label: 'delete', description: `void deleteBy${capitalizedIdName}(${idAttr.type})` },
            { label: 'getById', description: `optional<${modelName}> getBy${capitalizedIdName}(${idAttr.type})` },
            { label: 'getAll', description: `vector<${modelName}> getAll()` }
        );
    } else {
        items.push(
            { label: 'save', description: `void save(const ${modelName}&)` },
            { label: 'saveAll', description: `void saveAll(vector<${modelName}>)` },
            { label: 'delete', description: `void deleteBy${capitalizedIdName}(${idAttr.type})` },
            { label: 'deleteAll', description: `void deleteAll()` },
            { label: 'findById', description: `optional<${modelName}> findBy${capitalizedIdName}(${idAttr.type})` },
            { label: 'findAll', description: `vector<${modelName}> findAll()` },
            { label: 'exists', description: `bool existsBy${capitalizedIdName}(${idAttr.type})` },
            { label: 'count', description: `long count()` }
        );
    }

    // Add attribute-based finders
    attributes
        .filter(a => a.name !== idName && isSearchableType(a.type))
        .forEach(a => {
            const capName = a.name.charAt(0).toUpperCase() + a.name.slice(1);
            const prefix = type === 'incoming' ? 'getBy' : 'findBy';
            items.push({
                label: `${prefix}${capName}`,
                description: `vector<${modelName}> ${prefix}${capName}(${a.type})`
            });
        });

    const selection = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: `Select methods to include in the ${type} port interface`
    });

    return selection?.map(s => s.label);
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
    
    // Also handle case where user might be inside the project structure already?
    // But requirement says "dark_src veya white_src'den birine basmalı"
    // So we stick to the above logic for now.
    
    return null;
}

interface ModelAttribute {
    type: string;
    name: string;
}

function parseModelAttributes(content: string): ModelAttribute[] {
    const attributes: ModelAttribute[] = [];
    const lines = content.split('\n');
    let inPrivate = false;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Basic visibility check
        if (trimmed.startsWith('private:')) { inPrivate = true; continue; }
        if (trimmed.startsWith('public:') || trimmed.startsWith('protected:')) { inPrivate = false; continue; }
        
        if (inPrivate) {
            // Remove comments
            const noComments = trimmed.replace(/\/\/.*$/, '').trim();
            if (!noComments) continue;

            // Must end with semicolon
            if (!noComments.endsWith(';')) continue;

            // Remove initialization (e.g. = 0; or {0};)
            // This regex looks for the last semicolon and removes preceding initialization block
            const declPart = noComments.replace(/(\s*(=|\{).*?);$/, ';');

            // Regex to capture Type and Name
            // Captures: (Type)(whitespace)(Name);
            // Type can be complex: std::vector<std::string>, unsigned long long, etc.
            const match = declPart.match(/^(.+?)\s+(\w+);$/);
            
            if (match) {
                let type = match[1].trim();
                const name = match[2].trim();
                
                // Clean up type qualifiers
                type = type.replace(/^(static|const|mutable)\s+/, '');
                
                attributes.push({ type, name });
            }
        }
    }
    return attributes;
}

function findIdAttribute(attributes: ModelAttribute[], modelName: string): ModelAttribute {
    const lowerModelName = modelName.toLowerCase();
    
    // Priority list for ID detection
    const priorities = [
        (name: string) => name === 'id',
        (name: string) => name === `${lowerModelName}id`, // e.g. orderId
        (name: string) => name === `${lowerModelName}_id`,
        (name: string) => name === 'uuid',
        (name: string) => name.endsWith('id'), // generic *Id
        (name: string) => name === 'code',
        (name: string) => name === 'number', // e.g. invoiceNumber
        (name: string) => name.endsWith('number')
    ];

    for (const predicate of priorities) {
        const found = attributes.find(a => predicate(a.name.toLowerCase()));
        if (found) return found;
    }

    // Fallback
    return { type: 'int', name: 'id' };
}

function isSearchableType(type: string): boolean {
    const t = type.toLowerCase();
    return t === 'int' || t === 'long' || t === 'double' || t === 'float' || 
           t === 'bool' || t === 'std::string' || t === 'string' || 
           t.includes('unsigned') || t === 'char' || t === 'short';
}

function getNamespaceFromPath(modelDir: string): string {
    // modelDir is .../src/${APP_NAME}/domain/model
    const parts = modelDir.split(path.sep);
    // parts[parts.length - 1] = model
    // parts[parts.length - 2] = domain
    // parts[parts.length - 3] = APP_NAME
    return parts[parts.length - 3];
}

function generatePortContent(modelName: string, namespace: string, modelFileName: string, type: 'incoming' | 'outgoing', attributes: ModelAttribute[], selectedMethods: string[]): string {
    const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const suffix = type === 'incoming' ? 'IncomingPort' : 'OutgoingPort';
    const className = `I${modelName}${suffix}`;

    const idAttr = findIdAttribute(attributes, modelName);
    const idType = idAttr.type;
    const idName = idAttr.name;
    const capitalizedIdName = idName.charAt(0).toUpperCase() + idName.slice(1);

    let methods = '';

    if (type === 'incoming') {
        if (selectedMethods.includes('create')) methods += `        virtual void create(const model::${modelName}& ${modelVar}) = 0;\n`;
        if (selectedMethods.includes('update')) methods += `        virtual void update(const model::${modelName}& ${modelVar}) = 0;\n`;
        if (selectedMethods.includes('delete')) methods += `        virtual void deleteBy${capitalizedIdName}(${idType} ${idName}) = 0;\n`;
        if (selectedMethods.includes('getById')) methods += `        virtual std::optional<model::${modelName}> getBy${capitalizedIdName}(${idType} ${idName}) = 0;\n`;
        if (selectedMethods.includes('getAll')) methods += `        virtual std::vector<model::${modelName}> getAll() = 0;\n`;
    } else {
        if (selectedMethods.includes('save')) methods += `        virtual void save(const model::${modelName}& ${modelVar}) = 0;\n`;
        if (selectedMethods.includes('saveAll')) methods += `        virtual void saveAll(const std::vector<model::${modelName}>& ${modelVar}s) = 0;\n`;
        if (selectedMethods.includes('delete')) methods += `        virtual void deleteBy${capitalizedIdName}(${idType} ${idName}) = 0;\n`;
        if (selectedMethods.includes('deleteAll')) methods += `        virtual void deleteAll() = 0;\n`;
        if (selectedMethods.includes('findById')) methods += `        virtual std::optional<model::${modelName}> findBy${capitalizedIdName}(${idType} ${idName}) = 0;\n`;
        if (selectedMethods.includes('findAll')) methods += `        virtual std::vector<model::${modelName}> findAll() = 0;\n`;
        if (selectedMethods.includes('exists')) methods += `        virtual bool existsBy${capitalizedIdName}(${idType} ${idName}) = 0;\n`;
        if (selectedMethods.includes('count')) methods += `        virtual long count() = 0;\n`;
    }

    // Add selected attribute-based finders
    attributes
        .filter(a => a.name !== idName && isSearchableType(a.type))
        .forEach(a => {
            const capName = a.name.charAt(0).toUpperCase() + a.name.slice(1);
            const prefix = type === 'incoming' ? 'getBy' : 'findBy';
            const methodName = `${prefix}${capName}`;
            
            if (selectedMethods.includes(methodName)) {
                const methodPrefix = type === 'incoming' ? 'get' : 'find';
                methods += `        virtual std::vector<model::${modelName}> ${methodPrefix}By${capName}(const ${a.type}& ${a.name}) = 0;\n`;
            }
        });

    return `#pragma once

#include "domain/model/${modelFileName}"
#include <vector>
#include <optional>
#include <string>

namespace ${namespace} {
namespace domain {
namespace ports {
namespace ${type} {

    class ${className} {
    public:
        virtual ~${className}() = default;
        
${methods}    };

} // namespace ${type}
} // namespace ports
} // namespace domain
} // namespace ${namespace}
`;
}
