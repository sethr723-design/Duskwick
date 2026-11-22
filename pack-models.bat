@echo off
title Duskwick model packer
cd /d "%~dp0"
if exist "C:\Program Files\nodejs\node.exe" (
  "C:\Program Files\nodejs\node.exe" tools\pack-models.js
) else (
  node tools\pack-models.js
)
pause
