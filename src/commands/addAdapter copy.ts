import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function addIncomingAdapter(uri: vscode.Uri) {
    await addAdapter(uri, 'incoming');
}

export async function addOutgoingAdapter(uri: vscode.Uri) {
    await addAdapter(uri, 'outgoing');
}

async function addAdapter(uri: vscode.Uri, type: 'incoming' | 'outgoing') {
    if (!uri) {
        vscode.window.showErrorMessage('Please select a project folder.');
        return;
    }

    const projectPath = uri.fsPath;
    const isWhite = projectPath.includes('white_src');
    const headerExt = isWhite ? '.hpp' : '.h';
    
    // 1. Locate the ports directory to list available ports
    const portsDir = findPortsDirectory(projectPath, type);
    if (!portsDir) {
        vscode.window.showErrorMessage(`Could not find domain/ports/${type} directory.`);
        return;
    }

    // 2. List available ports
    const portFiles = fs.readdirSync(portsDir).filter(f => f.endsWith('.h') || f.endsWith('.hpp'));
    if (portFiles.length === 0) {
        vscode.window.showWarningMessage(`No ports found in ${portsDir}. Create a port first.`);
        return;
    }

    // 3. Let user select a port
    const selectedPortFile = await vscode.window.showQuickPick(portFiles, {
        placeHolder: `Select the ${type} port to implement/use`
    });

    if (!selectedPortFile) return;

    // 3.5 Select Technology
    const mwName = process.env.MW_NAME || 'Kafka';
    const defaultTechs = ['ZeroMQ', 'RabbitMQ', 'Kafka', 'REST'];
    if (!defaultTechs.includes(mwName)) {
        defaultTechs.push(mwName);
    }
    const techOptions = [...defaultTechs, 'Custom...'];

    const selectedTech = await vscode.window.showQuickPick(techOptions, {
        placeHolder: 'Select the technology for this adapter'
    });

    if (!selectedTech) return;

    let technology = selectedTech;
    if (selectedTech === 'Custom...') {
        const customTech = await vscode.window.showInputBox({
            prompt: 'Enter the technology name (e.g. Redis, gRPC)',
            placeHolder: 'Technology Name'
        });
        if (!customTech) return;
        technology = customTech;
    }

    // Normalize technology name for file/class naming
    // PascalCase for Class Name (e.g. Kafka)
    const techPascal = technology.charAt(0).toUpperCase() + technology.slice(1).toLowerCase();
    // lowercase for directory (e.g. kafka)
    const techLower = technology.toLowerCase();

    // Extract Model Name from Port Name (e.g., IOrderIncomingPort.h -> Order)
    const portNameBase = selectedPortFile.replace(/\.(h|hpp)$/, '');
    const match = portNameBase.match(/^I(.+)(Incoming|Outgoing)Port$/);
    const modelName = match ? match[1] : portNameBase; 

    // 4. Determine Adapter Directory
    // Should be .../src/*/adapters/${type}/${techLower}
    const baseAdaptersDir = findAdaptersDirectory(projectPath, type);
    if (!baseAdaptersDir) {
        vscode.window.showErrorMessage(`Could not find adapters/${type} directory.`);
        return;
    }
    
    const adaptersDir = path.join(baseAdaptersDir, techLower);
    if (!fs.existsSync(adaptersDir)) {
        fs.mkdirSync(adaptersDir, { recursive: true });
    }

    // 5. Generate Adapter Name
    // Format: ModelName + Technology + Incoming/Outgoing + Adapter
    // e.g. DelayCalcTrackDataKafkaIncomingAdapter
    const adapterName = `${modelName}${techPascal}${type === 'incoming' ? 'Incoming' : 'Outgoing'}Adapter`;
    const adapterHeaderFile = path.join(adaptersDir, `${adapterName}${headerExt}`);

    if (fs.existsSync(adapterHeaderFile)) {
        vscode.window.showErrorMessage(`Adapter ${adapterName} already exists.`);
        return;
    }

    // 6. Generate Content
    const namespace = getNamespaceFromPath(adaptersDir);
    
    // Calculate relative path to port
    const relativePortPath = path.relative(adaptersDir, path.join(portsDir, selectedPortFile)).replace(/\\/g, '/');

    let content = '';
    if (type === 'outgoing') {
        content = generateOutgoingAdapter(namespace, adapterName, modelName, relativePortPath, technology);
    } else {
        content = generateIncomingAdapter(namespace, adapterName, modelName, relativePortPath, technology);
    }

    fs.writeFileSync(adapterHeaderFile, content);

    // Open the file
    const doc = await vscode.workspace.openTextDocument(adapterHeaderFile);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(`Created adapter: ${adapterName}`);
}

function findPortsDirectory(startPath: string, type: string): string | null {
    // Strategy: Look for src/{APP}/domain/ports/{type}
    
    // 1. Check if startPath has a 'src' subdirectory (e.g. dark_src)
    const srcPath = path.join(startPath, 'src');
    if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
        const subdirs = fs.readdirSync(srcPath).filter(f => fs.statSync(path.join(srcPath, f)).isDirectory());
        for (const subdir of subdirs) {
            const portsPath = path.join(srcPath, subdir, 'domain', 'ports', type);
            if (fs.existsSync(portsPath)) {
                return portsPath;
            }
        }
    }

    // 2. Check if startPath IS the 'src' directory or inside it
    let current = startPath;
    while (current.length > 5) { 
        if (path.basename(current) === 'src') {
            const subdirs = fs.readdirSync(current).filter(f => fs.statSync(path.join(current, f)).isDirectory());
            for (const subdir of subdirs) {
                const portsPath = path.join(current, subdir, 'domain', 'ports', type);
                if (fs.existsSync(portsPath)) {
                    return portsPath;
                }
            }
            break; 
        }
        
        if (current.endsWith(`domain${path.sep}ports${path.sep}${type}`)) {
            return current;
        }

        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }

    return null;
}

function findAdaptersDirectory(startPath: string, type: string): string | null {
    // Strategy: Look for src/{APP}/adapters/{type}

    // 1. Check if startPath has a 'src' subdirectory
    const srcPath = path.join(startPath, 'src');
    if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
        const subdirs = fs.readdirSync(srcPath).filter(f => fs.statSync(path.join(srcPath, f)).isDirectory());
        for (const subdir of subdirs) {
            const adaptersPath = path.join(srcPath, subdir, 'adapters', type);
            if (!fs.existsSync(adaptersPath)) {
                fs.mkdirSync(adaptersPath, { recursive: true });
            }
            return adaptersPath;
        }
    }

    // 2. Walk up/down
    let current = startPath;
    while (current.length > 5) {
        if (path.basename(current) === 'src') {
             const subdirs = fs.readdirSync(current).filter(f => fs.statSync(path.join(current, f)).isDirectory());
            for (const subdir of subdirs) {
                const adaptersPath = path.join(current, subdir, 'adapters', type);
                if (!fs.existsSync(adaptersPath)) {
                    fs.mkdirSync(adaptersPath, { recursive: true });
                }
                return adaptersPath;
            }
            break;
        }
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }

    return null;
}

function getNamespaceFromPath(dirPath: string): string {
    // dirPath: .../src/AppName/adapters/incoming/kafka
    // wanted: AppName::adapters::incoming::kafka
    
    const parts = dirPath.split(path.sep);
    const srcIndex = parts.lastIndexOf('src');
    if (srcIndex !== -1 && srcIndex + 1 < parts.length) {
        const relevantParts = parts.slice(srcIndex + 1);
        return relevantParts.join('::');
    }
    return 'app::adapters';
}

function generateOutgoingAdapter(namespace: string, className: string, modelName: string, relativePortPath: string, technology: string): string {
    const portClass = `I${modelName}OutgoingPort`;
    
    return `#pragma once

#include "${relativePortPath}"
#include <iostream>

namespace ${namespace} {

class ${className} : public domain::ports::outgoing::${portClass} {
public:
    virtual ~${className}() = default;

    void send(const domain::model::${modelName}& data) override {
        // TODO: Implement ${technology} sending logic
        std::cout << "[${technology}] Adapter sending ${modelName}..." << std::endl;
    }
};

} // namespace ${namespace}
`;
}

function generateIncomingAdapter(namespace: string, className: string, modelName: string, relativePortPath: string, technology: string): string {
    const portClass = `I${modelName}IncomingPort`;

    return `#pragma once

#include "${relativePortPath}"
#include <iostream>
#include <memory>

namespace ${namespace} {

class ${className} {
private:
    // Reference to the port (usually implemented by the Domain Service)
    domain::ports::incoming::${portClass}& port;

public:
    explicit ${className}(domain::ports::incoming::${portClass}& port) 
        : port(port) {}

    virtual ~${className}() = default;

    // This method simulates receiving data from ${technology}
    void startListening() {
        // TODO: Implement ${technology} listening logic
        std::cout << "[${technology}] Adapter started listening for ${modelName}..." << std::endl;
        
        // Example usage:
        // domain::model::${modelName} data;
        // ... fill data from ${technology} message ...
        // port.onDataReceived(data);
    }
};

} // namespace ${namespace}
`;
}
