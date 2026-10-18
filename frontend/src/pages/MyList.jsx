import { Link } from 'react-router-dom'
import { PosterCard } from '../components/Poster'
import { PlusIcon } from '../components/Icons'
import { useStore } from '../lib/store'

export default function MyList() {
  const { list, profile } = useStore()

  return (
    <div className="wrap scr pad-top">
      <h1 className="disp page-title">My List</h1>
      {list.length ? (
        <>
          <div className="grid">
            {list.map((t) => (
              <PosterCard key={`${t.type}-${t.id}`} t={t} />
            ))}
          </div>
          <p className="small muted">
            {list.length} saved for {profile.name} · tap a title to watch
          </p>
        </>
      ) : (
        <div className="empty-note empty-big">
          <div className="icon-btn" style={{ width: 64, height: 64 }}>
            <PlusIcon />
          </div>
          <p>
            <b className="ink">Nothing saved yet</b>
            <br />
            Tap My List on any show or movie to keep it here for later.
          </p>
          <Link className="btn btn-primary" to="/">
            Find something to watch
          </Link>
        </div>
      )}
    </div>
  )
}
