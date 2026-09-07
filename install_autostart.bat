@echo off
set "TARGET_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SOURCE_VBS=%~dp0launch_silent.vbs"
set "DEST_VBS=%TARGET_DIR%\Start_CAT_Study_Portal.vbs"

echo Setting up auto-start on Windows boot...
copy /y "%SOURCE_VBS%" "%DEST_VBS%" >nul

if %errorlevel% equ 0 (
    echo ========================================================
    echo  SUCCESS: CAT Study Portal will now auto-start on boot!
    echo  Startup file created at:
    echo  "%DEST_VBS%"
    echo ========================================================
) else (
    echo Failed to install auto-start.
)
pause
