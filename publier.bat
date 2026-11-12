@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  === Publication du site Creative Studio ===
echo.
git add .
git commit -m "Mise a jour du site"
git pull origin main --no-edit
git push origin main
echo.
echo  Termine. Vercel met le site a jour dans environ 30 secondes.
echo.
pause
