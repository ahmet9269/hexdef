#!/bin/bash

echo "🔧 Tam temizlik başlıyor..."

# 1. Build dosyalarını sil
rm -rf out/
find test/ -type d \( -name "bin" -o -name "lib" \) -exec rm -rf {} + 2>/dev/null
echo "✅ Build dosyaları silindi"

# 2. Git history'den büyük dosyayı sil
echo "🗑️  Git history temizleniyor..."
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch hexdef_1911.tar" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Git garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive
echo "✅ Git temizlendi"

# 4. Sonuç
echo ""
echo "📊 Yeni boyutlar:"
echo "Toplam: $(du -sh /workspaces/hexdef | cut -f1)"
echo ".git: $(du -sh /workspaces/hexdef/.git | cut -f1)"

echo ""
echo "🎉 Temizlik tamamlandı! Artık push edebilirsiniz:"
echo "  git push origin main --force"