# ========================================================
# 1-Click GitHub / GitHub Pages Push Script
# ========================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  THE ABYSSAL CRYPTS 3D - GITHUB DEPLOYMENT" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script links your local game to your GitHub repository" -ForegroundColor Green
Write-Host "and pushes the code so GitHub Pages can host it 24/7 for free." -ForegroundColor Green
Write-Host ""

$repoUrl = Read-Host "Enter your GitHub repository URL (e.g. https://github.com/username/dungeon-game.git)"
if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "Error: Repository URL cannot be blank." -ForegroundColor Red
    exit 1
}

$existingRemote = git remote | Where-Object { $_ -eq "origin" }
if ($existingRemote) {
    git remote set-url origin $repoUrl
} else {
    git remote add origin $repoUrl
}

git branch -M main
Write-Host "Pushing code to GitHub main branch..." -ForegroundColor Yellow
git push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " SUCCESS! CODE PUSHED TO GITHUB!" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "To enable GitHub Pages in 10 seconds:" -ForegroundColor Cyan
    Write-Host "1. Go to your repository on GitHub.com" -ForegroundColor Yellow
    Write-Host "2. Click: Settings -> Pages" -ForegroundColor Yellow
    Write-Host "3. Under 'Build and deployment -> Source':" -ForegroundColor Yellow
    Write-Host "   Choose 'GitHub Actions' (Automatic deployment from .github/workflows)" -ForegroundColor Yellow
    Write-Host "   OR choose 'Deploy from a branch' -> Branch: main -> Folder: /docs" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Your 3D game is now online 24/7 even when your PC is turned off!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Push failed. Make sure you created the empty repository on GitHub first." -ForegroundColor Red
}
