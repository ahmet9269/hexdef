#!/bin/bash
# create_offline_package.sh

echo "📦 HexDef Offline Package Oluşturuluyor..."
echo "=============================================="

# Paket adı ve tarihi
PACKAGE_NAME="hexdef_offline_$(date +%Y%m%d_%H%M%S).tar.gz"

echo "📁 Paketlenecek dosyalar kontrol ediliyor..."

# Gerekli dosyaları listele
echo "  ✓ src/ (kaynak kodlar)"
echo "  ✓ schemas/ (template'ler)"
echo "  ✓ node_modules/ (bağımlılıklar)"
echo "  ✓ package.json"
echo "  ✓ package-lock.json"
echo "  ✓ tsconfig.json"
echo "  ✓ prepare_extension.sh"
echo "  ✓ .gitignore"

# Tar oluştur
echo ""
echo "📦 Paketleniyor..."
tar -czf "$PACKAGE_NAME" \
  --exclude='.git' \
  --exclude='out' \
  --exclude='*.vsix' \
  --exclude='*.tar' \
  --exclude='*.tar.gz' \
  --exclude='.vscode-test' \
  --exclude='test' \
  --exclude='.devcontainer' \
  --exclude='.vscode/settings.json' \
  src/ \
  schemas/ \
  node_modules/ \
  package.json \
  package-lock.json \
  tsconfig.json \
  prepare_extension.sh \
  .gitignore \
  README.md 2>/dev/null

# Boyut kontrolü
if [ -f "$PACKAGE_NAME" ]; then
    SIZE=$(du -sh "$PACKAGE_NAME" | cut -f1)
    echo ""
    echo "✅ Paket başarıyla oluşturuldu!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Dosya: $PACKAGE_NAME"
    echo "📊 Boyut: $SIZE"
    echo ""
    echo "📋 Paket içeriği:"
    tar -tzf "$PACKAGE_NAME" | head -25
    echo "   ..."
    TOTAL_FILES=$(tar -tzf "$PACKAGE_NAME" | wc -l)
    echo "   Toplam: $TOTAL_FILES dosya/klasör"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 Offline ortamda kullanım:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  1. tar -xzf $PACKAGE_NAME"
    echo "  2. cd hexdef/"
    echo "  3. chmod +x prepare_extension.sh"
    echo "  4. export MW_NAME=Kafka  # veya RabbitMQ, NATS vb."
    echo "  5. ./prepare_extension.sh"
    echo ""
    echo "✨ Extension kurulduktan sonra VS Code'u yeniden başlatın"
else
    echo "❌ HATA: Paket oluşturulamadı!"
    exit 1
fi