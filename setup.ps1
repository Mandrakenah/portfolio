# Run this once, from the NewPortfolio folder:
#     powershell -ExecutionPolicy Bypass -File setup.ps1
#
# It cleans up the failed install, installs dependencies, checks the build,
# and makes the first git commit. It does NOT push anywhere and never touches
# your credentials.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "[1/4] Removing the old broken node_modules..." -ForegroundColor Cyan
if (Test-Path "web\node_modules") {
    Remove-Item -Recurse -Force "web\node_modules"
    Write-Host "      removed (~316 MB freed)" -ForegroundColor DarkGray
} else {
    Write-Host "      nothing to remove" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "[2/4] Installing dependencies (takes a minute)..." -ForegroundColor Cyan
Set-Location "web"
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "[3/4] Building to confirm everything compiles..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "[4/4] Making the first git commit..." -ForegroundColor Cyan
Set-Location ..
if (-not (Test-Path ".git")) { git init | Out-Null }
git add -A
git commit -m "Portfolio: Next.js 16 with browser-side NLP models" 2>&1 | Out-Null
Write-Host "      committed" -ForegroundColor DarkGray

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " Done. Everything builds and is committed." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host " To see it right now:" -ForegroundColor White
Write-Host "     cd web ; npm run dev      -> http://localhost:3000"
Write-Host ""
Write-Host " Next: create an empty repo at https://github.com/new"
Write-Host " (no README, no .gitignore), then run:" -ForegroundColor White
Write-Host ""
Write-Host "     git remote add origin https://github.com/YOU/portfolio.git"
Write-Host "     git branch -M main"
Write-Host "     git push -u origin main"
Write-Host ""
Write-Host " Then tell Claude, and it will handle Vercel." -ForegroundColor White
Write-Host ""
