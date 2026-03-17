#!/bin/bash

# Meminta input pesan commit dari user
echo "Masukkan pesan commit:"
read commit_msg

# Menjalankan perintah Git
git pull origin main
git add .
git commit -m "$commit_msg"
git push origin main

# Tags

echo ""
echo -n "Apakah push ini butuh tags? (y to confirm)"
read add_tag

if ["$add_tag" == "y"] || ["$add_tag" == "Y"]; then

    echo -n "Nama tag (vMAJOR.MINOR.FIXES):"
    read $tag_name
    echo - n "Deskripsi:"
    read $tag_desc

    git tag -a "$tag_name" -m "$tag_desc"
    git push origin "$tag_name"
    echo "Tag $tag_name berhasil di-push!✅"
fi

echo "✅ Sinkronisasi selesai!"
