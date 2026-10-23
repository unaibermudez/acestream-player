import { useId, useState, type FormEvent } from 'react'
import type { AdditionPlan } from '../../lib/links'
import { parseBulkInput, parseTagsInput } from '../../lib/links'
import type { ParsedEntry, ParseError } from '../../types/stream'
import { Button } from '../ui/Button'

interface Props {
  onAdd(entries: ParsedEntry[]): AdditionPlan
}

interface Feedback {
  added: number
  duplicates: string[]
  errors: ParseError[]
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

export function AddLinksForm({ onAdd }: Props) {
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const textId = useId()
  const tagsId = useId()
  const hintId = useId()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const { entries, errors } = parseBulkInput(text)
    const tagList = parseTagsInput(tags)
    const plan = onAdd(entries.map((entry) => ({ ...entry, tags: tagList })))
    setFeedback({
      added: plan.toAdd.length,
      duplicates: plan.duplicates.map((entry) => entry.name ?? entry.contentId.slice(0, 8)),
      errors,
    })
    // Deja en el cuadro solo las líneas erróneas para que se puedan corregir.
    setText(errors.map((error) => error.text).join('\n'))
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <h2 className="add-form__title">Añadir links</h2>
      <label htmlFor={textId} className="field-label">
        Links
      </label>
      <textarea
        id={textId}
        name="links"
        className="field add-form__text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={'acestream://… o un ID de 40 caracteres…'}
        aria-describedby={hintId}
        rows={4}
        spellCheck={false}
        autoComplete="off"
      />
      <p id={hintId} className="field-hint">
        Varios a la vez: uno por línea, con nombre opcional como <code>Nombre | link</code>.
      </p>
      <label htmlFor={tagsId} className="field-label">
        Etiquetas <span className="field-optional">(opcional)</span>
      </label>
      <input
        id={tagsId}
        name="tags"
        className="field"
        value={tags}
        onChange={(event) => setTags(event.target.value)}
        placeholder="deportes, cine…"
        autoComplete="off"
      />
      <Button type="submit" variant="primary" disabled={!text.trim()}>
        Guardar links
      </Button>

      {feedback && (
        <div className="add-form__feedback" role="status" aria-live="polite">
          {feedback.added > 0 && (
            <p className="text-ok">{plural(feedback.added, 'link guardado', 'links guardados')}.</p>
          )}
          {feedback.duplicates.length > 0 && (
            <p className="text-warn">
              {plural(feedback.duplicates.length, 'ya estaba guardado', 'ya estaban guardados')}:{' '}
              {feedback.duplicates.join(', ')}
            </p>
          )}
          {feedback.errors.length > 0 && (
            <ul className="text-error">
              {feedback.errors.map((error) => (
                <li key={error.line}>
                  Línea {error.line}: {error.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}
