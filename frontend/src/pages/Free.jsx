import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Poster, { PagedGrid } from '../components/Poster'
import { CheckIcon, PlayIcon, PlusIcon, SearchIcon } from '../components/Icons'
import { BackButton, ErrorState, Loading } from '../components/States'
import { usePaged, useApi } from '../lib/api'
import { useStore } from '../lib/store'
import { mins, scorePct } from '../lib/format'

const ARCHIVE_NOTE = (
  <>
    Full-length films from the{' '}
    <a href="https://archive.org/details/feature_films" target="_blank" rel="noreferrer">
      Internet Archive
    </a>
    , free and legal to watch: mostly classics whose copyright has expired.
  </>
)

export function FreeList() {
  const { kids } = useStore()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const term = params.get('q') ?? ''

  useEffect(() => {
    const t = setTimeout(() => setParams(q.trim() ? { q: q.trim() } : {}, { replace: true }), 400)
    return () => clearTimeout(t)
  }, [q, setParams])

  const paged = usePaged(kids ? null : `/free${term ? `?q=${encodeURIComponent(term)}` : ''}`)
  if (kids) return <Navigate to="/" replace />

  return (
    <div className="wrap scr pad-top">
      <div>
        <h1 className="disp page-title">Free Movies</h1>
        <p className="muted page-note">{ARCHIVE_NOTE}</p>
      </div>
      <div className="search-in">
        <SearchIcon />
        <label htmlFor="fq" className="sr-only">
          Search free movies
        </label>
        <input id="fq" type="search" placeholder="Search free movies" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <PagedGrid paged={paged} empty={`No free movies match “${term}”.`} />
    </div>
  )
}

export function FreeTitle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { kids, inList, toggleList } = useStore()
  const res = useApi(kids ? null : `/free/${encodeURIComponent(id)}`)

  if (kids) return <Navigate to="/" replace />
  if (res.loading) return <Loading />
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />
  const t = res.data
  const saved = inList(t)

  return (
    <div className="detail">
      <div className="hero">
        <img className="hero-img" src={t.backdrop} alt="" />
        <div className="hero-top wrap">
          <BackButton fallback="/free" />
        </div>
      </div>
      <div className="wrap detail-body">
        <div className="detail-main">
          <span className="free">Full movie · Free</span>
          <h1 className="disp detail-title">{t.title}</h1>
          <div className="meta">
            {t.score > 0 && <span className="match">{scorePct(t.score)}% score</span>}
            {t.year && <span>{t.year}</span>}
            {t.runtime && <span>{mins(t.runtime)}</span>}
            {t.genres.length > 0 && <span>{t.genres.slice(0, 3).join(', ')}</span>}
          </div>
          <div className="detail-play">
            <button className="btn btn-primary btn-wide" disabled={!t.video} onClick={() => navigate(`/watch/free/${encodeURIComponent(t.id)}`)}>
              <PlayIcon /> Play full movie
            </button>
          </div>
          <p className="overview">{t.overview || 'No synopsis yet.'}</p>
          <div className="acts">
            <button className="act" aria-pressed={saved} onClick={() => toggleList(t)}>
              {saved ? <CheckIcon /> : <PlusIcon />}My List
            </button>
          </div>
        </div>
        <div className="detail-side">
          <section className="box-note">
            <p className="small muted">
              {ARCHIVE_NOTE}{' '}
              <a href={t.source} target="_blank" rel="noreferrer">
                View on archive.org
              </a>
              {t.tmdb_id && (
                <>
                  {' · '}
                  <Link to={`/title/movie/${t.tmdb_id}`}>Cast and details</Link>
                </>
              )}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

// HTML5 player for the Archive's MP4; remembers where you stopped.
export function FreePlayer() {
  const { id } = useParams()
  const close = useBackTo(`/free/${encodeURIComponent(id)}`)
  const { profile, kids, recordWatch } = useStore()
  const res = useApi(kids ? null : `/free/${encodeURIComponent(id)}`)
  const [broken, setBroken] = useState(false)
  const posKey = `palabas.pos.${profile?.id}.${id}`

  useEffect(() => {
    if (res.data) recordWatch({ ...res.data, s: null, e: null })
  }, [res.data]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (ev) => ev.key === 'Escape' && !document.fullscreenElement && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  if (!profile) return <Navigate to="/profiles" replace />
  if (kids) return <Navigate to="/" replace />
  if (res.loading) return <div className="player"><Loading /></div>
  if (res.error) return <div className="player"><ErrorState error={res.error} onRetry={res.reload} /></div>
  const t = res.data

  const restore = (ev) => {
    try {
      const at = Number(localStorage.getItem(posKey))
      if (at > 10 && at < ev.currentTarget.duration - 30) ev.currentTarget.currentTime = at
    } catch {
      /* storage blocked */
    }
  }
  const remember = (ev) => {
    const v = ev.currentTarget
    if (Math.floor(v.currentTime) % 5 !== 0) return
    try {
      localStorage.setItem(posKey, String(v.currentTime > v.duration - 30 ? 0 : Math.floor(v.currentTime)))
    } catch {
      /* storage blocked */
    }
  }

  return (
    <div className="player">
      <div className="pl-top">
        <BackButton fallback={`/free/${encodeURIComponent(id)}`} label="Close player" />
        <div className="t">
          <h2>{t.title}</h2>
          <p>{[t.year, t.runtime && mins(t.runtime), 'Full movie'].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="pl-stage">
        <div className="video">
          {t.video && !broken ? (
            <video
              src={t.video}
              poster={t.backdrop}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onLoadedMetadata={restore}
              onTimeUpdate={remember}
              onError={() => setBroken(true)}
            />
          ) : (
            <iframe src={t.embed} title={t.title} allow="autoplay; fullscreen" allowFullScreen />
          )}
        </div>
      </div>
      <div className="pl-info">
        <p className="ep-name">{t.title}</p>
        <p className="small pl-muted">{t.overview}</p>
        <p className="small pl-faint">
          Streaming from the Internet Archive. If it buffers, pause for a moment, or{' '}
          <a href={t.source} target="_blank" rel="noreferrer">
            open it on archive.org
          </a>
          .
        </p>
      </div>
    </div>
  )
}

function useBackTo(fallback) {
  const navigate = useNavigate()
  return () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(fallback))
}
