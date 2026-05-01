@echo off
title Warhammer 40k - Launcher
set NODE_PATH=C:\Program Files\nodejs
set PROJECT_DIR=C:\Developpeur\warhammer40k
set SHORTCUT=%USERPROFILE%\Desktop\Warhammer 40k.lnk

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%SHORTCUT%'); " ^
  "$s.TargetPath = 'wscript.exe'; " ^
  "$s.Arguments = '\"%PROJECT_DIR%\launch.vbs\"'; " ^
  "$s.WorkingDirectory = '%PROJECT_DIR%'; " ^
  "$s.Description = 'Warhammer 40k App'; " ^
  "$s.Save()"
echo Raccourci Bureau cree.
echo Starting Warhammer 40k (fenetres cachees)...
wscript.exe "%PROJECT_DIR%\launch.vbs"
