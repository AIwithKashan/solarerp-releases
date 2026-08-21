@echo off
echo ========================================================
echo Upgrading project to Expo SDK 54 compatibility...
echo ========================================================
cd /d "E:\Solar Shop Mangement Software\SolarERP\mobile"

echo 1. Cleaning node_modules and package lock...
if exist node_modules (
    rmdir /s /q node_modules
)
if exist package-lock.json (
    del package-lock.json
)

echo 2. Installing Expo SDK 54 with legacy peer dependency resolution...
call npm install expo@^54.0.0 --legacy-peer-deps

echo 3. Automatically resolving all dependency versions for SDK 54...
call npx expo install --fix --legacy-peer-deps

echo 4. Verifying expo-font is installed...
call npx expo install expo-font --legacy-peer-deps

echo =======================================================
echo Upgrade Complete!
echo You can now use Expo Go to preview your app successfully.
echo Run: npx expo start --clear
echo =======================================================
pause
