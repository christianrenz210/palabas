// "1:05:09" or "4:09"
export function clock(s) {
  s = Math.max(0, Math.floor(s))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const x = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`
}

export const mins = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`)

export const lengthLabel = (t) => {
  if (t.type === 'movie') return t.runtime ? mins(t.runtime) : 'Movie'
  const n = t.seasons?.length
  return n ? `${n} season${n > 1 ? 's' : ''}` : 'Series'
}

export const kindLabel = (t) => (t.type === 'tv' ? 'Series' : 'Movie')

export const scorePct = (score) => Math.round(score * 10)

export const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

export const itemKey = (t) => `${t.type}-${t.id}`
export const episodeKey = (id, s, e) => `tv-${id}-${s}-${e}`
