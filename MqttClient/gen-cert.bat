@echo off
setlocal enabledelayedexpansion

set SSH_KEY=C:\Users\b.stockhamer\Downloads\ssh-key-2026-03-25.key
set SERVER=ubuntu@130.61.140.154
set REMOTE_SCRIPT=/etc/mosquitto/certs/gen-device-cert.sh
set SCRIPT_DIR=%~dp0
set LOCAL_CERTS=%SCRIPT_DIR%certs

echo ============================================
echo   IoT Zertifikat Generator
echo ============================================
echo.

set /p DEVICE_NAME="Geraete-Name eingeben (z.B. esp32-wohnzimmer): "

if "%DEVICE_NAME%"=="" (
    echo FEHLER: Kein Name eingegeben!
    pause
    exit /b 1
)

set REMOTE_TMP=/tmp/cert-%DEVICE_NAME%
set LOCAL_DIR=%LOCAL_CERTS%\%DEVICE_NAME%

echo.
echo [1/3] Generiere Zertifikat fuer "%DEVICE_NAME%" auf dem Server...
ssh -i "%SSH_KEY%" %SERVER% "sudo %REMOTE_SCRIPT% %DEVICE_NAME% %REMOTE_TMP%"
if !errorlevel! neq 0 (
    echo FEHLER: Zertifikat konnte nicht generiert werden!
    pause
    exit /b 1
)

echo.
echo [2/3] Kopiere Zertifikate...
if not exist "%LOCAL_DIR%" mkdir "%LOCAL_DIR%"

scp -i "%SSH_KEY%" "%SERVER%:%REMOTE_TMP%/%DEVICE_NAME%.crt" "%LOCAL_DIR%\%DEVICE_NAME%.crt"
scp -i "%SSH_KEY%" "%SERVER%:%REMOTE_TMP%/%DEVICE_NAME%.key" "%LOCAL_DIR%\%DEVICE_NAME%.key"
scp -i "%SSH_KEY%" "%SERVER%:%REMOTE_TMP%/ca.crt" "%LOCAL_DIR%\ca.crt"

echo.
echo [3/3] Raeume Server auf...
ssh -i "%SSH_KEY%" %SERVER% "sudo rm -rf %REMOTE_TMP%"

echo.
echo Pruefe Dateien...
set OK=1
if not exist "%LOCAL_DIR%\%DEVICE_NAME%.crt" (
    echo FEHLER: %DEVICE_NAME%.crt fehlt!
    set OK=0
)
if not exist "%LOCAL_DIR%\%DEVICE_NAME%.key" (
    echo FEHLER: %DEVICE_NAME%.key fehlt!
    set OK=0
)
if not exist "%LOCAL_DIR%\ca.crt" (
    echo FEHLER: ca.crt fehlt!
    set OK=0
)

if "!OK!"=="1" (
    echo.
    echo ============================================
    echo   Fertig! Dateien liegen in:
    echo   %LOCAL_DIR%\
    echo.
    echo   %DEVICE_NAME%.crt  - Client-Zertifikat
    echo   %DEVICE_NAME%.key  - Privater Schluessel
    echo   ca.crt             - CA-Zertifikat
    echo ============================================
) else (
    echo.
    echo FEHLER: Nicht alle Dateien konnten kopiert werden!
)
echo.
pause
