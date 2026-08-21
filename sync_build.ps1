$src = 'E:\Solar Shop Mangement Software\SolarERP\resources\app\.next\standalone'
$staticSrc = 'E:\Solar Shop Mangement Software\SolarERP\resources\app\.next\static'
$publicSrc = 'E:\Solar Shop Mangement Software\SolarERP\resources\app\public'
$distApp = 'E:\Solar Shop Mangement Software\SolarERP\dist\win-unpacked\resources\app'
$installedApp = 'C:\Users\Kashan Khan\AppData\Local\Programs\SolarERP\resources\app'

Write-Host "Syncing to dist/win-unpacked..."
Copy-Item -Path "$src\*" -Destination $distApp -Recurse -Force
New-Item -ItemType Directory -Path "$distApp\.next\static" -Force | Out-Null
Copy-Item -Path "$staticSrc\*" -Destination "$distApp\.next\static" -Recurse -Force
if (Test-Path $publicSrc) {
  Copy-Item -Path "$publicSrc\*" -Destination "$distApp\public" -Recurse -Force
}

Write-Host "Syncing to installed directory..."
Copy-Item -Path "$src\*" -Destination $installedApp -Recurse -Force
New-Item -ItemType Directory -Path "$installedApp\.next\static" -Force | Out-Null
Copy-Item -Path "$staticSrc\*" -Destination "$installedApp\.next\static" -Recurse -Force
if (Test-Path $publicSrc) {
  Copy-Item -Path "$publicSrc\*" -Destination "$installedApp\public" -Recurse -Force
}

Write-Host "All files synced successfully!"
