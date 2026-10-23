# Diseño de la interfaz

Referencia visual: la web personal [unaibermudez.github.io](https://unaibermudez.github.io), con su
papel, su tinta y su azul Klein. Esta guía recoge las decisiones para que cualquier cambio futuro
mantenga la coherencia. Los tokens viven en `src/styles/tokens.css`; no se usan colores ni fuentes
fuera de ellos.

## Tema

| Token          | Claro     | Oscuro    | Uso                                               |
| -------------- | --------- | --------- | ------------------------------------------------- |
| `--bg` papel   | `#F5F2EA` | `#181611` | Fondo de la página                                |
| `--surface`    | `#ECE8DC` | `#211D17` | Placas de logo, campos y superficies elevadas     |
| `--text` tinta | `#181611` | `#F5F2EA` | Texto y botón primario                            |
| `--muted`      | `#5C594F` | `#C2BCAD` | Texto secundario                                  |
| `--accent`     | `#1B36C9` | `#8C9EFF` | Solo estado: seleccionado, activo, foco y enlaces |
| `--screen`     | `#000000` | `#000000` | El pozo del vídeo, siempre negro                  |

Tema claro u oscuro según el sistema, con un botón para fijarlo; la elección se guarda en el
navegador y se aplica antes del primer pintado, sin destello.

## Tipografía

- **Fraunces** (serif, 300/400): títulos de estantería, título de lo que se está viendo y la marca
  (en cursiva). Es la voz editorial.
- **Hanken Grotesk** (400/500/600): todo el texto de interfaz y los nombres de canal.
- **Fragment Mono** (400): solo datos técnicos (calidad de fuente `1080p **`, recuentos, versión
  del motor, atajos de teclado) y la navegación principal, como en la web.

Escala (rem): 0.75 · 0.875 · 1 · 1.25 · 1.75 · 2.5 · clamp(1.75, 4vw, 3). Interlineado 1.45 en
texto y 1.1 en titulares serif.

## Composición: teatro y estanterías

```
┌ Acestream (cursiva) ─── Canales  Mis links ─── ● Motor 3.2.11  ◐ ┐
│                                                                  │
│  ┌───────────────────── vídeo 16:9 ──────────────────────┐       │  ← solo al reproducir
│  └────────────────────────────────────────────────────────┘      │
│  M+ LaLiga 2  (Fraunces grande)          [1080p **][720p *]       │
│  [Guardar] [Copiar URL VLC] [acestream://] [Pantalla completa]    │
│                                                                  │
│  ( Buscar canales… )   La Liga · Dazn · Deportes …  (saltos)      │
│  ─────────────────────────────────────────────────────────────── │
│  Vistos recientemente                                   3        │
│  [▣][▣][▣] →                                                      │
│  ─────────────────────────────────────────────────────────────── │
│  LA LIGA                                          6 canales ‹ ›  │
│  [▣][▣][▣][▣][▣][▣] →                                             │
```

- **Teatro**: al reproducir, el vídeo ocupa el ancho del contenido arriba del todo (máximo 72 % del
  alto de la ventana). Es el único elemento audaz de la interfaz.
- **Estanterías**: una fila horizontal por categoría, con scroll-snap y flechas en escritorio. La
  cabecera de cada fila lleva una línea fina superior, como las secciones de la web.
- **Búsqueda**: con texto, las estanterías se sustituyen por una rejilla de resultados.
- **Mis links**: dos columnas en escritorio, con el formulario de alta a la izquierda y la lista a la
  derecha. La lista es una sucesión de filas separadas por líneas finas, no tarjetas.
- Todo alineado a la izquierda. Márgenes laterales de 3rem en escritorio y 1.25rem en móvil.

## Principios

1. **Contenido primero**: logos y vídeo son las imágenes; la interfaz se queda en papel y tinta.
2. **Un solo acento**: el azul Klein marca estado (seleccionado, activo y foco), nunca decora.
3. **Jerarquía por forma**: el teatro tiene radio 14px, las placas 10px y los controles son
   píldoras. Nada de una misma tarjeta con sombra para todo.
4. **Movimiento solo como respuesta**: nada se anima al cargar; abrir, cambiar de fuente o
   desplazar estanterías sí, y todo se desactiva con `prefers-reduced-motion`.
5. **Textos útiles**: verbos en activo, sin relleno; los errores dicen qué pasó y qué hacer.

## Revisión contra el encargo

- Papel crema con serif y líneas finas es una estética muy repetida, pero aquí viene impuesta por la
  identidad del cliente. Se conserva su acento Klein (no el terracota típico) y se evita el resto de
  marcas genéricas: sin numeración de secciones (las categorías no son una secuencia), sin etiquetas
  en mayúsculas inventadas y sin flechas `→` en los botones.
- Se descartó la columna lateral de reproductor de la versión anterior: con vídeo en directo, el
  formato teatro arriba da más tamaño al vídeo y funciona igual en móvil y escritorio.
- La mono se limita a datos y a la navegación (como en la web), no a cualquier etiqueta.

## Calidad mínima

- Foco visible con `:focus-visible` en todos los controles.
- Contraste AA en ambos temas.
- Objetivos táctiles de al menos 40px.
- Nada se desborda en horizontal a 360px de ancho.
- Imágenes con dimensiones fijas.
- `aria-live` en los avisos.
- Deshacer en lugar de confirmar al borrar.

## Notas de la revisión con capturas

- Las fuentes de cada tarjeta se limitan a dos y un «+N» en una sola fila: tres píldoras partían en
  dos filas y recargaban la estantería.
- El teatro se limita al 62 % del alto de la ventana para que el título y las fuentes quepan en la
  primera pantalla de un portátil.
- En móvil el mensaje de error del teatro usa tamaños menores (el vídeo mide unos 220px de alto) y
  las acciones van de dos en dos.
- `.search` no lleva `flex` propio: en una columna flex, `flex-basis` se convierte en altura. Lo fija
  cada contenedor que lo usa.
- Los logos van sobre fondo negro en ambos temas: la mayoría de los del catálogo son blancos o
  claros sobre transparente y desaparecían sobre blanco. Su tamaño depende de la imagen
  (`lib/logo.ts`): los carteles grandes y apaisados llenan la placa, los logos medianos llevan un
  margen pequeño y los iconos pequeños o casi cuadrados, uno mayor.
- Solo se cargan los subconjuntos `latin` de las fuentes; cubren el español.
- Directrices de Vercel aplicadas: enlaces reales para navegar (Ctrl+clic funciona), estado en la
  URL, deshacer en lugar de confirmar al borrar, `aria-live` en avisos, `translate="no"` en marcas,
  `content-visibility` en estanterías y `scroll-padding` según el alto de la cabecera.
