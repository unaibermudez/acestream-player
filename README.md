# Acestream Player

Aplicación web personal para guardar, organizar y reproducir links de Acestream (`acestream://<id>` o
IDs sueltos) desde el navegador, contra un motor de Acestream que corre en Docker en tu servidor casero.

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

## Requisitos

- Un servidor **x86-64** (amd64) con Linux, por ejemplo Ubuntu Server.
- Docker Engine con el plugin Compose v2 (`docker compose version`).
- Unos 2 GB de disco libres para la imagen del motor y su caché (la imagen limita la caché a 1 GB).

Para desarrollo: Node.js 22 o superior (probado con 24).

## Arranque

```bash
git clone git@github.com:unaibermudez/acestream-player.git
cd acestream-player
docker compose up -d --build
```

La app queda en `http://HOST:8080`. Pega un `acestream://…`, pulsa **Guardar** y después pulsa el link
para reproducirlo.

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
- **Lista:** nombre y etiquetas editables (lápiz), favorito (estrella), último uso y borrar. Búsqueda
  sin distinguir tildes ni mayúsculas, y filtros por etiqueta y por favoritos.
- **Reproductor:** muestra el estado de carga con los segundos transcurridos. Si en 90 s el stream no
  ha arrancado, aparece un error claro con botón **Reintentar**. También incluye pantalla completa y los
  botones para copiar la URL `getstream` (para VLC/mpv) y el link `acestream://`.
- **Atajos (escritorio):** `/` enfoca la búsqueda y `Esc` cierra el reproductor.
- **Importar/Exportar** (cabecera): exporta toda la lista en JSON. Importa ese mismo JSON, listas
  **M3U/M3U8** (usa el título de `#EXTINF` como nombre y `group-title` como etiqueta) o texto con un link
  por línea. El formato se detecta por el contenido.
- **Estado del motor:** el punto de la cabecera consulta el motor cada 15 s mientras la pestaña está
  visible.

Como los datos viven en el `localStorage` de cada navegador, el móvil y el ordenador tienen listas
independientes. Usa **Exportar** e **Importar** para copiar la lista de uno a otro, y para tener copias de
seguridad.

## Problemas típicos

### El indicador dice «Motor sin respuesta»

- `docker compose ps`: el servicio `acestream` debe aparecer como `healthy`. Tarda unos segundos en
  arrancar.
- `docker compose logs acestream` para ver errores.
- El servidor tiene que ser amd64 (la imagen no existe para ARM).

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
  hooks/                   useLinks, useHlsPlayer, useEngineStatus, useKeyboardShortcuts
  components/              Player, LinkList, LinkItem, AddLinksForm, FilterBar, ImportExport…
docker/nginx.conf          SPA + proxy inverso al motor
Dockerfile                 Build multi-stage (Node → nginx)
docker-compose.yml         Servicios acestream + web
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
