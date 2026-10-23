# Acestream Player

Aplicación web personal para guardar, organizar y reproducir links de Acestream (`acestream://<id>` o
IDs sueltos) desde el navegador, contra un motor de Acestream en tu servidor casero o en tu propio ordenador.

¿Quieres instalarla en tu PC con Windows? Ve directo a
[Instalación en tu ordenador (Windows)](#instalación-en-tu-ordenador-windows).

Sin usuarios, sin backend y sin base de datos: la lista se guarda en el `localStorage` del navegador.

## Cómo funciona

```
 Navegador ──► http://HOST:8080 ──► nginx (contenedor "web")
                                     ├── /                  → SPA (React)
                                     ├── /ace/…             → motor Acestream :6878 (sin buffering)
                                     └── /webui/api/service → motor (solo para el indicador de estado)

 Motor Acestream (contenedor "acestream"): solo accesible dentro de la red de Docker.
```

Todo se sirve desde el **mismo origen**, así que no hay problemas de CORS ni de mixed content, y el
motor no se publica fuera de Docker. El reproductor usa HLS
(`/ace/manifest.m3u8?id=…`) con [hls.js](https://github.com/video-dev/hls.js), y HLS nativo en Safari/iOS.

### Imagen del motor

Se usa [`ghcr.io/martinbjeldbak/acestream-http-proxy`](https://github.com/martinbjeldbak/acestream-http-proxy):

- Empaqueta el motor oficial de Acestream para Linux (versión 3.2.11 en el momento de escribir esto)
  con su API HTTP en el puerto 6878, incluidos `/ace/manifest.m3u8` y `/ace/getstream`.
- Está mantenida: commits y actualizaciones de dependencias frecuentes, y no está archivada.
- Es sencilla: un único contenedor, sin configuración más allá de `ALLOW_REMOTE_ACCESS`.

Se comprobó que la imagen existe en GHCR y se probó en local: responde la API de versión y
devuelve `500 failed to load content` ante un ID inexistente.

> ⚠️ La imagen solo está publicada para **amd64**: no funciona en Raspberry Pi ni en otros servidores ARM.

## Instalación solo con Docker

La forma más corta: no hace falta descargar el código ni instalar Ace Stream. Necesitas Docker (en
Windows y macOS, Docker Desktop) en un equipo **x86-64**, porque el motor solo existe para amd64.

```bash
mkdir acestream-player && cd acestream-player
curl -fsSLO https://raw.githubusercontent.com/unaibermudez/acestream-player/main/deploy/docker-compose.yml
docker compose up -d
```

La app queda en `http://localhost:8080`. Usa la imagen `ghcr.io/unaibermudez/acestream-player`, que
GitHub Actions publica en cada cambio, y la del motor.

- **Catálogo (opcional):** deja tu archivo en `data/catalog.json`, junto al `docker-compose.yml`.
- **Otro puerto:** crea un `.env` con `WEB_PORT=9000` y vuelve a ejecutar `docker compose up -d`.
- **Actualizar:** `docker compose pull && docker compose up -d`.
- **Quitarla:** `docker compose down --rmi all`.

## Requisitos del servidor

Para un servidor Linux con el motor en Docker. Para un PC con Windows, ver
[Instalación en tu ordenador](#instalación-en-tu-ordenador-windows).

- Un servidor **x86-64** (amd64) con Linux, por ejemplo Ubuntu Server.
- Docker Engine con el plugin Compose v2 (`docker compose version`).
- Unos 2 GB de disco libres para la imagen del motor y su caché (la imagen limita la caché a 1 GB).

Para desarrollo: Node.js 22 o superior (probado con 24).

## Arranque rápido

```bash
git clone https://github.com/unaibermudez/acestream-player.git
cd acestream-player
cp /ruta/a/tu/catalogo.json data/catalog.json   # opcional: canales para todos los dispositivos
docker compose up -d --build
```

La app queda en `http://HOST:8080`. Para el despliegue completo en el servidor, ver
[Despliegue en un servidor Ubuntu](#despliegue-en-un-servidor-ubuntu).

Comandos útiles:

```bash
docker compose ps                  # estado de los contenedores (ambos tienen healthcheck)
docker compose logs -f acestream   # logs del motor
docker compose pull acestream && docker compose up -d   # actualizar el motor
docker compose up -d --build web   # reconstruir la app tras cambiar el código
docker compose down                # parar todo
```

### Cambiar el puerto

Solo se publica un puerto: el de nginx. Para cambiarlo, crea un `.env` junto al
`docker-compose.yml`:

```bash
cp .env.example .env
# edita WEB_PORT=9000
docker compose up -d
```

Para una prueba puntual también vale `WEB_PORT=9000 docker compose up -d`.

## Instalación en tu ordenador (Windows)

Para tenerla en tu propio PC o portátil, sin servidor aparte, con un doble clic para arrancarla y
actualizarla. La app corre en Docker Desktop. Si tienes Ace Stream para Windows abierto, usa ese motor;
si no, el que va dentro de Docker. Una vez instalada, el uso diario es abrir una página en el navegador.

Si no quieres scripts ni código, la [instalación solo con Docker](#instalación-solo-con-docker) también
vale en Windows.

### Requisitos

| Qué                                                               | Para qué                                     | Notas                                                                                                            |
| ----------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Windows 10 (22H2) u 11, 64 bits (x64)                             | Sistema                                      | Con la virtualización activada en la BIOS/UEFI; Docker Desktop la necesita para WSL 2                            |
| 8 GB de RAM y unos 5 GB de disco libres                           | Docker Desktop, el motor y la caché de vídeo | Con 4 GB funciona, pero justo                                                                                    |
| [Ace Stream Media para Windows](https://www.acestream.org/)       | El motor que descarga los streams            | Opcional: sin él se usa el motor de Docker. Si lo usas, debe escuchar en el puerto 6878 (lo hace por defecto)    |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Servir la app                                | Gratuito para uso personal. Instala WSL 2 si hace falta                                                          |
| [Git para Windows](https://git-scm.com/download/win)              | Descargar y actualizar el código             | Opcional: también vale descargar el ZIP desde GitHub, pero entonces `actualizar.cmd` no sirve                    |
| Un catálogo de canales propio (JSON)                              | La pantalla de canales                       | Opcional. La app no trae ninguno; ver [Catálogo de canales](#catálogo-de-canales). Sin él, se usan links sueltos |
| Chrome, Edge, Firefox o Safari recientes                          | Ver la app                                   |                                                                                                                  |

### Pasos (una sola vez)

1. **(Opcional) Instala Ace Stream** y ábrelo. Comprueba que el motor responde abriendo
   <http://localhost:6878/webui/api/service?method=get_version&format=json> en el navegador: debe
   mostrar un JSON con `"version"`.
2. **Instala Docker Desktop.** Al terminar, ábrelo, acepta las condiciones y, en
   _Settings → General_, activa **Start Docker Desktop when you sign in** para que la app se levante
   sola al encender el equipo.
3. **Descarga el código.** Con Git, en una terminal (PowerShell o Git Bash):

   ```powershell
   cd $HOME
   git clone https://github.com/unaibermudez/acestream-player.git
   ```

   Sin Git: botón _Code → Download ZIP_ en GitHub y descomprímelo donde quieras.

4. **Copia tu catálogo** (si tienes uno) a `acestream-player\data\catalog.json`.
5. **Arranca la app:** doble clic en `acestream-player\windows\iniciar.cmd`. El script:
   - crea el archivo `.env` con el puerto: 8080, o 18080 si el 8080 está ocupado,
   - arranca Docker Desktop si no está abierto,
   - usa Ace Stream para Windows si está abierto y, si no, el motor de Docker,
   - construye la app (la primera vez tarda unos minutos; las siguientes, segundos),
   - y la abre en el navegador (`http://localhost:8080` o `:18080`).

   Si Windows muestra un aviso de SmartScreen o del firewall, permite el acceso.

6. **Guarda la página** en marcadores o instálala como app desde el icono de la barra de direcciones
   de Chrome o Edge.

### Uso diario

Enciende el equipo y abre el marcador. Docker Desktop arranca con Windows y los contenedores se
levantan solos (`restart: unless-stopped`) con el motor que se eligió la última vez. Si la página no
carga justo después de encender, espera medio minuto y recarga, o haz doble clic en
`windows\iniciar.cmd`. Si usas Ace Stream para Windows, tiene que estar abierto.

- **Actualizar a la última versión:** doble clic en `windows\actualizar.cmd` (`git pull` y
  reconstrucción). Tu lista de links y tus favoritos no se pierden: viven en el navegador.
- **Cambiar el catálogo:** sustituye `data\catalog.json` y recarga la página.
- **Usarla desde el móvil en casa:** ver [Acceso desde el móvil](#acceso-desde-el-móvil-en-tu-red-local),
  con la IP del ordenador (`ipconfig`) y el puerto de la app. Windows pedirá permiso en el firewall.
- **Pararla:** `docker compose down` en la carpeta del proyecto. Vuelve con `windows\iniciar.cmd`.
- **Desinstalarla:** `docker compose down --rmi local` y borra la carpeta. Exporta antes tu lista
  desde _Mis links → Exportar_ si quieres conservarla.

### Cómo funciona por dentro

- `.env` solo guarda el puerto (`WEB_PORT`). Cámbialo si lo prefieres y vuelve a ejecutar
  `iniciar.cmd`.
- Para elegir el motor, `iniciar.cmd` consulta `http://127.0.0.1:6878`. Si responde Ace Stream para
  Windows, arranca con `docker-compose.native.yml`, que desactiva el contenedor `acestream` y apunta
  nginx a `http://host.docker.internal:6878` (y para el contenedor del motor si existía, para no tener
  dos motores). Si no responde, usa solo `docker-compose.yml`, con el motor en Docker.
- Para forzar una opción a mano: `docker compose up -d` (motor en Docker) o
  `docker compose -f docker-compose.yml -f docker-compose.native.yml up -d` (motor de Windows).

### Otros sistemas

- **Linux x86-64:** no hace falta el motor nativo; sigue el [Arranque rápido](#arranque-rápido), que
  usa el motor en Docker.
- **macOS:** no hay motor nativo oficial de Ace Stream y la imagen del motor es solo amd64. En Mac con
  Intel debería funcionar el arranque rápido; en Apple Silicon iría emulado. No está probado.
- **Windows en ARM:** no probado.

## Despliegue en un servidor Ubuntu

Probado en local; los pasos son para un Ubuntu Server x86-64 (22.04 o posterior).

**1. Docker y Compose**

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # cierra sesión y vuelve a entrar para aplicarlo
docker compose version          # debe mostrar Compose v2
```

**2. Código**

```bash
git clone https://github.com/unaibermudez/acestream-player.git ~/acestream-player
cd ~/acestream-player
```

**3. Configuración y catálogo**

```bash
cp .env.example .env                       # cambia WEB_PORT si 8080 está ocupado
scp catalogo.json servidor:~/acestream-player/data/catalog.json   # desde tu PC
```

**4. Arrancar**

```bash
docker compose up -d --build
docker compose ps        # acestream y web deben acabar en «healthy»
```

**5. Red**

```bash
sudo ufw allow 8080/tcp  # o el puerto de WEB_PORT
hostname -I              # IP del servidor
```

Reserva esa IP en el DHCP del router para que no cambie. **No redirijas el puerto en el router**: la
app no tiene autenticación. Para usarla fuera de casa, mejor una VPN como Tailscale.

**Actualizar**

```bash
cd ~/acestream-player
git pull && docker compose up -d --build     # nueva versión de la app
docker compose pull acestream && docker compose up -d   # nueva versión del motor
```

El catálogo se actualiza sustituyendo `data/catalog.json`: no hace falta reiniciar nada.

## Acceso desde el móvil en tu red local

1. Averigua la IP del servidor: `hostname -I` (por ejemplo, `192.168.1.50`).
2. Si usas `ufw`, abre el puerto: `sudo ufw allow 8080/tcp`.
3. Desde el móvil, conectado a la misma Wi-Fi, abre `http://192.168.1.50:8080`.
4. Para tenerla como app:
   - **Android (Chrome):** menú ⋮ → _Añadir a pantalla de inicio_.
   - **iPhone (Safari):** botón Compartir → _Añadir a pantalla de inicio_.

Con HTTP plano, Chrome crea un acceso directo en lugar de una PWA "instalada", porque la instalación
completa exige HTTPS. Funciona igual. Para la PWA completa, sírvela con HTTPS (ver más abajo).

Una IP fija para el servidor (reserva DHCP en el router) evita que el acceso directo deje de funcionar.

## Uso

- **Añadir:** admite `acestream://ID`, un ID suelto de 40 caracteres hexadecimales, URLs del motor
  (`http://…/ace/getstream?id=…`) o varias líneas a la vez, opcionalmente con el formato `Nombre | link`.
  Las líneas con `#` se ignoran. Los duplicados se detectan, y las líneas erróneas se quedan en el cuadro
  con su motivo para que puedas corregirlas.
- **Lista:** nombre y etiquetas editables (lápiz), favorito (estrella), último uso y borrar (con
  **Deshacer** en el aviso, sin confirmaciones). Búsqueda
  sin distinguir tildes ni mayúsculas, y filtros por etiqueta y por favoritos.
- **Reproductor:** muestra el estado de carga con los segundos transcurridos. Si en 90 s el stream no
  ha arrancado, aparece un error claro con botón **Reintentar**. También incluye pantalla completa y los
  botones para copiar la URL `getstream` (para VLC/mpv) y el link `acestream://`.
- **Atajos (escritorio):** `/` enfoca la búsqueda y `Esc` cierra el reproductor.
- **Importar/Exportar** (cabecera): exporta toda la lista en JSON. Importa ese mismo JSON, listas
  **M3U/M3U8** (usa el título de `#EXTINF` como nombre y `group-title` como etiqueta) o texto con un link
  por línea. El formato se detecta por el contenido.
- **Canales** (pantalla principal): muestra el catálogo de `data/catalog.json` del servidor (o uno
  cargado en el navegador con el botón _Catálogo_). Los canales
  se muestran por categoría (`group`) y las variantes del mismo canal (720p, 1080p, marcas `*`…) se
  agrupan en una sola tarjeta con sus fuentes ordenadas por calidad. Desde el reproductor se cambia de
  fuente con un clic o se guarda en _Mis links_. Ver [Catálogo de canales](#catálogo-de-canales).
- **Elección automática de fuente:** al pulsar la tarjeta de un canal con varias fuentes, la app pide al
  motor los peers de todas (hasta 12 s) y reproduce la que más tenga; en empate, la de mejor calidad. Las
  píldoras de fuente muestran los peers de cada una («9 peers», «sin peers», «no disponible»).
  **Ver ya esta fuente** se salta la espera. Las píldoras de la tarjeta reproducen esa fuente
  directamente, sin comprobar.
- **Favoritos:** el corazón de cada tarjeta (o **Añadir a favoritos** en el reproductor) guarda el canal
  en la estantería _Favoritos_, la primera de la pantalla.
- **Seguir con…:** el botón junto al título de Canales vuelve al último canal visto con la misma fuente.
- **Reproductor en formato teatro:** el vídeo se abre arriba a todo el ancho, con el título, el
  selector de fuentes y las acciones debajo.
- **Vistos recientemente:** estantería con los últimos canales abiertos en ese navegador.
- **La URL guarda el estado:** `?ver=<id>` es lo que se está viendo y `?vista=links` la pestaña.
  Recargar mantiene la reproducción, el botón _atrás_ (también el del móvil) cierra el reproductor y
  puedes compartir o guardar un enlace directo a un canal.
- **Tema claro u oscuro:** sigue al del sistema hasta que eliges uno con el botón de la cabecera.
- **Estado del motor:** el punto de la cabecera consulta el motor cada 15 s mientras la pestaña está
  visible.

Como los datos (links, favoritos y vistos recientemente) viven en el `localStorage` de cada navegador,
el móvil y el ordenador tienen listas independientes. Usa **Exportar** e **Importar** para copiar la lista de uno a otro, y para tener copias de
seguridad.

## Catálogo de canales

La app no incluye ningún canal: el catálogo lo pones tú. Formato:

```json
{
  "hashes": [
    {
      "title": "Canal 1080p *",
      "hash": "<content ID de 40 hex>",
      "group": "CATEGORÍA",
      "logo": "https://…"
    }
  ]
}
```

- `hash` es obligatorio (también se acepta `contentId`/`id`); `title`, `group` y `logo` son
  opcionales. Vale también un array de entradas sin el objeto `hashes`.
- Agrupación: se quita del título la calidad (`720p`, `1080p`, `4K`, `HD`…) y las marcas finales
  (`*`, `**`); lo que queda es el nombre del canal dentro de su categoría.
- Dos formas de cargarlo:
  1. **En el servidor (recomendado):** deja el archivo en `data/catalog.json`. La carpeta `data/` se
     monta en el contenedor `web` y la app la lee de `/data/catalog.json` en todos los dispositivos.
     Tiene prioridad sobre el catálogo del navegador. Para actualizarlo, sustituye el archivo y recarga.
     En desarrollo, el equivalente es `public/data/catalog.json`.
  2. **Botón _Catálogo_** en la pestaña Canales, solo si el servidor no tiene catálogo: se guarda en ese
     navegador.
- El contenido de `data/` y `public/data/` (y `hashes.json`) está en `.gitignore` y en
  `.dockerignore`: el catálogo no se versiona ni se mete en la imagen.
- Los logos se cargan desde sus URLs originales (sin enviar `Referer`); si fallan, se muestran las
  iniciales.

## Problemas típicos

### El indicador dice «Motor sin respuesta»

- `docker compose ps`: el servicio `acestream` debe aparecer como `healthy`. Tarda unos segundos en
  arrancar.
- `docker compose logs acestream` para ver errores.
- El servidor tiene que ser amd64 (la imagen no existe para ARM).
- En Windows con el motor nativo no hay contenedor del motor: comprueba que Ace Stream está abierto
  (`http://localhost:6878/webui/api/service?method=get_version` debe responder).

### El stream no arranca o tarda mucho

- El **primer arranque** de un canal puede tardar 30–60 s mientras el motor busca peers y precarga.
  El reproductor espera hasta 90 s.
- **«El motor no pudo cargar el contenido» (500):** el ID no existe, el canal no está emitiendo
  ahora mismo o no hay nadie compartiéndolo. Comprueba el link en otro sitio o prueba más tarde.
- **«El stream no ha arrancado a tiempo»:** el motor sigue buscando peers. Reintenta; si persiste, el canal
  tiene pocos peers.
- **Se ve con cortes:** suele ser falta de peers o de ancho de banda de subida en las fuentes. Prueba con
  VLC copiando la URL `getstream` para descartar el navegador.
- **Hay audio pero no vídeo, o «Error al decodificar»:** el navegador no soporta el códec del stream
  (algunos canales usan HEVC/H.265 o audio AC-3). Ábrelo en VLC o mpv con el botón _URL para VLC/mpv_.

### Motor sin peers

El motor funciona sin abrir puertos, pero conecta con menos peers. Si un canal popular no arranca
nunca:

- Comprueba que el servidor tiene salida a Internet sin restricciones (sin VPN que bloquee P2P).
- Opcionalmente, puedes publicar el puerto P2P de Acestream (8621 TCP/UDP) y redirigirlo en el router
  añadiendo `ports: ['8621:8621', '8621:8621/udp']` al servicio `acestream`. Con esto el motor queda expuesto
  a Internet por ese puerto; no hace falta para uso normal.
- Reinicia el motor: `docker compose restart acestream`.

### Mixed content al servirlo con HTTPS

Si pones la app detrás de un proxy con HTTPS (Caddy, Traefik, Nginx Proxy Manager…):

- **Redirige todo el sitio** (`/`, `/ace/` y `/webui/api/service`) al contenedor `web` en el puerto 8080.
  La app usa URLs relativas, así que todo sigue en el mismo origen HTTPS.
- **No apuntes nunca el navegador a `http://HOST:6878`**: una página HTTPS no puede cargar vídeo por HTTP
  (mixed content) y el navegador lo bloquea.
- Si el motor generase URLs absolutas `http://…` en las playlists, el nginx de `web` ya las reescribe a
  rutas relativas.
- En tu proxy, desactiva el buffering y sube los timeouts de lectura para `/ace/` (los streams duran
  horas). Ejemplo para nginx: `proxy_buffering off; proxy_read_timeout 3600s;`.
- La URL copiada para VLC será `https://…/ace/getstream?id=…`, y VLC y mpv la abren sin problema.

Con HTTPS, además, el botón de copiar usa la API moderna del portapapeles y la PWA se puede
instalar del todo. Con HTTP la app recurre a un método alternativo, y si tampoco funciona muestra la
URL para que la copies a mano.

### La lista ha desaparecido

La lista vive en el `localStorage` del navegador y de esa URL concreta: `http://192.168.1.50:8080` y
`http://servidor.local:8080` son orígenes distintos, con listas distintas. Borrar los datos de
navegación también la borra. Exporta la lista de vez en cuando.

## Desarrollo

```bash
npm ci
# Necesita un motor accesible; por ejemplo, levantando solo el motor con el puerto publicado:
docker run -d --rm -p 127.0.0.1:6878:6878 -e ALLOW_REMOTE_ACCESS=yes ghcr.io/martinbjeldbak/acestream-http-proxy
npm run dev                      # Vite redirige /ace y /webui/api a http://localhost:6878
ACE_ENGINE_URL=http://192.168.1.50:6878 npm run dev   # o a otro motor
```

| Script                 | Qué hace                         |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Servidor de desarrollo con proxy |
| `npm run build`        | Typecheck + build de producción  |
| `npm run lint`         | ESLint (sin `any`)               |
| `npm run test`         | Tests con Vitest                 |
| `npm run format`       | Formatea con Prettier            |
| `npm run format:check` | Comprueba el formato             |

### Estructura

```
src/
  types/stream.ts          Tipo StreamLink y tipos de parseo
  lib/
    links.ts               Parseo y validación de links, duplicados, URLs del motor
    m3u.ts                 Importación de listas M3U
    exchange.ts            Exportación JSON y detección del formato al importar
    schema.ts              Validación de datos desconocidos (localStorage, JSON importado)
    storage.ts             Interfaz LinkStorage + implementación sobre localStorage
    filter.ts              Búsqueda, filtros y orden
    playback.ts            Elección hls.js / HLS nativo y mensajes de error
    engine.ts, format.ts, clipboard.ts, id.ts
    catalog.ts             Catálogo de canales: validación, agrupado por canal y búsqueda
    recent.ts, urlState.ts, theme.ts   Vistos recientemente, estado en la URL y tema
    sources.ts             API JSON del motor: sesiones, peers y elección de la mejor fuente
    favorites.ts, logo.ts  Favoritos y tamaño de los logos según la imagen
  styles/
    tokens.css             Colores, tipografías, espacios y radios (única fuente de diseño)
    base.css               Reset, elementos base y utilidades
  hooks/                   useLinks, useCatalog, useHlsPlayer, useUrlState, useTheme…
  components/
    ui/                    Button, IconButton, Chip y estilos de campos (controles base)
    layout/                Cabecera, estado del motor y avisos
    channels/              Vista de canales: estanterías, tarjetas y logos
    links/                 Vista "Mis links": formulario, filtros y lista
    player/                Reproductor (teatro)
docs/DESIGN.md             Sistema de diseño: tokens, composición y principios
docker/nginx.conf.template SPA + proxy inverso al motor
Dockerfile                 Build multi-stage (Node → nginx)
docker-compose.yml         Servicios acestream + web
docker-compose.native.yml  Variante con el motor instalado en el equipo (Docker Desktop)
deploy/docker-compose.yml  Instalación solo con Docker, con la imagen publicada en GHCR
.github/workflows/ci.yml   Lint, tests y build en cada cambio; publica la imagen desde main
windows/                   iniciar.cmd y actualizar.cmd para el uso en local con Windows
```

Todas las funciones de `lib/` son puras y tienen tests (`*.test.ts`).

### Cambiar la persistencia por un backend

La app solo depende de la interfaz `LinkStorage` (`load()` / `save()`, ambas asíncronas) de
`src/lib/storage.ts`. Para usar un backend, escribe otra implementación (por ejemplo, con `fetch` a una
API) y devuélvela desde `createDefaultStorage()`. Los datos que lleguen se pueden validar con
`parseLinkList()` de `schema.ts`.

## Limitaciones conocidas

- Al cerrar el reproductor, el motor mantiene la sesión del canal unos segundos o minutos hasta que expira
  por inactividad. Es el comportamiento normal del motor.
- No hay service worker: la app necesita conexión con el servidor para cargar, lo cual tiene sentido
  porque sin motor no se puede reproducir nada.

## Licencia

[MIT](LICENSE). La app no incluye ningún contenido: cada usuario es responsable de los links y
catálogos que use con ella.
