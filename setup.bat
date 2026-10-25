@echo off
echo === FinanceTracker Setup ===
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js chua duoc cai dat!
    echo.
    echo Vui long cai Node.js tai: https://nodejs.org/
    echo Chon phien ban LTS (Long Term Support)
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js da san sang
echo.

:: Install server deps
echo [1/4] Cai dat packages cho backend...
cd /d "%~dp0server"
call npm install
if errorlevel 1 goto error

:: Install client deps  
echo [2/4] Cai dat packages cho frontend...
cd /d "%~dp0client"
call npm install
if errorlevel 1 goto error

echo.
echo === Cai dat hoan tat! ===
echo.
echo De chay ung dung, mo 2 cua so Command Prompt va chay:
echo.
echo  [Terminal 1 - Backend]:
echo  cd "%~dp0server"
echo  npm run dev
echo.
echo  [Terminal 2 - Frontend]:
echo  cd "%~dp0client"
echo  npm run dev
echo.
echo  Sau do mo trinh duyet tai: http://localhost:5173
echo.
pause
goto end

:error
echo [!] Co loi xay ra trong qua trinh cai dat!
pause

:end
