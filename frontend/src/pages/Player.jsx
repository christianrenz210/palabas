import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Poster from '../components/Poster'
import VidApiPlayer from '../components/VidApiPlayer'
import YouTubePlayer from '../components/YouTubePlayer'
import { DownIcon, NextIcon, PlayIcon } from '../components/Icons'
import { ErrorState, Loading, useBack } from '../components/States'
import { useApi } from '../lib/api'
import { useStore } from '../lib/store'
import { mins } from '../lib/format'

const SOURCE = { episode: 'This episode', season: 'This season', title: '' }

function EpsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 22, height: 22 }}>
      <rect x="3" y="8" width="14" height="12" rx="1.5" />
      <path d="M7 4.5h13.5V16" />
    </svg>
  )
}

function CinePlayer({ t, s, e, season, videos }) {
  const navigate = useNavigate()
  const close = useBack(`/title/${t.type}/${t.id}`)
  const { recordWatch, toast } = useStore()

  const [mode, setMode] = useState('stream')
  const [ytIdx, setYtIdx] = useState(0)
  const [ytFailed, setYtFailed] = useState([])
  const ytFailedRef = useRef([])
  const [ended, setEnded] = useState(false)
  const [nextIn, setNextIn] = useState(null)
  const [showEps, setShowEps] = useState(false)
  const [idle, setIdle] = useState(false)
  const idleTimer = useRef(null)

  const wake = useCallback(() => {
    setIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdle(true), 3000)
  }, [])

  useEffect(() => {
    wake()
    return () => clearTimeout(idleTimer.current)
  }, [wake])

  const isTv = t.type === 'tv'
  const ep = season?.episodes.find((x) => x.number === e)

  let next = null
  if (isTv && season) {
    const i = season.episodes.findIndex((x) => x.number === e)
    if (i >= 0 && i + 1 < season.episodes.length) {
      const n = season.episodes[i + 1]
      next = { s, e: n.number, name: n.name, still: n.still, runtime: n.runtime }
    } else {
      const ns = t.seasons[t.seasons.findIndex((x) => x.number === s) + 1]
      if (ns) next = { s: ns.number, e: 1, name: `${ns.name} begins` }
    }
  }

  useEffect(() => {
    const { type, id, title, poster, backdrop, year, genres, overview, score } = t
    recordWatch({ type, id, title, poster, backdrop, year, genres, overview, score, s, e, epName: ep?.name, still: ep?.still })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = useCallback(() => {
    if (next) navigate(`/watch/tv/${t.id}/${next.s}/${next.e}`, { replace: true })
  }, [next, navigate, t.id])

  useEffect(() => {
    if (nextIn === null) return
    if (nextIn <= 0) return goNext()
    const timer = setTimeout(() => setNextIn((n) => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [nextIn, goNext])

  useEffect(() => {
    const onKey = (ev) => ev.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const onStreamEnded = useCallback(() => {
    setEnded(true)
    if (next) setNextIn(5)
  }, [next])

  const playableYt = videos.filter((v) => !ytFailed.includes(v.key))
  const allYtFailed = videos.length > 0 && playableYt.length === 0

  const markYtFailed = (key, notify) => {
    if (ytFailedRef.current.includes(key)) return
    const bad = [...ytFailedRef.current, key]
    ytFailedRef.current = bad
    setYtFailed(bad)
    if (videos[ytIdx]?.key !== key) return
    const next_ = videos.findIndex((v, i) => i > ytIdx && !bad.includes(v.key))
    const any = next_ >= 0 ? next_ : videos.findIndex((v) => !bad.includes(v.key))
    if (any >= 0) {
      if (notify) toast("That video can’t play here. Trying the next one.")
      setYtIdx(any)
    }
  }

  const pickTrailer = (i) => { setYtIdx(i); setMode('trailer') }

  const subtitle = isTv
    ? `S${s}:E${e}${ep ? ` · ${ep.name}` : ''}`
    : [t.year, t.runtime && mins(t.runtime)].filter(Boolean).join(' · ')

  return (
    <div className="cine">
      {/* ── Stage ── */}
      <div
        className={`cine-stage${idle ? ' idle' : ''}`}
        onPointerMove={wake}
        onPointerDown={wake}
      >
        {/* Shade gradient for top-bar readability */}
        <div className="cine-shade" aria-hidden="true" />

        {/* Top bar — absolute overlay */}
        <div className="cine-top">
          <button className="cine-back" aria-label="Close player" onClick={close}>
            <DownIcon />
          </button>
          <span className="cine-logo">Movie<span>Scene</span></span>
          <div className="cine-meta">
            <h2 className="cine-title">{t.title}</h2>
            <p className="cine-sub">{subtitle}</p>
          </div>
          <div className="cine-acts">
            {isTv && season && (
              <button
                className={`cine-ib${showEps ? ' active' : ''}`}
                aria-label="Episodes"
                aria-pressed={showEps}
                onClick={() => setShowEps((v) => !v)}
              >
                <EpsIcon />
              </button>
            )}
            {videos.length > 0 && (
              <button className="cine-mode-btn" onClick={() => setMode((m) => (m === 'stream' ? 'trailer' : 'stream'))}>
                {mode === 'stream' ? 'Trailers' : 'Watch'}
              </button>
            )}
          </div>
        </div>

        {/* Video screen — fills stage */}
        <div className="cine-screen">
          {mode === 'stream' ? (
            <VidApiPlayer
              key={`${t.type}-${t.id}-${s}-${e}`}
              type={t.type} id={t.id} season={s} episode={e}
              onEnded={onStreamEnded}
            />
          ) : videos.length === 0 || allYtFailed ? (
            <div className="no-video">
              <Poster src={(isTv && ep?.still_lg) || t.backdrop} title={t.title} wide className="frame" />
              <div className="next-ov">
                <p><b>No trailers available.</b></p>
                {allYtFailed && (
                  <a className="btn btn-primary" href={`https://www.youtube.com/watch?v=${videos[0].key}`} target="_blank" rel="noreferrer">
                    Watch on YouTube
                  </a>
                )}
                <button className="btn btn-ghost" onClick={() => setMode('stream')}>Back to stream</button>
              </div>
            </div>
          ) : (
            <YouTubePlayer
              videoKey={videos[ytIdx]?.key}
              onError={() => markYtFailed(videos[ytIdx]?.key, true)}
              onEnded={() => {}}
            />
          )}
        </div>

        {/* Next-episode card — overlaid above screen */}
        {mode === 'stream' && ended && (
          <div className="cine-nextcard">
            {next ? (
              <>
                <span className="nc-lbl">Up next</span>
                <h3>{isTv ? `S${next.s}:E${next.e} · ${next.name}` : t.title}</h3>
                <div className="nc-btns">
                  <button className="btn btn-primary nc-play" onClick={goNext}>
                    <PlayIcon /> Play now {nextIn !== null && <span className="nc-count">{nextIn}</span>}
                  </button>
                  <button className="btn btn-ghost nc-cancel" onClick={() => { setNextIn(null); setEnded(false) }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <Link className="btn btn-ghost" to={`/title/${t.type}/${t.id}`} replace>
                Back to {t.title}
              </Link>
            )}
          </div>
        )}

        {/* Episodes panel */}
        {isTv && season && (
          <div className={`cine-eps${showEps ? ' open' : ''}`} aria-hidden={!showEps}>
            <div className="cine-eps-head">
              <h3>Season {s}</h3>
              <button className="cine-ib" onClick={() => setShowEps(false)} aria-label="Close episodes">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }} aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="cine-eps-list">
              {season.episodes.map((ep_) => (
                <button
                  key={ep_.number}
                  className={`cine-ep${ep_.number === e ? ' cur' : ''}`}
                  onClick={() => { navigate(`/watch/tv/${t.id}/${s}/${ep_.number}`, { replace: true }); setShowEps(false) }}
                >
                  <span className="cine-ep-n">{ep_.number}</span>
                  <div className="cine-ep-info">
                    <b>{ep_.name}</b>
                    {ep_.overview && <small>{ep_.overview}</small>}
                  </div>
                  {ep_.runtime && <span className="cine-ep-dur">{mins(ep_.runtime)}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>{/* end cine-stage */}

      {/* ── Info strip ── */}
      <div className="cine-info">
        <p className="cine-ep-name">{isTv ? ep?.name ?? `Episode ${e}` : t.title}</p>
        <p className="cine-overview">{(isTv && ep?.overview) || t.overview}</p>

        {next && mode === 'stream' && !ended && (
          <div className="cine-upnext">
            <span className="eyebrow">Up next</span>
            <button className="upnext" onClick={goNext}>
              <Poster src={next.still || t.backdrop} title={t.title} wide />
              <div>
                <h3>S{next.s}:E{next.e} &middot; {next.name}</h3>
                {next.runtime && <p>{mins(next.runtime)}</p>}
              </div>
            </button>
          </div>
        )}

        {videos.length > 0 && (
          <>
            <p className="eyebrow cine-section">Trailers &amp; Clips</p>
            <div className="vlist">
              {videos.map((v, i) => {
                const bad = ytFailed.includes(v.key)
                return (
                  <button key={v.key} className="vitem" aria-current={mode === 'trailer' && i === ytIdx} disabled={bad} onClick={() => pickTrailer(i)}>
                    <span className="vthumb">
                      <img
                        src={`https://i.ytimg.com/vi/${v.key}/mqdefault.jpg`}
                        alt=""
                        onError={() => markYtFailed(v.key, false)}
                        onLoad={(ev) => ev.currentTarget.naturalWidth < 200 && markYtFailed(v.key, false)}
                      />
                      {mode === 'trailer' && i === ytIdx && <span className="now">Playing</span>}
                    </span>
                    <span>
                      <b>{v.name}</b>
                      <small>{bad ? 'Unavailable' : [SOURCE[v.source], v.type].filter(Boolean).join(' · ')}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Player() {
  const params = useParams()
  const { id, s, e } = params
  const type = params.type ?? 'movie'
  const { profile, kids } = useStore()
  const title = useApi(`/title/${type}/${id}`)
  const season = useApi(type === 'tv' ? `/title/tv/${id}/season/${s}` : null)
  const videos = useApi(type === 'tv' ? `/videos/tv/${id}?season=${s}&episode=${e}` : `/videos/movie/${id}`)

  if (!profile) return <Navigate to="/profiles" replace />
  if (title.loading) return <div className="player"><Loading /></div>
  if (title.error) return <div className="player"><ErrorState error={title.error} onRetry={title.reload} /></div>
  if (kids && !title.data.kids_safe) return <Navigate to={`/title/${type}/${id}`} replace />
  if (type === 'tv' && season.loading) return <div className="player"><Loading /></div>
  if (season.error) return <div className="player"><ErrorState error={season.error} onRetry={season.reload} /></div>

  return <CinePlayer key={`${type}-${id}-${s}-${e}`} t={title.data} s={+s || null} e={+e || null} season={season.data} videos={videos.data?.videos ?? []} />
}
