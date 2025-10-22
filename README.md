# HexDef - VS Code Project Scaffolder

HexDef, önceden tanımlanmış şablonlarla hızlıca proje oluşturmanızı sağlayan bir VS Code extension'ıdır.

## Özellikler

- 🚀 Hızlı proje oluşturma
- 📁 Önceden tanımlanmış proje şablonları
- ⚙️ Özelleştirilebilir yapı
- 💡 Kolay kullanım

## Kullanılabilir Şablonlar

1. **Basic TypeScript Project** - Temel TypeScript proje yapısı
2. **Express API** - Express.js REST API projesi
3. **React App** - React + TypeScript + Vite projesi

## Kullanım

1. Command Palette'i açın (`Ctrl+Shift+P` veya `Cmd+Shift+P`)
2. "HexDef: Create New Project" yazın
3. Proje adını girin
4. Bir şablon seçin
5. Proje konumunu belirleyin

## Geliştirme

### Gereksinimler

- Node.js (v18 veya üzeri)
- VS Code

### Kurulum

```bash
npm install
```

### Derleme

```bash
npm run compile
```

### Watch Modu

```bash
npm run watch
```

### Extension'ı Test Etme

1. VS Code'da F5 tuşuna basın
2. Yeni bir Extension Development Host penceresi açılacak
3. Command Palette'de "HexDef: Create New Project" komutunu çalıştırın

## Kendi Şablonlarınızı Ekleme

`src/templates/index.ts` dosyasını düzenleyerek yeni şablonlar ekleyebilirsiniz:

```typescript
{
    name: 'Şablon Adı',
    description: 'Şablon açıklaması',
    structure: [
        {
            type: 'directory',
            path: 'dizin-adi'
        },
        {
            type: 'file',
            path: 'dosya-adi.ts',
            content: 'dosya içeriği'
        }
    ]
}
```

## Lisans

MIT