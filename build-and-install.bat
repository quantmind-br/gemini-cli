@echo off
echo Cleaning node_modules...
if exist node_modules rmdir /s /q node_modules

echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    exit /b 1
)

echo Building project...
npm run build
if %errorlevel% neq 0 (
    echo Failed to build project
    exit /b 1
)

echo Installing globally...
npm install -g .
if %errorlevel% neq 0 (
    echo Failed to install globally
    exit /b 1
)

echo Build and install completed successfully!