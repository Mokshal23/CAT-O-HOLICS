@echo off
set "DEST_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Start_CAT_Study_Portal.vbs"

if exist "%DEST_VBS%" (
    del /f /q "%DEST_VBS%"
    echo Auto-start on boot has been removed successfully.
) else (
    echo Auto-start is not installed.
)
pause
