/**
 * Cómo encajar un logo en su placa según el tamaño real de la imagen. Los catálogos mezclan
 * carteles grandes (fotos o fondos a todo color) con iconos pequeños: los primeros llenan la placa
 * y los segundos se muestran con aire alrededor para no verse inflados.
 */
export type LogoFit = 'art' | 'logo' | 'icon'

/** A partir de este ancho, una imagen apaisada se trata como cartel y llena la placa. */
const ART_MIN_WIDTH = 600
/** A partir de este lado mayor, deja de ser un icono pequeño. */
const LOGO_MIN_SIDE = 300
/** Por debajo de esta proporción (ancho / alto) la imagen es casi cuadrada: siempre icono. */
const WIDE_MIN_RATIO = 1.3

export function logoFit(width: number, height: number): LogoFit {
  if (width <= 0 || height <= 0) return 'icon'
  const ratio = width / height
  if (ratio < WIDE_MIN_RATIO) return 'icon'
  if (width >= ART_MIN_WIDTH) return 'art'
  if (Math.max(width, height) >= LOGO_MIN_SIDE) return 'logo'
  return 'icon'
}
