import { Link } from 'react-router-dom'

// Artwork from TMDB, with a generated fallback when a title has none.
const PALETTE = [
  ['#1d4b57', '#e8c26a'],
  ['#2a1c48', '#ff7eb6'],
  ['#262628', '#cf5a3f'],
  ['#34507a', '#f4d35e'],
  ['#56391f', '#9cc3bd'],
  ['#3b4a3a', '#d9e4c8'],
]

function hash(s) {
  let h = 2166136261
  for (const c of String(s)) {
    h ^= c.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export default function Poster({ src, title, wide = false, showTitle = false, tag, className = '', eager = false, children }) {
  const [bg, fg] = PALETTE[hash(title) % PALETTE.length]
  return (
    <div
      className={`poster${wide ? ' wide' : ''} ${className}`}
      style={src ? undefined : { backgroundColor: bg, backgroundImage: `linear-gradient(to top,rgba(0,0,0,.6),rgba(0,0,0,0) 55%),radial-gradient(circle at 50% 36%,${fg} 0 21%,transparent 21.5%)` }}
    >
      {src && <img src={src} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />}
      {tag && <span className="tag">{tag}</span>}
      {(showTitle || !src) && <span className="ptitle">{title}</span>}
      {children}
    </div>
  )
}

export const titleUrl = (t) => (t.type === 'free' ? `/free/${encodeURIComponent(t.id)}` : `/title/${t.type}/${t.id}`)

export function PosterCard({ t, tag }) {
  return (
    <Link to={titleUrl(t)} className="card" aria-label={t.title} title={t.title}>
      <Poster src={t.poster} title={t.title} tag={tag ?? (t.type === 'free' ? 'Full movie' : undefined)} showTitle={t.type === 'free' && t.poster?.includes('archive.org')} />
    </Link>
  )
}

// Grid of poster cards with a "Load more" button, for usePaged() lists.
export function PagedGrid({ paged, empty = 'Nothing here yet.' }) {
  return (
    <>
      {paged.items.length > 0 && (
        <div className="grid">
          {paged.items.map((t) => (
            <PosterCard key={`${t.type}-${t.id}`} t={t} />
          ))}
        </div>
      )}
      {!paged.loading && !paged.error && paged.page > 0 && paged.items.length === 0 && <p className="empty-note">{empty}</p>}
      {paged.error && (
        <div className="state state-error" role="alert">
          <p>{paged.error.message}</p>
          <button className="btn btn-ghost" onClick={paged.retry}>
            Try again
          </button>
        </div>
      )}
      {paged.loading && (
        <div className="state" role="status">
          <span className="spin" aria-hidden="true" />
        </div>
      )}
      {!paged.loading && !paged.error && !paged.done && paged.items.length > 0 && (
        <button className="btn btn-ghost load-more" onClick={paged.loadMore}>
          Load more
        </button>
      )}
    </>
  )
}

export function Top10Card({ t, rank }) {
  return (
    <Link to={titleUrl(t)} className="top10" aria-label={`Number ${rank}: ${t.title}`}>
      <span className="num" aria-hidden="true">
        {rank}
      </span>
      <Poster src={t.poster} title={t.title} />
    </Link>
  )
}
