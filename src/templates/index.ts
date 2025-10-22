import * as fs from 'fs';
import * as path from 'path';

export interface ProjectStructureItem {
    type: 'file' | 'directory';
    path: string;
    content?: string;
    contentFile?: string; // Dosya içeriğini bu dosyadan kopyala
}

export interface ProjectTemplate {
    name: string;
    description: string;
    structure: ProjectStructureItem[];
}

export type ProjectType = 'white' | 'gray' | 'dark';

/**
 * JSON konfigürasyon dosyasından template'i yükle
 */
export function loadTemplateFromFile(templatePath: string): ProjectTemplate | null {
    try {
        const fileContent = fs.readFileSync(templatePath, 'utf-8');
        const template = JSON.parse(fileContent) as ProjectTemplate;
        return template;
    } catch (error) {
        console.error(`Template yüklenirken hata: ${error}`);
        return null;
    }
}

/**
 * Yerleşik template'i yükle veya özel JSON dosyasından oku
 */
export function getTemplates(projectType: ProjectType): ProjectTemplate {
    // Extension'ın templates klasöründeki JSON dosyasını oku
    const templatePath = path.join(__dirname, '..', '..', 'templates', `${projectType}.json`);
    
    if (fs.existsSync(templatePath)) {
        const template = loadTemplateFromFile(templatePath);
        if (template) {
            return template;
        }
    }

    // Fallback: Boş template döndür
    return {
        name: `${projectType.charAt(0).toUpperCase() + projectType.slice(1)} Project`,
        description: `${projectType} tema proje yapısı`,
        structure: []
    };
}

/**
 * Kullanıcının özel template'ini yükle
 */
export function loadCustomTemplate(filePath: string): ProjectTemplate | null {
    return loadTemplateFromFile(filePath);
}
