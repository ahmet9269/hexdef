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

### Yöntem 2: Harici Dosyadan İçerik (Yeni Yöntem)
```json
{
  "type": "file",
  "path": "main.cpp",
  "contentFile": "file-contents/gray-main.cpp"
}
```

## Avantajlar

1. **Okunabilirlik**: JSON dosyası daha temiz ve okunabilir
2. **Syntax Highlighting**: İçerik dosyalarında doğru syntax highlighting
3. **Kolay Düzenleme**: Escape karakterlerle uğraşmaya gerek yok
4. **Yeniden Kullanım**: Aynı dosya birden fazla template'de kullanılabilir
5. **Versiyon Kontrolü**: Git diff'leri daha anlamlı

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
- Dosya bulunamazsa konsola uyarı verilir ve içerik boş olur
- Hem `content` hem de `contentFile` varsa, `contentFile` önceliklidir
