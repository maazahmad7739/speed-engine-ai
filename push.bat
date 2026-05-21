@echo off
echo ===================================================
echo SpeedEngine AI - Git Push Helper
echo ===================================================
echo.

:: Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in your PATH.
    echo Please install Git from https://git-scm.com/ and try again.
    pause
    exit /b 1
)

echo [1/4] Initializing Git repository...
git init

echo [2/4] Staging files...
git add .

echo [3/4] Committing files...
git commit -m "Configure Render deployment: multi-stage Dockerfile, health endpoints, auto-ping keep-awake"

echo [4/4] Setting remote and pushing to GitHub...
git remote remove origin >nul 2>nul
git remote add origin https://github.com/maazahmad7739/speed-engine-ai.git
git branch -M main

echo.
echo Pushing to GitHub... (you may be prompted for authentication)
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Code successfully pushed to GitHub!
    echo You can now go to Render and deploy your service using render.yaml.
) else (
    echo.
    echo [ERROR] Push failed. Make sure you have write permissions to the repository.
)

pause
