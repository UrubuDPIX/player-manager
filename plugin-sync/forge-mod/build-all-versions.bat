@echo off
REM Build script for PlayerManager Sync - Multi-Version NeoForge/Forge mod
REM Builds for all supported Minecraft versions

echo.
echo ════════════════════════════════════════════════════════════════
echo  PlayerManager Sync - Multi-Version Build Script
echo  Target: NeoForge/Forge for MC 1.16.5 - 1.21.4
echo ════════════════════════════════════════════════════════════════
echo.

setlocal enabledelayedexpansion

REM Set Java home
set JAVA_HOME=C:\Users\Okairu\.jdk\jdk-21.0.10

REM Version list to build
set versions=1.21.1 1.21.0 1.20.6 1.20.4 1.20.1 1.19.4 1.19.2 1.18.2 1.16.5

REM Create build output directory
if not exist "build-output" mkdir build-output

REM Loop through each version
for %%v in (%versions%) do (
    echo.
    echo Building for Minecraft %%v...
    echo ════════════════════════════════════════════════════════════════
    
    call gradlew clean build "-PmcVersion=%%v"
    
    if !errorlevel! equ 0 (
        echo ✓ Build successful for MC %%v
        REM Copy JAR to output directory
        copy "build\libs\playermanagersync-neoforge-mc%%v-1.0.0.jar" "build-output\" >nul
    ) else (
        echo ✗ Build FAILED for MC %%v
    )
)

echo.
echo ════════════════════════════════════════════════════════════════
echo  Build Summary
echo ════════════════════════════════════════════════════════════════

dir /b "build-output\*.jar" 2>nul | find /v /c "" >nul && (
    echo Output directory: build-output\
    echo.
    dir /b "build-output\*.jar"
) || (
    echo No JARs found in build-output
)

echo.
echo ════════════════════════════════════════════════════════════════
echo  Build Complete
echo ════════════════════════════════════════════════════════════════
