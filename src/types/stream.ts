/** Un link de Acestream guardado por el usuario. Las fechas son ISO 8601 para serializar sin pérdida. */
export interface StreamLink {
  id: string
  name: string
  /** 40 caracteres hexadecimales en minúsculas. */
  contentId: string
  tags: string[]
  favorite: boolean
  createdAt: string
  lastPlayedAt: string | null
}

/** Entrada ya validada, lista para convertirse en StreamLink. */
export interface ParsedEntry {
  contentId: string
  name: string | null
  tags: string[]
}

export interface ParseError {
  /** Número de línea (empezando en 1) dentro del texto de entrada. */
  line: number
  text: string
  reason: string
}

export interface ParseResult {
  entries: ParsedEntry[]
  errors: ParseError[]
}
