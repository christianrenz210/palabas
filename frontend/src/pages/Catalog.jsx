import { useSearchParams } from 'react-router-dom'
import { PagedGrid } from '../components/Poster'
import { usePaged } from '../lib/api'
import { useKidsPath } from '../lib/store'

// The Movies and TV Shows pages: a list (popular, top rated…) plus an optional genre.
export default function Catalog({ type }) {
  const [params, setParams] = useSearchParams()
  const list = params.get('list') ?? 'popular'
  const genre = params.get('genre') ?? ''
  const paged = usePaged(useKidsPath(`/catalog/${type}?list=${list}${genre ? `&genre=${genre}` : ''}`))
  const meta = paged.meta

  const set = (key, value) => {
    const next = { list, genre, [key]: value }
    setParams(Object.fromEntries(Object.entries(next).filter(([k, v]) => v && !(k === 'list' && v === 'popular'))))
  }

  return (
    <div className="wrap scr pad-top">
      <h1 className="disp page-title">{type === 'movie' ? 'Movies' : 'TV Shows'}</h1>

      {meta && (
        <div className="filters">
          <div className="tabs" role="group" aria-label="List">
            {Object.entries(meta.lists).map(([key, label]) => (
              <button key={key} className="tab-btn" aria-pressed={list === key} onClick={() => set('list', key)}>
                {label}
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Genre">
            <button className="chip" aria-pressed={!genre} onClick={() => set('genre', '')}>
              All genres
            </button>
            {meta.genres.map((g) => (
              <button key={g.slug} className="chip" aria-pressed={genre === g.slug} onClick={() => set('genre', g.slug)}>
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <PagedGrid paged={paged} empty="No titles match these filters." />
    </div>
  )
}
