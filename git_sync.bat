@echo off
set /p commit_msg="Masukkan pesan commit: "

git pull
git add .
git commit -m "%commit_msg%"
git push origin main

echo ✅ Sinkronisasi selesai!
pause