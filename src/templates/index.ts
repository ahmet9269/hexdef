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
 * Çevresel değişkenleri ve değişken placeholder'larını çöz
 */
function resolveVariables(text: string): string {
    // Çevresel değişkenleri çöz: ${ENV_VAR} veya $ENV_VAR formatı
    let resolved = text.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        return process.env[varName] || match;
    });
    
    // Basit $ formatı için
    resolved = resolved.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
        return process.env[varName] || match;
    });
    
    return resolved;
}

/**
 * JSON konfigürasyon dosyasından template'i yükle
 */
export function loadTemplateFromFile(templatePath: string): ProjectTemplate | null {
    try {
        const fileContent = fs.readFileSync(templatePath, 'utf-8');
        const template = JSON.parse(fileContent) as ProjectTemplate;
        
        // contentFile özelliği olan dosyaların içeriğini yükle
        const templateDir = path.dirname(templatePath);
        for (const item of template.structure) {
            if (item.type === 'file' && item.contentFile) {
                // Çevresel değişkenleri çöz
                const resolvedPath = resolveVariables(item.contentFile);
                const contentFilePath = path.join(templateDir, resolvedPath);
                
                if (fs.existsSync(contentFilePath)) {
                    item.content = fs.readFileSync(contentFilePath, 'utf-8');
                } else {
                    console.warn(`Uyarı: ${resolvedPath} dosyası bulunamadı (${contentFilePath})`);
                }
                // contentFile'ı kaldır (artık content'e yüklendi)
                delete item.contentFile;
            }
        }
        
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
