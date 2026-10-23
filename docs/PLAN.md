# Plan: catálogo en el servidor y despliegue

Estado: 🟡 Fase 1: en uso en local (portátil con Windows); el servidor dedicado queda aplazado

Leyenda: ✅ hecho · 🟡 en curso · ⬜ pendiente · ⏸️ aplazado · 👤 lo haces tú

## Fase 1: desplegar con el catálogo en el servidor

Objetivo: que la app cargue los canales sola en cualquier dispositivo, sin importar el JSON a mano.

| Estado | Tarea                                                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | Montar la carpeta `./data` en el contenedor `web` (solo lectura) en lugar de un archivo suelto                                         |
| ✅     | La app lee `/data/catalog.json`; si existe, tiene prioridad sobre el catálogo importado en el navegador                                |
| ✅     | nginx sirve `/data/` sin caché y con 404 real si falta el archivo (sin caer en el fallback de la SPA)                                  |
| ✅     | En desarrollo, el mismo catálogo en `public/data/catalog.json`; `data/` y `public/data/` fuera de git y de la imagen                   |
| ✅     | Guía de despliegue en el README (Docker, clave de despliegue, `.env`, `data/`, `ufw`, IP fija)                                         |
| ✅     | Verificación local: compose con un catálogo de prueba, carga automática en escritorio y móvil                                          |
| ✅     | Modo local con Windows: motor de Ace Stream del equipo (`docker-compose.native.yml`), `windows/iniciar.cmd` y `windows/actualizar.cmd` |
| ✅     | Arrancado en el portátil: `.env` con puerto 18080 y motor nativo, catálogo en `data/catalog.json`                                      |
| ⬜ 👤  | Activar en Docker Desktop _Start Docker Desktop when you sign in_ (para no tener que arrancar nada a diario)                           |
| ⏸️ 👤  | Instalar Docker y el plugin Compose en el servidor Ubuntu                                                                              |
| ⏸️ 👤  | Clonar el repo (con clave de despliegue de solo lectura), crear `.env` y copiar el catálogo a `data/catalog.json`                      |
| ⏸️ 👤  | `docker compose up -d --build`, abrir el puerto en `ufw` y reservar IP fija en el router                                               |

Para actualizar el catálogo después, basta con sustituir `data/catalog.json` y recargar la página.

## Fase 2: acceso remoto y HTTPS con Tailscale

| Estado | Tarea                                                                               |
| ------ | ----------------------------------------------------------------------------------- |
| ⬜     | Documentar Tailscale y `tailscale serve` en el README                               |
| ⬜ 👤  | Instalar Tailscale en el servidor y en el móvil                                     |
| ⬜ 👤  | `tailscale serve` hacia el puerto de la app → `https://<servidor>.<tailnet>.ts.net` |
| ⬜     | Verificar instalación PWA completa y portapapeles por HTTPS                         |

No se abren puertos en el router: la app no tiene autenticación.

## Fase 3 (opcional): backend para sincronizar entre dispositivos

| Estado | Tarea                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| ⬜     | Servicio `api` (Node + Fastify + SQLite) en el volumen `./data`, con `GET/PUT /api/links` y `GET/PUT /api/catalog` |
| ⬜     | nginx: `/api/` hacia el servicio `api`                                                                             |
| ⬜     | Implementaciones HTTP de `LinkStorage` y `CatalogStorage`                                                          |
| ⬜     | Migración: subir al servidor los links que haya en el `localStorage`                                               |
| ⬜     | Tests de la API y E2E de sincronización entre dos navegadores                                                      |

Accesible solo por LAN o Tailscale mientras no haya autenticación.

## Fase 4: actualizaciones y copias de seguridad

| Estado | Tarea                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------ |
| ⬜     | GitHub Actions: lint, tests, build y publicación de la imagen en GHCR (privada)                        |
| ⬜     | `docker-compose.yml` con la imagen de GHCR en lugar de `build:` (manteniendo la opción de build local) |
| ⬜ 👤  | Actualizar con `docker compose pull && docker compose up -d`, o automático con Watchtower              |
| ⬜ 👤  | Copia periódica de `./data`                                                                            |

## Mejora posterior

- Mostrar los peers de cada fuente (respuesta JSON del motor) y elegir automáticamente la variante con más peers.

## Registro

- 2026-10-23: plan creado. Empieza la fase 1.
- 2026-10-23: fase 1, código completado. `./data` montada en `web`; la app carga `/data/catalog.json`
  con prioridad sobre el navegador; nginx devuelve 404 real si falta. Verificado con un catálogo de
  prueba en Docker y en dev: carga automática, sustitución en caliente, móvil y 404. Guía de despliegue
  en el README. Pendiente: los pasos 👤 en el servidor.
- 2026-10-23: antes de seguir con el despliegue, rediseño de la interfaz con el estilo de la web
  personal y las skills `frontend-design`, `web-design-guidelines` y `react-best-practices` (ver
  `docs/DESIGN.md`). No cambia el estado de las fases.
- 2026-10-23: sin servidor en casa por ahora. Se añade el modo local con Windows: Docker Desktop
  con solo el contenedor web, que usa el motor de Ace Stream ya instalado (`host.docker.internal`),
  y scripts de doble clic. nginx pasa a ser una plantilla con `ACE_ENGINE`. Verificado en el
  portátil: 59 canales cargados y motor 3.2.8 de Windows detectado a través del proxy. Los pasos del
  servidor Ubuntu quedan aplazados; la fase 2 (Tailscale) sirve igual en el portátil si se quiere
  acceso desde fuera.
