@echo off
cd /d "%~dp0"
set MADAR_DEMO=true
set DB_ENGINE=sqlite
set DB_PATH=data/demo.db
set LOCAL_BRANCH=
set PORT=3100
set MADAR_ADMIN_USERNAME=demo_admin
set MADAR_ADMIN_PASSWORD=Demo2026!
node scripts/start.mjs
pause
