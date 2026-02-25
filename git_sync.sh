#!/bin/bash

# Meminta input pesan commit dari user
echo "Masukkan pesan commit:"
read commit_msg

# Menjalankan perintah Git
git add .
git commit -m "$commit_msg"
git push origin main

echo "✅ Sinkronisasi selesai!"