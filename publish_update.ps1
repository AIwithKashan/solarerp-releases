# SolarERP One-Click Update Publisher
# Usage: .\publish_update.ps1 -Version "2.0.2" -Changelog "Bug fixes and new features"

param(
    [string]$Version = "2.0.2",
    [string]$Changelog = "Performance improvements and bug fixes"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SolarERP Update Packaging & Release  " -ForegroundColor Cyan
Write-Host "  Target Version: v$Version            " -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

$AppDir = "E:\Solar Shop Mangement Software\SolarERP\resources\app"
$DistDir = "E:\Solar Shop Mangement Software\SolarERP\dist"
$ISCCPath = "C:\Users\Kashan Khan\AppData\Local\Programs\Inno Setup 6\ISCC.exe"

# 1. Build Next.js App
Write-Host "`n[1/4] Building Next.js Production App..." -ForegroundColor Green
Set-Location $AppDir
npx next build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting release." -ForegroundColor Red
    exit 1
}

# 2. Sync to dist win-unpacked
Write-Host "`n[2/4] Syncing to Electron Dist Directory..." -ForegroundColor Green
robocopy "E:\Solar Shop Mangement Software\SolarERP\resources\app" "$DistDir\win-unpacked\resources\app" /E /XD node_modules .git /XF dev.db backup-config.json
if ($LASTEXITCODE -gt 7) {
    Write-Host "Sync failed!" -ForegroundColor Red
    exit 1
}

# 3. Compile Installer with Inno Setup
Write-Host "`n[3/4] Compiling Standalone Installer (SolarERP-Setup.exe)..." -ForegroundColor Green
& "$ISCCPath" "E:\Solar Shop Mangement Software\SolarERP\build_trial_installer.iss"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Inno Setup compilation failed!" -ForegroundColor Red
    exit 1
}

# Copy to Desktop
Copy-Item "$DistDir\SolarERP-Setup.exe" -Destination "C:\Users\Kashan Khan\Desktop\SolarERP-Setup.exe" -Force

# 4. Generate version.json manifest
Write-Host "`n[4/4] Updating version.json manifest..." -ForegroundColor Green
$DateStr = Get-Date -Format "yyyy-MM-dd"
$Manifest = @{
    version = $Version
    releaseDate = $DateStr
    downloadUrl = "https://github.com/aiwithkashan/solarerp-releases/releases/download/v$Version/SolarERP-Setup.exe"
    changelog = @($Changelog -split ";")
} | ConvertTo-Json -Depth 5

Set-Content -Path "E:\Solar Shop Mangement Software\SolarERP\version.json" -Value $Manifest

Write-Host "`nSUCCESS! SolarERP v$Version has been built and packaged." -ForegroundColor Green
Write-Host "Installer: C:\Users\Kashan Khan\Desktop\SolarERP-Setup.exe" -ForegroundColor Cyan
Write-Host "Manifest:  E:\Solar Shop Mangement Software\SolarERP\version.json" -ForegroundColor Cyan
