#!/bin/bash

echo "🧹 HexDef Proje Temizliği Başlıyor..."
echo "======================================"

# Mevcut boyut
echo "📊 Mevcut proje boyutu:"
du -sh /workspaces/hexdef

echo ""
echo "📁 Dizin detayları:"
du -h --max-depth=1 /workspaces/hexdef | sort -rh

echo ""
echo "🗑️  Temizlenecek dosyalar:"

# node_modules (yeniden kurulabilir)
if [ -d "node_modules" ]; then
    echo "  - node_modules: $(du -sh node_modules | cut -f1)"
fi

# out dizini (compile ile oluşur)
if [ -d "out" ]; then
    echo "  - out: $(du -sh out | cut -f1)"
fi

# VSIX dosyaları
VSIX_COUNT=$(find . -name "*.vsix" | wc -l)
if [ $VSIX_COUNT -gt 0 ]; then
    echo "  - VSIX dosyaları: $VSIX_COUNT adet"
    find . -name "*.vsix" -exec ls -lh {} \;
fi

# Tar/Zip arşivleri
ARCHIVE_COUNT=$(find . -name "*.tar" -o -name "*.zip" -o -name "*.gz" | wc -l)
if [ $ARCHIVE_COUNT -gt 0 ]; then
    echo "  - Arşiv dosyaları: $ARCHIVE_COUNT adet"
    find . -name "*.tar" -o -name "*.zip" -o -name "*.gz" -exec ls -lh {} \;
fi

# .vscode-test
if [ -d ".vscode-test" ]; then
    echo "  - .vscode-test: $(du -sh .vscode-test | cut -f1)"
fi

# Test proje klasörleri içindeki bin/lib
echo ""
echo "  - Test proje build dosyaları:"
find test/ -type d -name "bin" -o -name "lib" -o -name "obj" 2>/dev/null | while read dir; do
    if [ -d "$dir" ]; then
        echo "    $dir: $(du -sh $dir | cut -f1)"
    fi
done

echo ""
read -p "🤔 Bu dosyaları silmek istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Temizlik yapılıyor..."
    
    # out dizini
    rm -rf out/
    echo "  ✅ out/ silindi"
    
    # VSIX dosyaları
    find . -name "*.vsix" -delete
    echo "  ✅ *.vsix dosyaları silindi"
    
    # Tar/Zip dosyaları
    find . -name "*.tar" -delete
    find . -name "*.zip" -delete
    find . -name "*.gz" -delete
    echo "  ✅ Arşiv dosyaları silindi"
    
    # .vscode-test
    rm -rf .vscode-test/
    echo "  ✅ .vscode-test/ silindi"
    
    # Test proje build dosyaları
    find test/ -type d -name "bin" -exec rm -rf {} + 2>/dev/null
    find test/ -type d -name "lib" -exec rm -rf {} + 2>/dev/null
    find test/ -type d -name "obj" -exec rm -rf {} + 2>/dev/null
    echo "  ✅ Test build dosyaları silindi"
    
    # Git garbage collection
    git gc --aggressive --prune=now 2>/dev/null
    echo "  ✅ Git temizlendi"
    
    echo ""
    echo "🎉 Temizlik tamamlandı!"
    echo "📊 Yeni proje boyutu:"
    du -sh /workspaces/hexdef
else
    echo "❌ Temizlik iptal edildi"
fi