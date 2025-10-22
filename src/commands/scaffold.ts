import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectTemplate, ProjectType, getTemplates, loadCustomTemplate } from '../templates';

export async function createProject() {
    // Kullanıcıdan proje tipini al (white, gray, dark, veya özel)
    const projectTypeOptions = [
        { label: 'White', description: 'White tema proje yapısı', value: 'white' as ProjectType },
        { label: 'Gray', description: 'Gray tema proje yapısı', value: 'gray' as ProjectType },
        { label: 'Dark', description: 'Dark tema proje yapısı', value: 'dark' as ProjectType },
        { label: 'Özel Template', description: 'Kendi JSON dosyanızdan yükleyin', value: 'custom' as any }
    ];

    const selectedProjectType = await vscode.window.showQuickPick(projectTypeOptions, {
        placeHolder: 'Hangi proje tipini oluşturmak istiyorsunuz?'
    });

    if (!selectedProjectType) {
        return;
    }

    // Template'i al
    let template: ProjectTemplate | null = null;
    
    if (selectedProjectType.value === 'custom') {
        // Özel template dosyası seç
        const templateFiles = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: 'Template JSON dosyasını seç',
            filters: {
                'JSON': ['json']
            }
        });

        if (!templateFiles || templateFiles.length === 0) {
            return;
        }

        template = loadCustomTemplate(templateFiles[0].fsPath);
        
        if (!template) {
            vscode.window.showErrorMessage('Template dosyası yüklenemedi!');
            return;
        }
    } else {
        template = getTemplates(selectedProjectType.value);
    }

    if (!template || template.structure.length === 0) {
        vscode.window.showErrorMessage('Template yapısı boş veya geçersiz!');
        return;
    }

    // Kullanıcıdan proje adını al
    const projectName = await vscode.window.showInputBox({
        prompt: 'Proje adını girin',
        placeHolder: 'my-project',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Proje adı boş olamaz';
            }
            if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
                return 'Proje adı sadece harf, rakam, tire ve alt çizgi içerebilir';
            }
            return null;
        }
    });

    if (!projectName) {
        return;
    }

    // Seçilen tipe göre template'i al
    // Proje oluşturulacak dizini seç
    const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Proje konumunu seç'
    });

    if (!folderUri || folderUri.length === 0) {
        return;
    }

    const projectPath = path.join(folderUri[0].fsPath, projectName);

    // Proje dizini zaten varsa uyar
    if (fs.existsSync(projectPath)) {
        vscode.window.showErrorMessage(`"${projectName}" klasörü zaten mevcut!`);
        return;
    }

    try {
        // Proje yapısını oluştur
        await createProjectStructure(projectPath, template);
        
        vscode.window.showInformationMessage(`Proje "${projectName}" başarıyla oluşturuldu!`);
        
        // Kullanıcıya yeni projeyi açmak isteyip istemediğini sor
        const openProject = await vscode.window.showInformationMessage(
            'Yeni projeyi açmak ister misiniz?',
            'Evet',
            'Hayır'
        );

        if (openProject === 'Evet') {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath));
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Proje oluşturulurken hata: ${error}`);
    }
}

async function createProjectStructure(projectPath: string, template: ProjectTemplate) {
    // Ana dizini oluştur
    fs.mkdirSync(projectPath, { recursive: true });

    // Template'deki tüm dosya ve klasörleri oluştur
    for (const item of template.structure) {
        const itemPath = path.join(projectPath, item.path);

        if (item.type === 'directory') {
            fs.mkdirSync(itemPath, { recursive: true });
        } else if (item.type === 'file') {
            const dir = path.dirname(itemPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(itemPath, item.content || '');
        }
    }
}
