@echo off
cd /d "%~dp0"
if not exist node_modules\express (
 echo Run 1-INSTALL.cmd first.
 pause
 exit /b 1
)
set NODE_ENV=production
set MADAR_OPEN_BROWSER=1
call npm.cmd start
pause
