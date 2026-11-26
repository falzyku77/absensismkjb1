@echo off
cd /d "%~dp0"
echo Menghapus file tampilan lama (sudah dipindah ke folder per dashboard)...
for %%f in (index.html guru.html portal.html login.html sp.html ui.css ui.js kop-logo.png logo.jpg) do if exist "public\%%f" del "public\%%f"
echo Selesai.
pause
