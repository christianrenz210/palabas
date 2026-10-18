import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Poster, { PosterCard, Top10Card, titleUrl } from '../components/Poster'
import Row from '../components/Row'
import { CheckIcon, PlayIcon, PlusIcon } from '../components/Icons'
import { ErrorState, Loading, SkeletonRows } from '../components/States'
import { useApi } from '../lib/api'
import { useKidsPath, useStore } from '../lib/store'
import { kindLabel } from '../lib/format'

export function watchUrl(t, s, e) {
  if (t.type === 'free') return `/watch/free/${encodeURIComponent(t.id)}`
  return t.type === 'movie' ? `/watch/movie/${t.id}` : `/watch/tv/${t.id}/${s}/${e}`
}

function Billboard({ t }) {
  const navigate = useNavigate()
  const { inList, toggleList, lastEpisode } = useStore()
  const saved = inList(t)
  const play = () => {
    if (t.type === 'movie') return navigate(watchUrl(t))
    const ep = lastEpisode(t)
    navigate(watchUrl(t, ep.s, ep.e))
  }
  return (
    <div className="bill">
      <img className="bill-img" src={t.backdrop} alt="" />
      <div className="bill-body wrap">
        <span className="free">{t.type === 'tv' ? 'Series' : 'Film'}</span>
        <h1 className="disp">{t.title}</h1>
        <p className="bill-meta">{[kindLabel(t), t.genres.slice(0, 2).join(', '), t.year].filter(Boolean).join(' · ')}</p>
        <p className="bill-over">{t.overview}</p>
        <div className="btn-row bill-btns">
          <button className="btn btn-primary" onClick={play}>
            <PlayIcon /> Play
          </button>
          <button className="btn btn-ghost" onClick={() => toggleList(t)}>
            {saved ? <CheckIcon /> : <PlusIcon />} {saved ? 'In My List' : 'My List'}
          </button>
          <Link className="btn btn-ghost bill-info" to={titleUrl(t)}>
            More info
          </Link>
        </div>
      </div>
    </div>
  )
}

function RecentRow() {
  const { recent, profile } = useStore()
  if (!recent.length) return null
  return (
    <Row title={`Continue watching for ${profile.name}`}>
      {recent.map((c) => (
        <Link key={`${c.type}-${c.id}`} to={watchUrl(c, c.s, c.e)} className="cw">
          <Poster src={c.still || c.backdrop} title={c.title} wide showTitle>
            <span className="cw-play" aria-hidden="true">
              <PlayIcon />
            </span>
          </Poster>
          <div>
            <h3>{c.title}</h3>
            <p>{c.type === 'tv' ? `S${c.s}:E${c.e}${c.epName ? ` · ${c.epName}` : ''}` : [c.year, c.genres?.[0]].filter(Boolean).join(' · ')}</p>
          </div>
        </Link>
      ))}
    </Row>
  )
}

function GenreGrid({ slug }) {
  const res = useApi(useKidsPath(`/browse/${slug}`))
  if (res.loading) return <Loading />
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />
  return (
    <section>
      <div className="sec-h">
        <h2>{res.data.genre}</h2>
        <span className="muted small">{res.data.results.length} titles</span>
      </div>
      <div className="grid">
        {res.data.results.map((t) => (
          <PosterCard key={`${t.type}-${t.id}`} t={t} />
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const [params, setParams] = useSearchParams()
  const genre = params.get('genre')
  const home = useApi(useKidsPath('/home'))
  const genres = useApi(useKidsPath('/genres'))
  const { list, kids } = useStore()
  const free = useApi(kids ? null : '/free')
  const year = new Date().getFullYear()

  return (
    <div className="home">
      {home.data?.billboard ? <Billboard t={home.data.billboard} /> : <div className="bill bill-empty" />}

      <div className="wrap scr home-body">
        {genres.data && (
          <div className="chips" role="group" aria-label="Filter by genre">
            <button className="chip" aria-pressed={!genre} onClick={() => setParams({})}>
              All
            </button>
            {genres.data.genres.map((g) => (
              <button key={g.slug} className="chip" aria-pressed={genre === g.slug} onClick={() => setParams({ genre: g.slug })}>
                {g.name}
              </button>
            ))}
          </div>
        )}

        {genre ? (
          <GenreGrid slug={genre} />
        ) : (
          <>
            {home.loading && <SkeletonRows />}
            {home.error && <ErrorState error={home.error} onRetry={home.reload} />}
            <RecentRow />
            {home.data?.rows.map((row, i) => (
              <div key={row.id} style={{ display: 'contents' }}>
                {row.style === 'top10' ? (
                  <Row title={row.title} className="row-top10">
                    {row.items.map((t, n) => (
                      <Top10Card key={`${t.type}-${t.id}`} t={t} rank={n + 1} />
                    ))}
                  </Row>
                ) : (
                  <Row title={row.title}>
                    {row.items.map((t) => (
                      <PosterCard key={`${t.type}-${t.id}`} t={t} tag={t.year === year && row.id !== 'new' ? 'New' : undefined} />
                    ))}
                  </Row>
                )}
                {i === 0 && free.data?.results.length > 0 && (
                  <Row
                    title="Free full movies"
                    aside={
                      <Link to="/free" className="see-all">
                        See all
                      </Link>
                    }
                  >
                    {free.data.results.map((t) => (
                      <PosterCard key={t.id} t={t} />
                    ))}
                  </Row>
                )}
                {i === 1 && list.length > 0 && (
                  <Row title="My List">
                    {list.map((t) => (
                      <PosterCard key={`${t.type}-${t.id}`} t={t} />
                    ))}
                  </Row>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
