#!/bin/bash

# Mevcut extension'ı kaldır
echo "Mevcut extension kaldırılıyor..."
code --uninstall-extension undefined_publisher.hexdef

# Kodu derle
echo "Kod derleniyor..."
npm run compile

# Extension paketini oluştur
echo "Extension paketi oluşturuluyor..."
vsce package --allow-missing-repository --no-yarn

# Yeni extension'ı yükle
echo "Yeni extension yükleniyor..."
code --install-extension hexarch-0.0.1.vsix

echo "İşlem tamamlandı! Extension hazır."
