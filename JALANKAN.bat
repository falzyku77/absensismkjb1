@echo off
setlocal
title Absensi Kehadiran Siswa - SMK Jakarta Barat 1
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode

if not exist "node_modules\express\package.json" (
  echo Pertama kali dijalankan: memasang paket yang dibutuhkan.
  echo Butuh internet dan hanya sekali. Mohon tunggu...
  call npm install --omit=dev --no-audit --no-fund
  if errorlevel 1 goto gagal
)

echo.
echo Menjalankan server Absensi Kehadiran. Browser akan terbuka otomatis.
echo Tutup jendela ini untuk menghentikan server.
echo.
start "" /b cmd /c "ping -n 5 127.0.0.1 >nul & start http://localhost:3000"
node server.js
echo.
echo Server berhenti.
pause
exit /b 0

:nonode
echo Node.js belum terpasang di komputer ini.
echo Unduh versi LTS dari https://nodejs.org lalu pasang, kemudian klik 2x file ini lagi.
pause
exit /b 1

:gagal
echo Gagal memasang paket. Pastikan komputer terhubung ke internet lalu coba lagi.
pause
exit /b 1
