# Commits whatever changed locally and pushes it. Vercel redeploys automatically.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Files removed upstream that a plain sync cannot delete for you.
$stale = @("web\src\components\lab\PredictorDemo.tsx")
foreach ($f in $stale) {
    if (Test-Path $f) { Remove-Item -Force $f; Write-Host "removed stale $f" -ForegroundColor DarkGray }
}

Write-Host ""
Write-Host "Committing and pushing..." -ForegroundColor Cyan
git add -A
git commit -m "Update portfolio content and retrained models" 2>&1 | Out-Null
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host " Pushed. Vercel is rebuilding now - live in ~1 minute at" -ForegroundColor Green
    Write-Host " https://portfolio-omega-mauve-88.vercel.app" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Push failed. Send Claude whatever error is above." -ForegroundColor Red
}
Write-Host ""
