@echo off
rem Arranca (o reconstruye) la app con Docker Desktop y la abre en el navegador. Doble clic.
rem Si Ace Stream para Windows esta abierto (puerto 6878), usa ese motor; si no, el de Docker.
setlocal
cd /d "%~dp0.."

rem Puerto: el de .env o, la primera vez, 8080 si esta libre y 18080 si no.
if not exist .env (
  netstat -ano | findstr /r /c:":8080 .*LISTENING" >nul
  if errorlevel 1 (> .env echo WEB_PORT=8080) else (> .env echo WEB_PORT=18080)
)
for /f "tokens=2 delims==" %%p in ('findstr /b "WEB_PORT=" .env') do set "PORT=%%p"
if not defined PORT set "PORT=8080"

if not exist data\catalog.json echo Aviso: falta data\catalog.json; la app arrancara sin canales.

docker info >nul 2>&1
if not errorlevel 1 goto docker_ready
echo Arrancando Docker Desktop...
set "DOCKER_EXE=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
if not exist "%DOCKER_EXE%" set "DOCKER_EXE=%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
if not exist "%DOCKER_EXE%" (
  echo No se encuentra Docker Desktop. Abrelo a mano y vuelve a ejecutar este script.
  pause
  exit /b 1
)
start "" "%DOCKER_EXE%"
for /l %%i in (1,1,60) do (
  timeout /t 3 /nobreak >nul
  docker info >nul 2>&1 && goto docker_ready
)
echo Docker Desktop no ha arrancado. Abrelo a mano y vuelve a ejecutar este script.
pause
exit /b 1
:docker_ready

rem Elige el motor. COMPOSE_FILE en el entorno tiene prioridad sobre el de .env.
curl -s -m 3 -o nul "http://127.0.0.1:6878/webui/api/service?method=get_version&format=json"
if errorlevel 1 (
  echo Motor: el de Docker ^(Ace Stream para Windows no esta abierto^).
  set "COMPOSE_FILE=docker-compose.yml"
) else (
  echo Motor: Ace Stream para Windows.
  set "COMPOSE_FILE=docker-compose.yml;docker-compose.native.yml"
  rem Si antes se uso el motor de Docker, se para para no tener dos motores.
  docker compose -f docker-compose.yml rm -sf acestream >nul 2>&1
)

docker compose up -d --build
if errorlevel 1 (
  echo No se pudo arrancar la app. Revisa el mensaje de arriba.
  pause
  exit /b 1
)

start "" "http://localhost:%PORT%"
