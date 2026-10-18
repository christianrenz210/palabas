import { useCallback, useEffect, useState } from 'react'

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError('Could not reach the server. Is the Laravel backend running?', 0)
  }
  let data
  try { data = await res.json() } catch { data = null }
  if (!res.ok) throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data)
  if (data === null) throw new ApiError('Could not reach the server. Is the backend running?', 0)
  return data
}

// GET responses are kept for the session so going back to a page is instant.
const cache = new Map()

export function useApi(path) {
  const [state, setState] = useState(() => ({
    data: path ? cache.get(path) ?? null : null,
    error: null,
    loading: !!path && !cache.has(path),
  }))
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false })
      return
    }
    if (cache.has(path) && nonce === 0) {
      setState({ data: cache.get(path), error: null, loading: false })
      return
    }
    const ctrl = new AbortController()
    setState((s) => ({ data: s.data, error: null, loading: true }))
    api(path, { signal: ctrl.signal })
      .then((data) => {
        cache.set(path, data)
        setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false })
      })
    return () => ctrl.abort()
  }, [path, nonce])

  const reload = useCallback(() => {
    if (path) cache.delete(path)
    setNonce((n) => n + 1)
  }, [path])

  return { ...state, reload }
}

/**
 * A paginated list with "Load more". `path` must not include `page`.
 * The first page's extra fields (lists, genres…) are kept in `meta`.
 */
export function usePaged(path) {
  const [state, setState] = useState({ items: [], page: 0, totalPages: 1, meta: null, loading: false, error: null })
  const sep = path?.includes('?') ? '&' : '?'

  const load = useCallback(
    async (page, signal) => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const url = `${path}${sep}page=${page}`
        const data = cache.get(url) ?? (await api(url, { signal }))
        cache.set(url, data)
        setState((s) => {
          const seen = new Set(page === 1 ? [] : s.items.map((i) => `${i.type}-${i.id}`))
          const fresh = data.results.filter((i) => !seen.has(`${i.type}-${i.id}`))
          return {
            items: page === 1 ? fresh : [...s.items, ...fresh],
            page,
            totalPages: data.total_pages ?? 1,
            meta: page === 1 ? data : s.meta,
            loading: false,
            error: null,
          }
        })
      } catch (error) {
        if (error.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error }))
      }
    },
    [path, sep],
  )

  useEffect(() => {
    if (!path) return
    const ctrl = new AbortController()
    setState({ items: [], page: 0, totalPages: 1, meta: null, loading: true, error: null })
    load(1, ctrl.signal)
    return () => ctrl.abort()
  }, [path, load])

  return {
    ...state,
    done: state.page >= state.totalPages,
    loadMore: () => !state.loading && load(state.page + 1),
    retry: () => load(state.page + 1 || 1),
  }
}
