@echo off
REM ============================================================================
REM SPECCON TAP BACKEND - Quick Replication Script
REM One-click exact copy of the Speccon_TAP_Ext codebase
REM ============================================================================
REM
REM Usage:
REM   Double-click this file, or run from command line:
REM     replicate-quick.bat [destination_path]
REM
REM   If no destination is provided, you will be prompted for one.
REM ============================================================================

title Speccon TAP Backend Replication

echo.
echo =====================================================================
echo   SPECCON TAP BACKEND CODEBASE - QUICK REPLICATION
echo =====================================================================
echo.

set "SOURCE=C:\ERP_System\Backend\April\17th\Speccon_TAP_Ext"

if "%~1"=="" (
    set /p "DEST=Enter destination path: "
) else (
    set "DEST=%~1"
)

if "%DEST%"=="" (
    echo ERROR: No destination path provided.
    pause
    exit /b 1
)

echo.
echo Source:      %SOURCE%
echo Destination: %DEST%
echo.
echo Press any key to start replication, or Ctrl+C to cancel...
pause >nul

powershell -ExecutionPolicy Bypass -File "%~dp0replicate-backend.ps1" -SourcePath "%SOURCE%" -DestinationPath "%DEST%"

echo.
if %ERRORLEVEL% EQU 0 (
    echo Replication completed successfully!
) else (
    echo Replication encountered errors. Check output above.
)

echo.
pause
