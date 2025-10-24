# Template Dosyaları

Bu klasör, proje yapısını tanımlayan JSON template dosyalarını içerir.

## Yerleşik Template'ler

- `white.json` - Hexagonal Architecture yapısı
- `gray.json` - Standart C++ proje yapısı
- `dark.json` - Minimal C++ proje yapısı

## Özel Template Oluşturma

Kendi template'inizi oluşturmak için JSON formatında bir dosya oluşturun:

```json
{
  "name": "Proje Adı",
  "description": "Proje açıklaması",
  "structure": [
    {
      "type": "directory",
      "path": "klasor/adi"
    },
    {
      "type": "file",
      "path": "dosya.cpp",
      "content": "// Dosya içeriği\n"
    }
  ]
}
```

### Örnek

`example-custom-template.json` dosyasını inceleyin.

## Kullanım

1. Extension'ı çalıştırın: `HexDef: Create New Project`
2. "Özel Template" seçeneğini seçin
3. JSON template dosyanızı seçin
4. Proje adını girin
5. Proje konumunu seçin

## Template Yapısı

### Alanlar

- **name** (zorunlu): Template'in görünen adı
- **description** (zorunlu): Template açıklaması
- **structure** (zorunlu): Dosya ve klasör yapısı dizisi

### Structure Item Tipleri

#### Directory (Klasör)
```json
{
  "type": "directory",
  "path": "relative/path/to/directory"
}
```

#### File (Dosya)
```json
{
  "type": "file",
  "path": "relative/path/to/file.cpp",
  "content": "Dosya içeriği buraya gelir"
}
```

### İpuçları

1. **Path'ler**: Her zaman göreceli path kullanın (proje kök dizinine göre)
2. **İç içe klasörler**: Otomatik olarak oluşturulur
3. **Dosya içeriği**: `\n` ile yeni satır ekleyebilirsiniz
4. **JSON escape**: Özel karakterleri escape edin (`"` → `\"`)

## Örnek Template'ler

### Minimal
```json
{
  "name": "Minimal",
  "description": "En basit yapı",
  "structure": [
    {
      "type": "file",
      "path": "main.cpp",
      "content": "#include <iostream>\n\nint main() {\n    return 0;\n}\n"
    }
  ]
}
```

### MVC Pattern
```json
{
  "name": "MVC Pattern",
  "description": "Model-View-Controller yapısı",
  "structure": [
    {"type": "directory", "path": "models"},
    {"type": "directory", "path": "views"},
    {"type": "directory", "path": "controllers"},
    {"type": "file", "path": "main.cpp", "content": ""}
  ]
}
```
