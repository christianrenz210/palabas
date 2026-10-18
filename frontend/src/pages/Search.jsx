import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Poster, { titleUrl } from '../components/Poster'
import { PlayIcon, SearchIcon } from '../components/Icons'
import { ErrorState, Loading } from '../components/States'
import { useApi } from '../lib/api'
import { useKidsPath } from '../lib/store'
import { kindLabel } from '../lib/format'

const GENRE_COL = {
  action: '#f08a78',
  comedy: '#f6c445',
  drama: '#9cc3bd',
  thriller: '#e48a6b',
  horror: '#d77a8f',
  romance: '#f0a4b8',
  scifi: '#c7a9ff',
  crime: '#a9b8d6',
  animation: '#ffd27a',
  family: '#b5d99c',
  adventure: '#8fd1c4',
  documentary: '#d9c9a3',
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [debounced, setDebounced] = useState(q.trim())

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim())
      setParams(q.trim() ? { q: q.trim() } : {}, { replace: true })
    }, 350)
    return () => clearTimeout(t)
  }, [q, setParams])

  const genres = useApi(useKidsPath('/genres'))
  const res = useApi(useKidsPath(debounced.length >= 2 ? `/search?q=${encodeURIComponent(debounced)}` : null))

  return (
    <div className="wrap scr pad-top">
      <h1 className="disp page-title">Search</h1>
      <div className="search-in">
        <SearchIcon />
        <label htmlFor="q" className="sr-only">
          Search shows and movies
        </label>
        <input id="q" type="search" placeholder="Shows, movies, cast" autoComplete="off" autoFocus value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {debounced.length < 2 && genres.data && (
        <section>
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            Browse by genre
          </p>
          <div className="genres">
            {genres.data.genres.map((g) => (
              <Link key={g.slug} to={`/?genre=${g.slug}`} className="genre-tile" style={{ background: GENRE_COL[g.slug] }}>
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {res.loading && <Loading label="Searching" />}
      {res.error && <ErrorState error={res.error} onRetry={res.reload} />}
      {res.data &&
        (res.data.results.length === 0 ? (
          <p className="empty-note">Nothing matches “{debounced}”. Try a title, an actor or a genre.</p>
        ) : (
          <div className="tlist">
            {res.data.results.map((t) => (
              <Link key={`${t.type}-${t.id}`} to={titleUrl(t)} className="titem">
                <Poster src={t.backdrop || t.poster} title={t.title} wide showTitle={!t.backdrop} />
                <div>
                  <h3>{t.title}</h3>
                  <p className="muted small">{[kindLabel(t), t.genres[0], t.year].filter(Boolean).join(' · ')}</p>
                  {t.matched_cast && <p className="muted small">With {t.matched_cast}</p>}
                </div>
                <span className="pbtn" aria-hidden="true">
                  <PlayIcon />
                </span>
              </Link>
            ))}
          </div>
        ))}
    </div>
  )
}
