# Servidor casero con Ubuntu

Guía paso a paso para convertir un ordenador viejo en el servidor de Acestream Player. Al terminar,
el ordenador queda encendido en un rincón, sin pantalla ni teclado. Desde cualquier móvil, tablet u
ordenador de casa abres `http://tele.local:8080` y ves tus canales.

Tiempo aproximado: una hora, la mayor parte esperando a que se instalen cosas.

## Índice

1. [Qué necesitas](#1-qué-necesitas)
2. [Ubuntu Server o Ubuntu Desktop](#2-ubuntu-server-o-ubuntu-desktop)
3. [Preparar el USB de instalación](#3-preparar-el-usb-de-instalación)
4. [Arrancar el ordenador viejo desde el USB](#4-arrancar-el-ordenador-viejo-desde-el-usb)
5. [Instalar Ubuntu Server](#5-instalar-ubuntu-server)
6. [Primer arranque y conexión por SSH](#6-primer-arranque-y-conexión-por-ssh)
7. [Ajustes básicos del servidor](#7-ajustes-básicos-del-servidor)
8. [Instalar Docker](#8-instalar-docker)
9. [Instalar la app](#9-instalar-la-app)
10. [Usarla desde casa](#10-usarla-desde-casa)
11. [Usarla fuera de casa con Tailscale (opcional)](#11-usarla-fuera-de-casa-con-tailscale-opcional)
12. [Mantenimiento](#12-mantenimiento)
13. [Problemas frecuentes](#13-problemas-frecuentes)

## 1. Qué necesitas

| Qué                    | Mínimo                                                      | Recomendado                  |
| ---------------------- | ----------------------------------------------------------- | ---------------------------- |
| Procesador             | **x86-64 de 64 bits** (Intel o AMD, cualquiera desde ~2010) | 2 núcleos o más              |
| Memoria RAM            | 2 GB                                                        | 4 GB                         |
| Disco                  | 20 GB                                                       | SSD de 60 GB o más           |
| Red                    | Wi-Fi                                                       | **Cable Ethernet** al router |
| USB para instalar      | Pendrive de 8 GB (se borrará entero)                        |                              |
| Durante la instalación | Pantalla y teclado conectados al ordenador viejo            | Después ya no hacen falta    |

> ⚠️ **Tiene que ser de 64 bits x86.** El motor de Acestream solo existe para esa arquitectura. No
> sirve una Raspberry Pi, ni un ordenador de 32 bits (los anteriores a ~2008, como los Pentium 4 o los
> Atom antiguos). Si el ordenador traía Windows 7/10/11 de 64 bits, vale.

**La instalación borra todo el disco del ordenador viejo.** Copia antes lo que quieras conservar.

Un portátil viejo también sirve, y tiene una ventaja: la batería hace de pequeño SAI si se va la luz.
En el [paso 7](#portátil-que-siga-funcionando-con-la-tapa-cerrada) se explica cómo dejarlo con la tapa
cerrada.

## 2. Ubuntu Server o Ubuntu Desktop

**Recomendado: Ubuntu Server.** No tiene escritorio gráfico, así que deja toda la memoria y el
procesador para la app. Se maneja desde tu PC con comandos (te los doy todos en esta guía).

Ubuntu Desktop también funciona, y es más cómodo si prefieres tener ventanas y ratón en el propio
ordenador. Pero consume 1–2 GB de RAM más y, en un equipo viejo, se nota. Si eliges Desktop, el
[paso 5](#5-instalar-ubuntu-server) cambia (el instalador es gráfico) y, al terminar, abre una terminal
e instala el servidor SSH con `sudo apt install openssh-server`. Del paso 6 en adelante todo es igual.

Usa siempre una versión **LTS** (soporte de 5 años): la más reciente es la que aparece destacada en la
web de descargas, por ejemplo 26.04 LTS o 24.04 LTS.

## 3. Preparar el USB de instalación

Esto se hace desde tu PC con Windows.

1. Descarga la imagen ISO de Ubuntu Server desde <https://ubuntu.com/download/server> (opción
   _Manual server installation_ → _Download_). Pesa unos 3 GB.
2. Descarga **Rufus** desde <https://rufus.ie> (la versión portable no necesita instalarse).
3. Conecta el pendrive y abre Rufus:
   - **Dispositivo:** tu pendrive (comprueba que es el correcto: se va a borrar).
   - **Elección de arranque:** _SELECCIONAR_ → la ISO que has descargado.
   - Deja el resto como está y pulsa **EMPEZAR**.
   - Si pregunta por el modo de escritura, elige **Escribir en modo Imagen ISO (recomendado)**.
4. Cuando la barra diga _PREPARADO_, cierra Rufus y saca el pendrive.

## 4. Arrancar el ordenador viejo desde el USB

1. Conecta al ordenador viejo la pantalla, el teclado, el cable de red y el pendrive.
2. Enciéndelo y pulsa repetidamente la tecla del **menú de arranque** nada más encender. Depende de la
   marca:

   | Marca               | Menú de arranque    | Entrar a la BIOS |
   | ------------------- | ------------------- | ---------------- |
   | HP                  | `Esc` y luego `F9`  | `F10`            |
   | Dell                | `F12`               | `F2`             |
   | Lenovo              | `F12` (o `Fn+F12`)  | `F1` / `F2`      |
   | Acer                | `F12`               | `F2`             |
   | ASUS                | `F8` / `Esc`        | `F2` / `Supr`    |
   | Placas de sobremesa | `F8`, `F11` o `F12` | `Supr`           |

3. En el menú, elige el pendrive (a veces aparece dos veces: si hay una opción que empieza por
   **UEFI**, elige esa).
4. Aparece un menú negro de GRUB: deja seleccionado **Try or Install Ubuntu Server** y pulsa `Enter`.

Si el ordenador arranca directamente el sistema antiguo sin mostrar el menú:

- Entra en la BIOS y busca en _Boot_ el orden de arranque; pon el USB primero.
- Si no aparece el USB, prueba a activar _Legacy/CSM_ o a desactivar _Fast Boot_.
- _Secure Boot_ puede quedarse activado: Ubuntu arranca con él.

### Ajuste de BIOS muy recomendable

Ya que estás en la BIOS, busca una opción llamada **Restore on AC Power Loss**, **AC Recovery** o
**Power On after Power Failure** y ponla en **Power On** (o _Last State_). Así, si se va la luz, el
servidor se enciende solo al volver. Suele estar en _Power_ o _Advanced_. No todos los equipos la
tienen, sobre todo los portátiles.

## 5. Instalar Ubuntu Server

El instalador es en modo texto. Se maneja con las flechas, `Tab` para saltar entre campos, `Espacio`
para marcar casillas y `Enter` para aceptar.

1. **Language:** _Español_ (o _English_, si prefieres los mensajes de error en inglés, que son más
   fáciles de buscar en Internet).
2. Si ofrece **actualizar el instalador**, acepta.
3. **Teclado:** _Spanish_ / _Spanish_. Pruébalo escribiendo `ñ` en el campo de prueba.
4. **Tipo de instalación:** _Ubuntu Server_ (no la versión _minimized_).
5. **Red:** con el cable conectado, verás una interfaz (`enp…` o `eth0`) con una IP del tipo
   `192.168.1.x`. **Apunta esa IP.** Si solo tienes Wi-Fi, configúrala aquí con el nombre y la contraseña
   de tu red.
6. **Proxy:** déjalo vacío.
7. **Mirror:** el que propone vale. Espera a que termine la comprobación.
8. **Almacenamiento:** _Use an entire disk_ (usar el disco entero) y elige el disco interno, **no el
   pendrive**. Deja marcado _Set up this disk as an LVM group_ y desmarca _Encrypt_ (si lo cifras,
   habría que teclear la contraseña en cada arranque, y el servidor no podría arrancar solo).
9. **Resumen del almacenamiento:** revisa y acepta. Confirma _Continue_ en el aviso de que se borrará el
   disco.

   > Ubuntu a veces deja sin usar parte del disco en el volumen LVM. No es un problema para esta app;
   > si quieres aprovecharlo todo, edita el volumen `ubuntu-lv` en esta pantalla y ponle el tamaño
   > máximo.

10. **Perfil:**
    - _Your name:_ tu nombre.
    - _Your server's name:_ **`tele`** (o el que quieras; esta guía usa `tele`).
    - _Pick a username:_ por ejemplo **`unai`**. Corto, en minúsculas, sin espacios.
    - _Contraseña:_ una que recuerdes. Se pide cada vez que uses `sudo`.
11. **Ubuntu Pro:** _Skip for now_.
12. **SSH:** marca **Install OpenSSH server**. Es imprescindible: es lo que te deja manejar el servidor
    desde tu PC. Deja _Allow password authentication over SSH_ marcado.
13. **Featured server snaps:** **no marques nada** (Docker se instala después de otra forma; el Docker
    de esta lista da problemas).
14. Espera a que termine. Cuando aparezca **Reboot Now**, pulsa `Enter`, y saca el pendrive cuando lo
    pida (o en cuanto la pantalla se quede en negro).

## 6. Primer arranque y conexión por SSH

Tras reiniciar, aparecen mensajes y al final `tele login:`. Ya está instalado.

Desde aquí manejarás el servidor **desde tu PC**. Abre una terminal en Windows (PowerShell o Terminal)
y conéctate con tu usuario y la IP que apuntaste:

```powershell
ssh unai@192.168.1.50
```

- La primera vez pregunta si confías en el equipo: escribe `yes`.
- Luego pide la contraseña del servidor. Al escribirla no se ve nada; es normal.
- Verás algo como `unai@tele:~$`. Todo lo que escribas ahora se ejecuta en el servidor.
- Para salir: `exit`.

Si no apuntaste la IP: en el propio servidor, entra con tu usuario y contraseña y escribe
`hostname -I`. El primer número es la IP.

Ya puedes desconectar la pantalla y el teclado del servidor.

### Opcional: entrar sin contraseña

Con una clave SSH, no tendrás que escribir la contraseña cada vez. En PowerShell, en tu PC:

```powershell
ssh-keygen -t ed25519                     # Enter a todo; crea la clave si no la tienes
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh unai@192.168.1.50 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Desde ahora, `ssh unai@192.168.1.50` entra directamente.

## 7. Ajustes básicos del servidor

Todos estos comandos se escriben **en el servidor**, conectado por SSH.

### Actualizar el sistema

```bash
sudo apt update && sudo apt full-upgrade -y
sudo reboot
```

Tras `reboot` se corta la conexión; espera un minuto y vuelve a conectarte con `ssh`. Las
actualizaciones de seguridad posteriores se instalan solas (Ubuntu trae `unattended-upgrades`
activado).

### Una IP que no cambie

El router reparte las IP y puede cambiar la del servidor tras un reinicio, y entonces dejaría de
funcionar el acceso desde el móvil. La forma más sencilla de evitarlo es una **reserva DHCP** en el
router:

1. Entra en la web del router (normalmente <http://192.168.1.1>; usuario y contraseña en la pegatina).
2. Busca _DHCP_, _LAN_ o _Dispositivos conectados_. Verás `tele` en la lista.
3. Usa la opción _Reservar IP_, _IP estática_ o _Asignación fija_ para `tele` con su IP actual.

Cada router lo llama de una forma; si no encuentras la opción, busca en Internet «reserva DHCP» y el
modelo del router (Movistar, Digi, O2, Vodafone, etc.).

### Llamarlo por su nombre: `tele.local`

Para escribir `tele.local` en lugar de la IP:

```bash
sudo apt install -y avahi-daemon
```

Desde ese momento funcionan `ssh unai@tele.local` y `http://tele.local:8080` desde Windows, macOS, iPhone
y la mayoría de móviles Android recientes. Si en algún dispositivo no funciona, usa la IP.

### Portátil: que siga funcionando con la tapa cerrada

Solo si el servidor es un portátil. Por defecto, al cerrar la tapa se suspende. Para evitarlo:

```bash
sudo sed -i 's/^#\?HandleLidSwitch=.*/HandleLidSwitch=ignore/; s/^#\?HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/; s/^#\?HandleLidSwitchDocked=.*/HandleLidSwitchDocked=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind
```

Y para que nunca se suspenda por inactividad:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

Déjalo enchufado y en un sitio ventilado (no cerrado en un cajón).

### Cortafuegos

```bash
sudo ufw allow OpenSSH
sudo ufw enable          # responde «y»
```

Con esto el servidor solo acepta SSH desde fuera. **La app no necesita regla propia**: Docker abre su
puerto por su cuenta, saltándose `ufw`. No pasa nada mientras no redirijas puertos en el router (ver el
[paso 10](#10-usarla-desde-casa)): fuera de tu red de casa nadie llega al servidor.

## 8. Instalar Docker

La app y el motor de Acestream corren dentro de Docker. Se instala con el script oficial:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```

El `exit` es necesario para que se aplique el permiso de usar Docker sin `sudo`. Vuelve a conectarte
con `ssh` y comprueba:

```bash
docker compose version      # debe mostrar «Docker Compose version v2…»
docker run --rm hello-world # debe mostrar «Hello from Docker!»
```

Docker arranca solo con el sistema; no hay que hacer nada más.

## 9. Instalar la app

Hay dos formas. La primera es la recomendada en un ordenador viejo, porque descarga la app ya
construida en lugar de compilarla.

### Opción A (recomendada): con la imagen publicada

```bash
mkdir -p ~/acestream-player/data && cd ~/acestream-player
curl -fsSLO https://raw.githubusercontent.com/unaibermudez/acestream-player/main/deploy/docker-compose.yml
docker compose up -d
```

La primera vez descarga unos cientos de MB; tarda unos minutos. Comprueba que todo ha arrancado:

```bash
docker compose ps
```

Los dos servicios, `acestream` y `web`, deben aparecer como `Up`, y al cabo de un minuto como
`(healthy)`.

### Opción B: desde el código

Útil si vas a modificar la app. Construye la imagen en el servidor, lo que en un equipo viejo puede
tardar 5–10 minutos.

```bash
sudo apt install -y git
git clone https://github.com/unaibermudez/acestream-player.git ~/acestream-player
cd ~/acestream-player
docker compose up -d --build
```

### Subir tu catálogo de canales

Tu catálogo (`hashes.json`) está en tu PC y no se sube nunca al repositorio. Cópialo al servidor
**desde PowerShell en tu PC** (no desde la sesión SSH):

```powershell
scp C:\ruta\a\hashes.json unai@tele.local:~/acestream-player/data/catalog.json
```

No hace falta reiniciar nada: recarga la página y aparecen los canales. Para actualizar el catálogo,
repite el mismo `scp`.

### Otro puerto

Si quieres otro puerto en lugar de 8080, en el servidor:

```bash
cd ~/acestream-player
echo "WEB_PORT=9000" > .env
docker compose up -d
```

## 10. Usarla desde casa

Desde cualquier dispositivo conectado al Wi-Fi de casa, abre:

- `http://tele.local:8080`, o
- `http://192.168.1.50:8080` (con la IP de tu servidor).

Para tenerla como una app en el móvil:

- **Android (Chrome):** menú ⋮ → _Añadir a pantalla de inicio_.
- **iPhone (Safari):** botón Compartir → _Añadir a pantalla de inicio_.

Los favoritos, _Mis links_ y los vistos recientemente se guardan en cada navegador, así que cada
dispositivo tiene los suyos. El catálogo de canales sí es el mismo para todos.

> ⚠️ **No abras ni redirijas el puerto 8080 en el router.** La app no tiene usuario ni contraseña:
> cualquiera en Internet podría usar tu motor. Para usarla fuera de casa, sigue el paso 11.

## 11. Usarla fuera de casa con Tailscale (opcional)

Tailscale crea una red privada entre tus dispositivos: desde el móvil con datos verás el servidor como
si estuvieras en casa, sin abrir nada en el router. Es gratis para uso personal.

1. Crea una cuenta en <https://tailscale.com> (puedes entrar con Google o GitHub).
2. En el servidor:

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

   Muestra un enlace: ábrelo en tu PC e inicia sesión para añadir el servidor a tu red.

3. Instala la app **Tailscale** en el móvil (y en el portátil, si quieres) e inicia sesión con la misma
   cuenta.
4. Con Tailscale activado en el móvil, abre `http://tele:8080` desde cualquier sitio.

**HTTPS y PWA completa (opcional).** Tailscale puede servir la app con un certificado válido, lo que
permite instalarla como PWA de verdad:

1. En el panel de Tailscale (<https://login.tailscale.com/admin/dns>), activa **MagicDNS** y **HTTPS
   Certificates**.
2. En el servidor:

   ```bash
   sudo tailscale serve --bg 8080
   ```

3. La app queda en `https://tele.<tu-red>.ts.net`; el comando anterior muestra la dirección exacta.
   Solo es accesible para tus dispositivos de Tailscale.

## 12. Mantenimiento

Todo en el servidor, dentro de `~/acestream-player`:

| Para…                              | Comando                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------- |
| Ver el estado                      | `docker compose ps`                                                         |
| Actualizar la app y el motor (A)   | `docker compose pull && docker compose up -d`                               |
| Actualizar la app y el motor (B)   | `git pull && docker compose pull acestream && docker compose up -d --build` |
| Ver los logs del motor             | `docker compose logs -f acestream` (salir con `Ctrl+C`)                     |
| Reiniciar el motor                 | `docker compose restart acestream`                                          |
| Parar todo                         | `docker compose down`                                                       |
| Volver a arrancar                  | `docker compose up -d`                                                      |
| Liberar espacio de imágenes viejas | `docker image prune -f`                                                     |
| Actualizar Ubuntu                  | `sudo apt update && sudo apt full-upgrade -y`                               |
| Apagar el servidor                 | `sudo poweroff`                                                             |
| Reiniciarlo                        | `sudo reboot`                                                               |

Tras un corte de luz o un reinicio no hay que hacer nada: los contenedores tienen
`restart: unless-stopped` y arrancan solos con Docker.

Cuando salga una versión LTS nueva, Ubuntu avisa al conectarte por SSH. Actualizar es opcional
mientras la tuya tenga soporte; se hace con `sudo do-release-upgrade`.

## 13. Problemas frecuentes

**`ssh` dice _Connection refused_ o _timed out_.**
Comprueba que el servidor está encendido y que la IP es la correcta (en el servidor, `hostname -I`). Si
no marcaste _Install OpenSSH server_ al instalar, conecta pantalla y teclado y ejecuta
`sudo apt install openssh-server`.

**`ssh` dice _REMOTE HOST IDENTIFICATION HAS CHANGED_.**
Pasa si reinstalas Ubuntu en el mismo equipo. En tu PC: `ssh-keygen -R 192.168.1.50` (o `tele.local`)
y vuelve a conectar.

**`tele.local` no funciona, pero la IP sí.**
Comprueba que instalaste `avahi-daemon`. Algunos Android y algunas redes de invitados no resuelven
nombres `.local`; usa la IP.

**`docker: permission denied`.**
Cierra la sesión SSH con `exit` y vuelve a entrar tras el `usermod` del paso 8.

**`exec format error` al arrancar el motor.**
El ordenador no es x86 de 64 bits. Compruébalo con `uname -m`: debe decir `x86_64`.

**La página carga, pero los canales no arrancan.**
Mira `docker compose logs acestream`. Comprueba que el servidor tiene Internet (`ping -c 3 1.1.1.1`).
Si el canal tiene pocos peers, prueba otra fuente. Más ideas en la sección _Motor sin peers_ del
[README](../README.md#motor-sin-peers).

**El ventilador suena mucho o el equipo se calienta.**
Es normal mientras se reproduce un canal (el motor descarga y reenvía vídeo). Si es constante sin
reproducir nada, revisa con `top` qué consume (salir con `q`).

**El disco se llena.**
`df -h /` muestra el espacio libre. Libera imágenes viejas con `docker image prune -f`. La caché del
motor está limitada a 1 GB.
