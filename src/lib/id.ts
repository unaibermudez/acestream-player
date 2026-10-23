/**
 * Genera un identificador único. `crypto.randomUUID` solo existe en contextos seguros
 * (HTTPS o localhost) y la app se usa a menudo por http://IP-de-la-LAN, así que se
 * recurre a `getRandomValues`, que está disponible siempre.
 */
export function generateId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
