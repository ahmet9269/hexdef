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

export type ProjectType = 'white' | 'dark' | 'app';

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
export function getTemplates(type: ProjectType): ProjectTemplate {
    const schemasDir = process.env.SCHEMAS_DIR;
    
    if (!schemasDir) {
        throw new Error('SCHEMAS_DIR çevresel değişkeni tanımlanmamış! Lütfen "source initial.sh" komutunu çalıştırın.');
    }
    
    const templatePath = path.join(schemasDir, `${type}.json`);
    
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    return JSON.parse(templateContent) as ProjectTemplate;
}

/**
 * Template içindeki tüm çevresel değişkenleri çöz
 */
function resolveTemplateVariables(template: ProjectTemplate): ProjectTemplate {
    return {
        ...template,
        name: resolveVariables(template.name),
        description: resolveVariables(template.description),
        structure: template.structure.map(item => ({
            ...item,
            path: resolveVariables(item.path),
            content: item.content ? resolveVariables(item.content) : undefined
        }))
    };
}

/**
 * Kullanıcının özel template'ini yükle
 */
export function loadCustomTemplate(filePath: string): ProjectTemplate | null {
    return loadTemplateFromFile(filePath);
}
