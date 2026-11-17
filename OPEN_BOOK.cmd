@echo off
cd /d "%~dp0"
set "BOOK_NODE=D:\Program Files\nodejs\node.exe"
if not exist "%BOOK_NODE%" set "BOOK_NODE=node"
"%BOOK_NODE%" "%~dp0scripts\open-book.mjs"
if errorlevel 1 pause
