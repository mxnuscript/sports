@echo off
cd /d "%~dp0"
echo Edge - local Oregon workspace
echo Keep this window open. Open http://localhost:3000 after the server starts.
echo Press Ctrl+C to stop the app.
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS from https://nodejs.org/ first.
  pause
  exit /b 1
)
powershell.exe -NoProfile -Command "if (-not $env:ODDS_API_KEY) { $key = Read-Host 'Enter your Odds API key' -AsSecureString; $env:ODDS_API_KEY = [System.Net.NetworkCredential]::new('', $key).Password }; if (-not $env:EDGE_AI_KEY) { $ai = Read-Host 'Optional OpenAI API key for Ask AI (Enter to skip)' -AsSecureString; if ($ai.Length -gt 0) { $env:EDGE_AI_KEY = [System.Net.NetworkCredential]::new('', $ai).Password } }; & node --use-env-proxy server.mjs; exit $LASTEXITCODE"
pause
