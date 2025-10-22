# HexArch VS Code Extension - Proje Analizi

## Proje Özeti
HexArch, VS Code için geliştirilmiş bir proje iskelet (scaffolding) extension'ıdır. Kullanıcıların önceden tanımlanmış proje yapılarını hızlıca oluşturmasını sağlar. Özellikle Hexagonal Architecture gibi karmaşık proje yapılarını tek komutla oluşturmak için tasarlanmıştır.

## Temel Özellikler

### 1. Dinamik Konfigürasyon Sistemi
- Proje yapıları JSON dosyalarından okunur
- Kullanıcılar kendi template'lerini oluşturabilir
- Yerleşik template'ler: White (Hexagonal), Gray, Dark

### 2. Çoklu Template Oluşturma
- Tek komutla üç farklı template'i aynı anda oluşturur
- Her template ayrı bir alt klasörde oluşturulur
- Proje yapısı: `my-project/white/`, `my-project/gray/`, `my-project/dark/`

### 3. Özelleştirilebilir Yapı
- JSON formatında template tanımlama
- Dosya ve klasör yapılarını kolayca düzenleme
- İç içe klasör desteği

## Proje Yapısı

```
hexdef/
├── src/
│   ├── extension.ts              # Extension giriş noktası
│   ├── commands/
│   │   ├── scaffold.ts           # Tek template oluşturma (kullanılmıyor)
│   │   └── multiScaffold.ts      # Çoklu template oluşturma (aktif)
│   └── templates/
│       └── index.ts              # Template yükleme ve yönetim
├── templates/                     # JSON template dosyaları
│   ├── white.json                # Hexagonal Architecture
│   ├── gray.json                 # Standart yapı
│   ├── dark.json                 # Minimal yapı
│   ├── example-custom-template.json  # Örnek özel template
│   └── README.md                 # Template dokümantasyonu
├── test/                         # Test dosyaları
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript konfigürasyonu
└── prepare_extension.sh          # Build ve yükleme scripti

```

## Dosya Detayları

### 1. extension.ts
**Amaç:** VS Code extension'ın ana giriş noktası

**İçerik:**
- `activate()`: Extension başlatıldığında çalışır
- Komut kaydı: `hexdef.createMultipleProjects`
- Extension lifecycle yönetimi

**Önemli Kod:**
```typescript
export function activate(context: vscode.ExtensionContext) {
    let multiDisposable = vscode.commands.registerCommand(
        'hexdef.createMultipleProjects', 
        async () => await createMultipleProjects()
    );
    context.subscriptions.push(multiDisposable);
}
```

### 2. commands/multiScaffold.ts
**Amaç:** Çoklu proje oluşturma mantığı

**İçerik:**
- `createMultipleProjects()`: Ana komut fonksiyonu
- `createProjectStructure()`: Dosya/klasör oluşturma helper'ı
- Hata yönetimi ve kullanıcı geri bildirimi

**İş Akışı:**
1. Kullanıcıdan proje adı alır
2. Hedef klasör seçtirir
3. White, Gray, Dark template'lerini yükler
4. Her biri için alt klasör oluşturur
5. Template yapısını dosya sistemine yazar
6. Başarı/hata mesajı gösterir

**Önemli Kod:**
```typescript
const templates = [
    { name: 'white', template: getTemplates('white') },
    { name: 'gray', template: getTemplates('gray') },
    { name: 'dark', template: getTemplates('dark') }
];

for (const { name, template } of templates) {
    const templatePath = path.join(baseProjectPath, name);
    await createProjectStructure(templatePath, template);
}
```

### 3. templates/index.ts
**Amaç:** Template yükleme ve yönetim sistemi

**İçerik:**
- Interface tanımları: `ProjectStructureItem`, `ProjectTemplate`
- `loadTemplateFromFile()`: JSON dosyasından template okuma
- `getTemplates()`: Yerleşik template'leri yükleme
- `loadCustomTemplate()`: Kullanıcı tanımlı template yükleme

**Önemli Kod:**
```typescript
export function getTemplates(projectType: ProjectType): ProjectTemplate {
    const templatePath = path.join(__dirname, '..', '..', 'templates', `${projectType}.json`);
    
    if (fs.existsSync(templatePath)) {
        return loadTemplateFromFile(templatePath);
    }
    
    // Fallback: Boş template
    return { name: '', description: '', structure: [] };
}
```

### 4. templates/white.json
**Amaç:** Hexagonal Architecture template tanımı

**Yapı:**
```json
{
  "name": "White Project",
  "description": "White tema proje yapısı - Hexagonal Architecture",
  "structure": [
    {"type": "directory", "path": "adapters"},
    {"type": "directory", "path": "adapters/incoming"},
    {"type": "directory", "path": "adapters/outgoing"},
    {"type": "directory", "path": "adapters/common/utils"},
    {"type": "directory", "path": "domain/logic"},
    {"type": "directory", "path": "domain/model"},
    {"type": "directory", "path": "domain/ports/incoming"},
    {"type": "directory", "path": "domain/ports/outgoing"},
    {"type": "file", "path": "main.cpp", "content": "..."},
    {"type": "file", "path": "CMakeLists.txt", "content": "..."},
    {"type": "file", "path": "README.md", "content": "..."}
  ]
}
```

**Oluşturulan Proje Yapısı:**
```
white_myproject/
├── adapters/
│   ├── incoming/
│   ├── outgoing/
│   └── common/utils/
├── domain/
│   ├── logic/
│   ├── model/
│   └── ports/
│       ├── incoming/
│       └── outgoing/
├── main.cpp
├── CMakeLists.txt
└── README.md
```

### 5. package.json
**Amaç:** Extension manifest ve metadata

**Önemli Alanlar:**
- `name`: "hexdef"
- `displayName`: "HexDef Project Scaffolder"
- `main`: "./out/extension.js"
- `activationEvents`: Extension ne zaman aktif olur
- `contributes.commands`: Kullanıcıya sunulan komutlar
- `scripts`: Build ve test komutları

**Komut Tanımı:**
```json
"contributes": {
  "commands": [{
    "command": "hexdef.createMultipleProjects",
    "title": "HexArch: Create New Project"
  }]
}
```

### 6. prepare_extension.sh
**Amaç:** Build ve deployment otomasyonu

**İşlevler:**
1. Mevcut extension'ı kaldırır
2. TypeScript kodunu derler
3. VSIX paketi oluşturur
4. Yeni extension'ı yükler

**Kullanım:**
```bash
./prepare_extension.sh
```

## Template JSON Formatı

### Temel Yapı
```json
{
  "name": "Template Adı",
  "description": "Açıklama",
  "structure": [...]
}
```

### Structure Item Tipleri

#### Directory (Klasör)
```json
{
  "type": "directory",
  "path": "relative/path/to/dir"
}
```

#### File (Dosya)
```json
{
  "type": "file",
  "path": "relative/path/to/file.cpp",
  "content": "Dosya içeriği"
}
```

### Örnek: Minimal Template
```json
{
  "name": "Minimal C++ Project",
  "description": "En basit C++ yapısı",
  "structure": [
    {
      "type": "directory",
      "path": "src"
    },
    {
      "type": "file",
      "path": "main.cpp",
      "content": "#include <iostream>\\n\\nint main() {\\n    return 0;\\n}\\n"
    }
  ]
}
```

## Kullanım Senaryoları

### Senaryo 1: Temel Kullanım
1. VS Code'da `Ctrl+Shift+P` ile komut paletini aç
2. "HexArch: Create New Project" komutunu seç
3. Proje adını gir (örn: "my-app")
4. Hedef klasörü seç
5. Üç template (white/gray/dark) otomatik oluşturulur

### Senaryo 2: Özel Template Oluşturma
1. `templates/` klasöründe yeni JSON dosyası oluştur
2. Template yapısını tanımla
3. JSON dosyasını kaydet
4. Extension'ı yeniden derle ve yükle
5. Yeni template kullanılabilir

### Senaryo 3: Mevcut Template'i Düzenleme
1. `templates/white.json` dosyasını aç
2. `structure` dizisine yeni dizin/dosya ekle
3. Extension'ı yeniden derle: `./prepare_extension.sh`
4. Yeni yapı artık oluşturulacak

## Teknik Detaylar

### TypeScript Konfigürasyonu
- Target: ES2020
- Module: CommonJS
- Strict mode aktif
- Out directory: `./out`

### Bağımlılıklar
- `@types/vscode`: VS Code API tipleri
- `@types/node`: Node.js tipleri
- `typescript`: TypeScript derleyici
- `@vscode/test-electron`: Test framework

### Build Süreci
1. `tsc -p ./` - TypeScript'i derle
2. `vsce package` - VSIX paketi oluştur
3. `code --install-extension` - Extension'ı yükle

## Extension API Kullanımı

### Komut Kaydı
```typescript
vscode.commands.registerCommand('komut.id', callback)
```

### Kullanıcı Girişi
```typescript
// Input Box
await vscode.window.showInputBox({
    prompt: 'Mesaj',
    validateInput: validasyonFonksiyonu
});

// Folder Picker
await vscode.window.showOpenDialog({
    canSelectFolders: true
});
```

### Mesaj Gösterme
```typescript
vscode.window.showInformationMessage('Başarılı!');
vscode.window.showErrorMessage('Hata!');
vscode.window.showWarningMessage('Uyarı!');
```

## Geliştirme İpuçları

### Yeni Template Ekleme
1. `templates/` klasöründe yeni JSON dosyası oluştur
2. Eğer otomatik yüklenmesini istiyorsan:
   - `multiScaffold.ts` dosyasında `templates` dizisine ekle
   - `templates/index.ts` içinde `ProjectType` enum'ına ekle

### Debug Modu
1. F5 tuşuna bas
2. Extension Development Host penceresi açılır
3. Ana VS Code penceresinde console logları görürsün
4. Breakpoint'ler çalışır

### Hata Ayıklama
- Console logları için: `console.log()`
- Output panel için: `vscode.window` mesajları
- Dosya sistemi hataları için try-catch blokları

## Potansiyel Geliştirmeler

### 1. Template Seçici
Kullanıcıya hangi template'leri oluşturmak istediğini sorabilir:
```typescript
const selected = await vscode.window.showQuickPick(
    ['white', 'gray', 'dark'],
    { canPickMany: true }
);
```

### 2. Değişken Desteği
Template'lerde değişken kullanımı:
```json
{
  "type": "file",
  "path": "README.md",
  "content": "# {{PROJECT_NAME}}\n\nCreated by {{AUTHOR}}"
}
```

### 3. Git Entegrasyonu
Proje oluşturduktan sonra otomatik git init:
```typescript
await vscode.commands.executeCommand('git.init');
```

### 4. Dependency Yönetimi
package.json, CMakeLists.txt gibi dosyalarda bağımlılık ekleme

### 5. Template Market
Topluluk template'lerini indirme ve paylaşma

## Test Stratejisi

### Unit Testler
- Template yükleme fonksiyonları
- JSON parsing
- Dosya/klasör oluşturma helper'ları

### Integration Testler
- Tam proje oluşturma akışı
- Hata senaryoları
- Kullanıcı etkileşimi simülasyonu

### Manuel Test Checklist
- [ ] Proje başarıyla oluşturuluyor mu?
- [ ] Dosya içerikleri doğru mu?
- [ ] Klasör yapısı beklendiği gibi mi?
- [ ] Hata mesajları anlamlı mı?
- [ ] Mevcut klasör kontrolü çalışıyor mu?

## Güvenlik Notları

### Dosya Sistemi
- Path traversal saldırılarına karşı korunma
- Proje adı validasyonu (sadece alfanumerik ve - _)
- Mevcut dosya üzerine yazma kontrolü

### JSON Parsing
- Hatalı JSON dosyalarını yakalama
- Try-catch blokları ile hata yönetimi

## Performans Optimizasyonları

### 1. Lazy Loading
Template'ler sadece gerektiğinde yüklenir

### 2. Async/Await
Dosya işlemleri asenkron yapılır, UI bloke olmaz

### 3. Batch Operations
Dosya oluşturma işlemleri toplu yapılır

## Deployment

### VS Code Marketplace'e Yayınlama
1. Publisher hesabı oluştur
2. `vsce publish` komutu ile yayınla
3. VERSION numarasını artır

### Local Paylaşım
1. `.vsix` dosyasını paylaş
2. `code --install-extension hexdef-0.0.1.vsix` ile yüklet

## Sorun Giderme

### Extension yüklenmiyor
- `code --list-extensions` ile kontrol et
- Extension'ı kaldır ve tekrar yükle
- VS Code'u yeniden başlat

### Template oluşturulmuyor
- JSON syntax'ı kontrol et
- Console loglarına bak
- Dosya izinlerini kontrol et

### Derleme hataları
- `npm install` çalıştır
- `tsconfig.json` ayarlarını kontrol et
- `node_modules` ve `out` klasörlerini sil, tekrar derle

## Sonuç

HexArch Extension, kullanıcıların karmaşık proje yapılarını hızlıca oluşturmasını sağlayan güçlü bir araçtır. JSON tabanlı konfigürasyon sistemi sayesinde son derece esnek ve özelleştirilebilirdir. Hexagonal Architecture gibi enterprise-level mimari kalıpları tek komutla oluşturabilme özelliği, geliştirme sürecini önemli ölçüde hızlandırır.

---

**Son Güncelleme:** 22 Ekim 2025
**Versiyon:** 0.0.1
**Dil:** TypeScript
**Platform:** VS Code Extension API
