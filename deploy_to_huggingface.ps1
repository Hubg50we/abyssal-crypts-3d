# ========================================================
# 1-Click Hugging Face Spaces 24/7 Cloud Deployment Script
# ========================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  THE ABYSSAL CRYPTS 3D - 24/7 CLOUD DEPLOYMENT" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will push your game directly to Hugging Face Spaces" -ForegroundColor Green
Write-Host "so it stays ONLINE 24/7 even after your computer is shut down." -ForegroundColor Green
Write-Host ""

$hfUsername = Read-Host "Enter your Hugging Face username (e.g. johndoe)"
if ([string]::IsNullOrWhiteSpace($hfUsername)) {
    Write-Host "Error: Username cannot be blank." -ForegroundColor Red
    exit 1
}

$spaceName = Read-Host "Enter your Space name (e.g. abyssal-crypts-3d)"
if ([string]::IsNullOrWhiteSpace($spaceName)) {
    Write-Host "Error: Space name cannot be blank." -ForegroundColor Red
    exit 1
}

$spaceUrl = "https://huggingface.co/spaces/$hfUsername/$spaceName"

Write-Host ""
Write-Host "Target Remote: $spaceUrl" -ForegroundColor Cyan
Write-Host ""

# Check existing remote
$existingRemote = git remote | Where-Object { $_ -eq "space" }
if ($existingRemote) {
    git remote set-url space $spaceUrl
} else {
    git remote add space $spaceUrl
}

Write-Host "Pushing game code to Hugging Face..." -ForegroundColor Yellow
Write-Host "Note: When prompted for password, enter your Hugging Face User Access Token (read/write)." -ForegroundColor DarkGray
Write-Host "      Get your token at: https://huggingface.co/settings/tokens" -ForegroundColor DarkGray
Write-Host ""

git push space main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " SUCCESS! DEPLOYMENT INITIATED!" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Hugging Face is building your 24/7 game container now."
    Write-Host ""
    Write-Host "Live Space Dashboard: https://huggingface.co/spaces/$hfUsername/$spaceName" -ForegroundColor Cyan
    Write-Host "Direct Permanent Game URL: https://$hfUsername-$spaceName.hf.space" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Your game will now run 24/7 even when your PC is turned off!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Push failed. Make sure:" -ForegroundColor Red
    Write-Host "1. You created the space at https://huggingface.co/new-space (SDK: Docker -> Blank)" -ForegroundColor Yellow
    Write-Host "2. You used a Hugging Face Access Token with WRITE permissions as your password" -ForegroundColor Yellow
}
