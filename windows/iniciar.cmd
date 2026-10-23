@echo off
rem Arranca (o reconstruye) la app con Docker Desktop y la abre en el navegador.
rem Doble clic. Usa el motor de Ace Stream instalado en Windows (ver docker-compose.native.yml).
setlocal
cd /d "%~dp0.."

if not exist .env (
  echo Creando .env: puerto 18080 y motor de Ace Stream de Windows.
  > .env echo WEB_PORT=18080
  >> .env echo COMPOSE_FILE=docker-compose.yml;docker-compose.native.yml
)
for /f "tokens=2 delims==" %%p in ('findstr /b "WEB_PORT=" .env') do set "PORT=%%p"
if not defined PORT set "PORT=8080"

if not exist data\catalog.json echo Aviso: falta data\catalog.json; la app arrancara sin canales.

docker info >nul 2>&1
if errorlevel 1 (
  echo Arrancando Docker Desktop...
  start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  for /l %%i in (1,1,60) do (
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1 && goto docker_ready
  )
  echo Docker Desktop no ha arrancado. Abrelo a mano y vuelve a ejecutar este script.
  pause
  exit /b 1
)
:docker_ready

docker compose up -d --build
if errorlevel 1 (
  echo No se pudo arrancar la app. Revisa el mensaje de arriba.
  pause
  exit /b 1
)

start "" "http://localhost:%PORT%"
