/**
 * Copia texto al portapapeles. `navigator.clipboard` solo existe en contextos seguros
 * (HTTPS o localhost); por http://IP-de-la-LAN se recurre a `execCommand('copy')`.
 * Devuelve `false` si ninguna vía funciona, para que la UI muestre el texto y se copie a mano.
 */
export async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Sigue con la alternativa.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, text.length)
  try {
    // execCommand está obsoleto, pero es la única vía en contextos no seguros.
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
