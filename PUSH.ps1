# Pushes your first commit to GitHub.
# A browser window may open once to confirm your GitHub login — that is normal.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$RepoUrl = "https://github.com/Mandrakenah/portfolio.git"

Write-Host ""
Write-Host "Pointing this folder at $RepoUrl" -ForegroundColor Cyan

# set-url if a remote already exists, otherwise add it
$existing = git remote 2>$null
if ($existing -contains "origin") {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

Write-Host "Renaming branch to main..." -ForegroundColor Cyan
git branch -M main

Write-Host ""
Write-Host "Pushing. If a GitHub login window opens, sign in and come back." -ForegroundColor Yellow
Write-Host ""
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host " Pushed. Your code is now on GitHub:" -ForegroundColor Green
    Write-Host " https://github.com/Mandrakenah/portfolio" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host " Tell Claude it's pushed and it will do the Vercel deploy."
} else {
    Write-Host ""
    Write-Host "Push failed. Copy whatever error is above and send it to Claude." -ForegroundColor Red
}
Write-Host ""
