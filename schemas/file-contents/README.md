# Template Dosya İçerikleri

Bu klasör, template JSON dosyalarında `contentFile` özelliği ile referans edilen dosya içeriklerini barındırır.

## Kullanım

### Yöntem 1: Doğrudan İçerik (Eski Yöntem)
```json
{
  "type": "file",
  "path": "main.cpp",
  "content": "#include <iostream>\n\nint main() {\n    return 0;\n}\n"
}
```

### Yöntem 2: Harici Dosyadan İçerik
```json
{
  "type": "file",
  "path": "main.cpp",
  "contentFile": "file-contents/gray-main.cpp"
}
```

### Yöntem 3: Çevresel Değişken ile
```json
{
  "type": "file",
  "path": "main.cpp",
  "contentFile": "${TEMPLATE_DIR}/gray-main.cpp"
}
```

veya

```json
{
  "type": "file",
  "path": "main.cpp",
  "contentFile": "$TEMPLATE_DIR/gray-main.cpp"
}
```

## Çevresel Değişkenler

Desteklenen formatlar:
- `${VAR_NAME}` - Tercih edilen format
- `$VAR_NAME` - Basit format (sadece büyük harf ve alt çizgi)

### Örnek Kullanım

**Linux/Mac:**
```bash
export TEMPLATE_DIR="file-contents"
code --install-extension hexarch-0.0.1.vsix
```

**Windows (PowerShell):**
```powershell
$env:TEMPLATE_DIR="file-contents"
code --install-extension hexarch-0.0.1.vsix
```

**Windows (CMD):**
```cmd
set TEMPLATE_DIR=file-contents
code --install-extension hexarch-0.0.1.vsix
```

### JSON Örneği
```json
{
  "name": "My Project",
  "structure": [
    {
      "type": "file",
      "path": "main.cpp",
      "contentFile": "${TEMPLATE_DIR}/main.cpp"
    },
    {
      "type": "file",
      "path": "README.md",
      "contentFile": "$CUSTOM_PATH/readme-template.md"
    }
  ]
}
```

## Avantajlar

1. **Okunabilirlik**: JSON dosyası daha temiz ve okunabilir
2. **Syntax Highlighting**: İçerik dosyalarında doğru syntax highlighting
3. **Kolay Düzenleme**: Escape karakterlerle uğraşmaya gerek yok
4. **Yeniden Kullanım**: Aynı dosya birden fazla template'de kullanılabilir
5. **Versiyon Kontrolü**: Git diff'leri daha anlamlı
6. **Esneklik**: Çevresel değişkenlerle dinamik yol belirtme

## Örnek Yapı

```
templates/
├── gray.json                    # Template tanımı
├── white.json
├── dark.json
└── file-contents/               # İçerik dosyaları
    ├── gray-main.cpp           # Gray template için
    ├── white-main.cpp          # White template için
    ├── CMakeLists.txt          # Ortak dosyalar
    └── README-template.md
```

## Notlar

- `contentFile` yolu, JSON dosyasının bulunduğu klasöre göre **relative** olmalıdır
- Çevresel değişken tanımlı değilse, placeholder olduğu gibi kullanılır
- Dosya bulunamazsa konsola uyarı verilir ve içerik boş olur
- Hem `content` hem de `contentFile` varsa, `contentFile` önceliklidir
