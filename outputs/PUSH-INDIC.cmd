@echo off
title Push completed CSduo indic repair
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0push-indic.ps1"
set "PUSH_EXIT=%ERRORLEVEL%"
echo.
if not "%PUSH_EXIT%"=="0" (
  echo Push did not complete. Use a GitHub connection authorized to write to CSduo/indic.
) else (
  echo Push completed. Follow ANTIGRAVITY-HANDOFF.md for Vercel preview and production verification.
)
pause
exit /b %PUSH_EXIT%
