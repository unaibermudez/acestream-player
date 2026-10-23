import { useId, useState, type FormEvent } from 'react'
import type { AdditionPlan } from '../lib/links'
import { parseBulkInput, parseTagsInput } from '../lib/links'
import type { ParsedEntry, ParseError } from '../types/stream'

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const { entries, errors } = parseBulkInput(text)
    const tagList = parseTagsInput(tags)
    const plan = onAdd(entries.map((entry) => ({ ...entry, tags: tagList })))
    setFeedback({
      added: plan.toAdd.length,
      duplicates: plan.duplicates.map((entry) => entry.name ?? entry.contentId),
      errors,
    })
    // Deja en el cuadro solo las líneas erróneas para que se puedan corregir.
    setText(errors.map((error) => error.text).join('\n'))
  }

  const hasInput = text.trim().length > 0

  return (
    <form className="panel add-form" onSubmit={handleSubmit}>
      <label htmlFor={textId} className="add-form__label">
        Añadir links
      </label>
      <textarea
        id={textId}
        className="input add-form__text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={
          'acestream://… o ID de 40 caracteres\nVarios: uno por línea, opcionalmente «Nombre | link»'
        }
        rows={3}
        spellCheck={false}
        autoComplete="off"
      />
      <div className="add-form__row">
        <label htmlFor={tagsId} className="visually-hidden">
          Etiquetas
        </label>
        <input
          id={tagsId}
          className="input"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="Etiquetas (opcional, separadas por comas)"
          autoComplete="off"
        />
        <button type="submit" className="button button--primary" disabled={!hasInput}>
          Guardar
        </button>
      </div>

      {feedback && (
        <div className="add-form__feedback" role="status">
          {feedback.added > 0 && (
            <p className="text-ok">{plural(feedback.added, 'link añadido', 'links añadidos')}.</p>
          )}
          {feedback.duplicates.length > 0 && (
            <p className="text-warn">
              {plural(feedback.duplicates.length, 'duplicado ignorado', 'duplicados ignorados')}:{' '}
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
          {feedback.added === 0 &&
            feedback.duplicates.length === 0 &&
            feedback.errors.length === 0 && <p className="text-warn">No había nada que añadir.</p>}
        </div>
      )}
    </form>
  )
}
