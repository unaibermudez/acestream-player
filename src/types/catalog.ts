/** Una entrada del catálogo tal cual llega del archivo (una fuente de un canal). */
export interface CatalogEntry {
  title: string
  contentId: string
  group: string
  logo: string | null
}

/** Una fuente concreta de un canal: misma emisión, distinta calidad u origen. */
export interface ChannelVariant {
  contentId: string
  /** Texto corto para el botón: "1080p **", "720p *"… */
  label: string
  quality: string | null
  title: string
}

/** Canal agrupado: todas las variantes cuyo título coincide salvo calidad y marcas. */
export interface Channel {
  key: string
  name: string
  category: string
  logo: string | null
  /** Ordenadas de mejor a peor calidad. */
  variants: ChannelVariant[]
}

export interface ChannelCategory {
  name: string
  channels: Channel[]
}
