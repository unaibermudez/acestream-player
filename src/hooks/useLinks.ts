import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { generateId } from '../lib/id'
import { createLink, planAdditions, type AdditionPlan } from '../lib/links'
import { createDefaultStorage, type LinkStorage } from '../lib/storage'
import type { ParsedEntry, StreamLink } from '../types/stream'

export type LinkPatch = Partial<Pick<StreamLink, 'name' | 'tags' | 'favorite'>>

export interface MergeResult {
  added: number
  duplicates: number
}

export interface LinksApi {
  links: StreamLink[]
  loaded: boolean
  addEntries(entries: ParsedEntry[]): AdditionPlan
  updateLink(id: string, patch: LinkPatch): void
  removeLink(id: string): void
  markPlayed(id: string): void
  /** Añade links completos (importación JSON) saltando los content ID ya existentes. */
  mergeLinks(incoming: StreamLink[]): MergeResult
}

export function useLinks(storage: LinkStorage = defaultStorage()): LinksApi {
  const [links, setLinks] = useState<StreamLink[]>([])
  const [loaded, setLoaded] = useState(false)
  // Copia síncrona del estado para calcular duplicados sin esperar al siguiente render.
  const linksRef = useRef<StreamLink[]>([])

  useEffect(() => {
    let cancelled = false
    storage
      .load()
      .then((stored) => {
        if (cancelled) return
        linksRef.current = stored
        setLinks(stored)
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [storage])

  const commit = useCallback(
    (next: StreamLink[]) => {
      linksRef.current = next
      setLinks(next)
      storage.save(next).catch((error: unknown) => {
        console.error('No se pudo guardar la lista', error)
      })
    },
    [storage],
  )

  const addEntries = useCallback(
    (entries: ParsedEntry[]) => {
      const plan = planAdditions(entries, linksRef.current)
      if (plan.toAdd.length > 0) {
        const now = new Date()
        const created = plan.toAdd.map((entry) => createLink(entry, generateId(), now))
        commit([...created, ...linksRef.current])
      }
      return plan
    },
    [commit],
  )

  const updateLink = useCallback(
    (id: string, patch: LinkPatch) => {
      commit(linksRef.current.map((link) => (link.id === id ? { ...link, ...patch } : link)))
    },
    [commit],
  )

  const removeLink = useCallback(
    (id: string) => {
      commit(linksRef.current.filter((link) => link.id !== id))
    },
    [commit],
  )

  const markPlayed = useCallback(
    (id: string) => {
      const now = new Date().toISOString()
      commit(
        linksRef.current.map((link) => (link.id === id ? { ...link, lastPlayedAt: now } : link)),
      )
    },
    [commit],
  )

  const mergeLinks = useCallback(
    (incoming: StreamLink[]) => {
      const known = new Set(linksRef.current.map((link) => link.contentId))
      const knownIds = new Set(linksRef.current.map((link) => link.id))
      const toAdd: StreamLink[] = []
      for (const link of incoming) {
        if (known.has(link.contentId)) continue
        known.add(link.contentId)
        // Evita colisiones de id si el JSON viene de otra instalación.
        const id = knownIds.has(link.id) ? generateId() : link.id
        knownIds.add(id)
        toAdd.push({ ...link, id })
      }
      if (toAdd.length > 0) commit([...toAdd, ...linksRef.current])
      return { added: toAdd.length, duplicates: incoming.length - toAdd.length }
    },
    [commit],
  )

  return useMemo(
    () => ({ links, loaded, addEntries, updateLink, removeLink, markPlayed, mergeLinks }),
    [links, loaded, addEntries, updateLink, removeLink, markPlayed, mergeLinks],
  )
}

let sharedStorage: LinkStorage | null = null
function defaultStorage(): LinkStorage {
  sharedStorage ??= createDefaultStorage()
  return sharedStorage
}
