@echo off
rem Descarga la ultima version del codigo y reconstruye la app. Doble clic.
setlocal
cd /d "%~dp0.."

git pull --ff-only
if errorlevel 1 (
  echo No se pudo actualizar el codigo. Revisa el mensaje de arriba.
  pause
  exit /b 1
)

call "%~dp0iniciar.cmd"
