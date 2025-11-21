# Geçici dizin oluştur
mkdir -p /tmp/vsce_minimal
cd /tmp/vsce_minimal

# VSCE'yi kur
npm install @vscode/vsce --legacy-peer-deps --no-save

# Paketi oluştur
cd ..
tar -czf vsce_minimal_$(date +%Y%m%d).tar.gz vsce_minimal/

# Workspace'e taşı
mv vsce_minimal_*.tar.gz /workspaces/hexdef/

# Boyut göster
ls -lh /workspaces/hexdef/vsce_*.tar.gz

echo "✅ Minimal VSCE paketi hazır!"