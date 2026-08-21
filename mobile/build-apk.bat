@echo off
echo =================================================================
echo Rebuilding Native Android folder for Solar ERP...
echo =================================================================

set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
set "ANDROID_HOME=E:\AndroidDevTools\Sdk"
set "GRADLE_USER_HOME=E:\AndroidDevTools\.gradle"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

cd /d "E:\Solar Shop Mangement Software\SolarERP\mobile"

if not exist android (
    echo 1. Installing dependencies...
    call npm install --legacy-peer-deps

    echo 2. Generating fresh native architecture...
    call npx expo prebuild --platform android
)

if not exist android (
    echo.
    echo ERROR: Native android folder missing.
    pause
    exit /b
)

(echo sdk.dir=E\:\\AndroidDevTools\\Sdk)>android\local.properties

echo.
echo 3. Starting APK build process for Solar ERP Mobile App...
cd android
call gradlew.bat assembleDebug -x lint -x test

if %ERRORLEVEL% equ 0 (
    echo.
    echo =======================================================
    echo APK Build Successful!
    echo Copying APK to dist folder and Desktop...
    if not exist "E:\Solar Shop Mangement Software\SolarERP\dist" mkdir "E:\Solar Shop Mangement Software\SolarERP\dist"
    copy /y "app\build\outputs\apk\debug\app-debug.apk" "E:\Solar Shop Mangement Software\SolarERP\dist\SolarERP-Mobile.apk"
    copy /y "app\build\outputs\apk\debug\app-debug.apk" "%USERPROFILE%\Desktop\SolarERP-Mobile.apk"
    echo =======================================================
) else (
    echo.
    echo =======================================================
    echo APK Build Failed! Please check the Gradle error messages above.
    echo =======================================================
)
cd ..
