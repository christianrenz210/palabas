import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Poster, { PosterCard } from '../components/Poster'
import TrailerModal from '../components/TrailerModal'
import { CheckIcon, FilmIcon, PlayIcon, PlusIcon, ShareIcon, ThumbIcon } from '../components/Icons'
import { BackButton, ErrorState, Loading } from '../components/States'
import { useApi } from '../lib/api'
import { useStore } from '../lib/store'
import { lengthLabel, mins, scorePct } from '../lib/format'
import { watchUrl } from './Home'

function Episodes({ t, season, setSeason }) {
  const { watchedEpisode } = useStore()
  const res = useApi(`/title/tv/${t.id}/season/${season}`)
  return (
    <section>
      <div className="sec-h">
        <h2>Episodes</h2>
        {t.seasons.length > 1 && (
          <label className="season-select">
            <span className="sr-only">Season</span>
            <select value={season} onChange={(e) => setSeason(+e.target.value)}>
              {t.seasons.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {res.loading && <Loading label="Loading episodes" />}
      {res.error && <ErrorState error={res.error} onRetry={res.reload} />}
      {res.data && (
        <div className="eps">
          {res.data.episodes.length === 0 && <p className="empty-note">No episodes have aired yet.</p>}
          {res.data.episodes.map((ep) => {
            const watched = watchedEpisode(t, season, ep.number)
            return (
              <Link key={ep.number} to={watchUrl(t, season, ep.number)} className="ep">
                <div className="thumb">
                  <Poster src={ep.still || t.backdrop} title={t.title} wide />
                  <span className="play-ic">
                    <span>
                      <PlayIcon />
                    </span>
                  </span>
                  {watched && <span className="watched">Watched</span>}
                </div>
                <div>
                  <h3>
                    {ep.number}. {ep.name}
                  </h3>
                  <p>{mins(ep.runtime || t.runtime)}</p>
                  {ep.overview && <p className="ep-over">{ep.overview}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

const REGION_NAMES = { PH: 'the Philippines', US: 'the US', GB: 'the UK' }

// Streaming services that carry this title in the configured region (JustWatch data via TMDB).
function WhereToWatch({ providers, title }) {
  if (!providers) {
    return (
      <section>
        <div className="sec-h">
          <h2>Where to watch</h2>
        </div>
        <p className="small muted">{title} isn’t listed on any streaming service in your region yet.</p>
      </section>
    )
  }
  return (
    <section>
      <div className="sec-h">
        <h2>Where to watch</h2>
        <span className="muted small">in {REGION_NAMES[providers.region] ?? providers.region}</span>
      </div>
      <div className="providers">
        {providers.groups.map((g) => (
          <div className="prov-group" key={g.kind}>
            <span className="prov-label">{g.label}</span>
            <div className="prov-list">
              {g.services.map((p) => (
                <a key={p.id} href={providers.link} target="_blank" rel="noreferrer" className="prov" title={`${g.label} on ${p.name}`}>
                  {p.logo ? <img src={p.logo} alt="" /> : <span className="prov-fallback">{p.name[0]}</span>}
                  <span>{p.name}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="tiny muted">
        Availability from{' '}
        <a href="https://www.justwatch.com/" target="_blank" rel="noreferrer">
          JustWatch
        </a>
        . Opens the TMDB page with a link to each service.
      </p>
    </section>
  )
}

export default function Title() {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const res = useApi(`/title/${type}/${id}`)
  const { kids, inList, toggleList, isLiked, toggleLike, lastEpisode, toast } = useStore()
  const [trailer, setTrailer] = useState(false)
  const [season, setSeason] = useState(null)

  const t = res.data
  const rp = t ? lastEpisode(t, t.seasons?.[0]?.number ?? 1) : null

  useEffect(() => {
    if (t && t.type === 'tv' && season === null) setSeason(rp.s)
  }, [t]) // eslint-disable-line react-hooks/exhaustive-deps

  if (res.loading) return <Loading label="Loading" />
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />

  if (kids && !t.kids_safe) {
    return (
      <div className="wrap scr narrow pad-top">
        <div className="topbar">
          <BackButton />
          <h2>Not on the Kids profile</h2>
        </div>
        <p className="muted">{t.title} isn’t rated for all ages. Switch profiles to watch it.</p>
        <Link className="btn btn-primary btn-inline" to="/profiles">
          Switch profile
        </Link>
      </div>
    )
  }

  const saved = inList(t)
  const liked = isLiked(t)
  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: t.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('Link copied')
      }
    } catch {
      /* share sheet closed */
    }
  }

  return (
    <div className="detail">
      <div className="hero">
        {t.backdrop ? <img className="hero-img" src={t.backdrop} alt="" /> : <Poster src={t.poster} title={t.title} className="hero-img" />}
        <div className="hero-top wrap">
          <BackButton />
        </div>
      </div>

      <div className="wrap detail-body">
        <div className="detail-main">
          {t.tagline && <p className="tagline">{t.tagline}</p>}
          <h1 className="disp detail-title">{t.title}</h1>
          <div className="meta">
            {t.score > 0 && <span className="match">{scorePct(t.score)}% score</span>}
            {t.year && <span>{t.year}</span>}
            {t.rating && <span className="badge">{t.rating}</span>}
            <span>{lengthLabel(t)}</span>
            <span>{t.genres.slice(0, 3).join(', ')}</span>
          </div>

          <div className="detail-play">
            <button className="btn btn-primary btn-wide" onClick={() => navigate(watchUrl(t, rp.s, rp.e))}>
              <PlayIcon /> {t.type === 'movie' ? 'Play' : `${rp.watched ? 'Continue' : 'Play'} S${rp.s}:E${rp.e}`}
            </button>
            {t.free && !kids && (
              <Link className="btn btn-accent btn-wide" to={`/free/${encodeURIComponent(t.free)}`}>
                <PlayIcon /> Watch the full movie free
              </Link>
            )}
          </div>

          <p className="overview">{t.overview || 'No synopsis yet.'}</p>
          {t.cast.length > 0 && <p className="small muted">Starring {t.cast.slice(0, 4).map((c) => c.name).join(', ')}</p>}
          {t.credit && <p className="small muted">{t.credit}</p>}

          <div className="acts">
            <button className="act" aria-pressed={saved} onClick={() => toggleList(t)}>
              {saved ? <CheckIcon /> : <PlusIcon />}My List
            </button>
            <button className="act" aria-pressed={liked} onClick={() => toggleLike(t)}>
              <ThumbIcon />
              Rate
            </button>
            {t.trailer && (
              <button className="act" onClick={() => setTrailer(true)}>
                <FilmIcon />
                Trailer
              </button>
            )}
            <button className="act" onClick={share}>
              <ShareIcon />
              Share
            </button>
          </div>
        </div>

        <div className="detail-side">
          <WhereToWatch providers={t.providers} title={t.title} />

          {t.type === 'tv' && t.seasons.length > 0 && season !== null && <Episodes t={t} season={season} setSeason={setSeason} />}

          {t.cast.length > 0 && (
            <section>
              <div className="sec-h">
                <h2>Cast</h2>
              </div>
              <div className="cast">
                {t.cast.map((p) => (
                  <div className="person" key={p.id}>
                    {p.photo ? <img className="face" src={p.photo} alt="" loading="lazy" /> : <span className="face">{p.name[0]}</span>}
                    <span className="ink">{p.name}</span>
                    {p.character && <span>{p.character}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {t.more.length > 0 && (
            <section>
              <div className="sec-h">
                <h2>More like this</h2>
              </div>
              <div className="grid">
                {t.more.map((x) => (
                  <PosterCard key={`${x.type}-${x.id}`} t={x} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {trailer && <TrailerModal videoKey={t.trailer} title={t.title} onClose={() => setTrailer(false)} />}
    </div>
  )
}