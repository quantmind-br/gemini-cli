@echo off
echo Cleaning node_modules and package-lock.json...

if exist node_modules (
    echo Deleting node_modules...
    rmdir /s /q node_modules
    echo node_modules deleted.
) else (
    echo node_modules not found.
)

if exist package-lock.json (
    echo Deleting package-lock.json...
    del package-lock.json
    echo package-lock.json deleted.
) else (
    echo package-lock.json not found.
)

echo Cleanup complete!
pause