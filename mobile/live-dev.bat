@echo off
echo =================================================================
echo Starting SolarERP Mobile Live Hot-Reload Server...
echo =================================================================

set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
set "ANDROID_HOME=E:\AndroidDevTools\Sdk"
set "GRADLE_USER_HOME=E:\AndroidDevTools\.gradle"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

cd /d "E:\Solar Shop Mangement Software\SolarERP\mobile"

echo.
echo Scan the QR code below with Expo Go app on your phone!
echo.
call npx expo start
