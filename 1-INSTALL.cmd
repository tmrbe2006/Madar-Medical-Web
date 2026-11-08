@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 24 or later, then reopen this file.
 pause
 exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 (
 echo This version requires Node.js 24 or later.
 pause
 exit /b 1
)
call npm.cmd ci --omit=dev --no-audit --no-fund
if errorlevel 1 (
 echo Installation failed. Check your internet connection and retry.
 pause
 exit /b 1
)
echo Installation complete. Use 2-START.cmd to open Madar Medical.
pause
