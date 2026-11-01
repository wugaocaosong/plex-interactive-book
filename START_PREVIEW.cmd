@echo off
cd /d "%~dp0"
node scripts/serve-dist.mjs %*
if errorlevel 1 pause
