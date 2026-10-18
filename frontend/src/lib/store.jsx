import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { episodeKey, itemKey } from './format'

// There is no database and no account: profiles, My List, ratings and
// recently watched all live in this browser's localStorage.
function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function usePersisted(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback))
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage blocked: keep working in memory */
    }
  }, [key, value])
  return [value, setValue]
}

export const PROFILE_COLORS = ['#f2b544', '#9cc3bd', '#f0a4b8', '#c7a9ff', '#b5d99c', '#ffb38a']
export const MAX_PROFILES = 5
const DEFAULT_PROFILES = [
  { id: 'me', name: 'Me', color: PROFILE_COLORS[0] },
  { id: 'kids', name: 'Kids', color: PROFILE_COLORS[4], kids: true },
]
const EMPTY = { list: [], liked: [], recent: [], watchedEps: [] }

// Only what a card needs, so saved lists stay small.
const summary = ({ type, id, title, poster, backdrop, year, genres, overview, score }) => ({
  type,
  id,
  title,
  poster,
  backdrop,
  year,
  genres,
  overview,
  score,
})

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [profiles, setProfiles] = usePersisted('palabas.profiles', DEFAULT_PROFILES)
  const [activeId, setActiveId] = usePersisted('palabas.active', null)
  const [allData, setAllData] = usePersisted('palabas.data', {})
  const [toastMsg, setToastMsg] = useState(null)
  const toastTimer = useRef()

  const profile = profiles.find((p) => p.id === activeId) ?? null
  const kids = !!profile?.kids
  const data = { ...EMPTY, ...(profile ? allData[profile.id] : null) }

  const toast = useCallback((text) => {
    clearTimeout(toastTimer.current)
    setToastMsg({ text, id: Date.now() })
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400)
  }, [])

  const update = useCallback(
    (fn) => {
      if (!activeId) return
      setAllData((all) => ({ ...all, [activeId]: fn({ ...EMPTY, ...all[activeId] }) }))
    },
    [activeId, setAllData],
  )

  /* profiles */
  const addProfile = (name, isKids) => {
    const used = profiles.map((p) => p.color)
    const color = PROFILE_COLORS.find((c) => !used.includes(c)) ?? PROFILE_COLORS[profiles.length % PROFILE_COLORS.length]
    const p = { id: `p${Date.now().toString(36)}`, name: name.trim(), color, kids: isKids || undefined }
    setProfiles((ps) => [...ps, p])
    return p
  }
  const updateProfile = (id, patch) => setProfiles((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const removeProfile = (id) => {
    setProfiles((ps) => ps.filter((p) => p.id !== id))
    setAllData(({ [id]: _, ...rest }) => rest)
    if (activeId === id) setActiveId(null)
  }

  /* My List and ratings */
  const inList = (t) => data.list.some((x) => itemKey(x) === itemKey(t))
  const toggleList = (t) => {
    const on = inList(t)
    update((d) => ({ ...d, list: on ? d.list.filter((x) => itemKey(x) !== itemKey(t)) : [summary(t), ...d.list] }))
    toast(on ? `Removed ${t.title} from My List` : `Added ${t.title} to My List`)
  }
  const isLiked = (t) => data.liked.includes(itemKey(t))
  const toggleLike = (t) => {
    const on = isLiked(t)
    update((d) => ({ ...d, liked: on ? d.liked.filter((k) => k !== itemKey(t)) : [...d.liked, itemKey(t)] }))
    if (!on) toast('Thanks. We’ll recommend more like this.')
  }

  /* recently watched (newest first, one entry per title) */
  const recent = data.recent ?? []

  // For a series, Play picks up at the last episode watched.
  const lastEpisode = (t, firstSeason = 1) => {
    const r = recent.find((x) => itemKey(x) === itemKey(t))
    return r?.s ? { s: r.s, e: r.e, watched: true } : { s: firstSeason, e: 1, watched: false }
  }
  const watchedEpisode = (t, s, e) => (data.watchedEps ?? []).includes(episodeKey(t.id, s, e))

  /** @param entry {title fields..., s, e, epName, still} */
  const recordWatch = useCallback(
    (entry) => {
      update((d) => ({
        ...d,
        recent: [
          { ...summary(entry), s: entry.s, e: entry.e, epName: entry.epName, still: entry.still },
          ...(d.recent ?? []).filter((x) => itemKey(x) !== itemKey(entry)),
        ].slice(0, 20),
        watchedEps:
          entry.type === 'tv'
            ? [...new Set([...(d.watchedEps ?? []), episodeKey(entry.id, entry.s, entry.e)])]
            : d.watchedEps,
      }))
    },
    [update],
  )

  const value = {
    profiles,
    profile,
    kids,
    setActiveId,
    addProfile,
    updateProfile,
    removeProfile,
    list: data.list,
    inList,
    toggleList,
    isLiked,
    toggleLike,
    recent,
    lastEpisode,
    watchedEpisode,
    recordWatch,
    toast,
    toastMsg,
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)

// Adds ?kids=1 for the Kids profile so the API only returns all-ages titles.
export function useKidsPath(path) {
  const { kids } = useStore()
  if (!path || !kids) return path
  return path + (path.includes('?') ? '&' : '?') + 'kids=1'
}
