/** Endpoint del motor que devuelve su versión; nginx lo expone en el mismo origen. */
export const ENGINE_VERSION_URL = '/webui/api/service?method=get_version&format=json'

/**
 * Extrae la versión de `{"result": {"version": "3.2.11", ...}, "error": null}`.
 * Devuelve `null` si la respuesta no tiene esa forma o trae un error.
 */
export function parseVersionResponse(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const { result, error } = data as { result?: unknown; error?: unknown }
  if (error) return null
  if (typeof result !== 'object' || result === null) return null
  const { version } = result as { version?: unknown }
  return typeof version === 'string' && version ? version : null
}
