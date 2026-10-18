import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../lib/store'
import { FilmIcon, HomeIcon, PlayCircleIcon, PlusIcon, SearchIcon, TvIcon } from './Icons'

const ALL_TABS = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/movies', label: 'Movies', icon: FilmIcon },
  { to: '/tv', label: 'TV Shows', short: 'TV', icon: TvIcon },
  { to: '/free', label: 'Free Movies', short: 'Free', icon: PlayCircleIcon, adultsOnly: true },
  { to: '/my-list', label: 'My List', icon: PlusIcon },
]

export function Logo() {
  return (
    <span className="logo">
      Pala<span>bas</span>
    </span>
  )
}

export function Avatar({ profile, size = 36 }) {
  return (
    <span className="avatar" style={{ background: profile.color, width: size, height: size }} aria-hidden="true">
      {profile.name[0]?.toUpperCase()}
    </span>
  )
}

export default function Layout() {
  const { pathname, search } = useLocation()
  const { profile, toastMsg } = useStore()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, search])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!profile) return <Navigate to="/profiles" replace />

  const TABS = ALL_TABS.filter((t) => !(t.adultsOnly && profile.kids))
  const overlay = pathname === '/' || pathname.startsWith('/title/') || /^\/free\/./.test(pathname)

  return (
    <div className="app">
      <header className={`site-head ${overlay ? 'overlay' : ''} ${scrolled || !overlay ? 'solid' : ''}`}>
        <div className="wrap site-head-in">
          <div className="head-left">
            <Link to="/" aria-label="Palabas home">
              <Logo />
            </Link>
            <nav className="top-nav" aria-label="Main">
              {TABS.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end}>
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="head-right">
            <NavLink to="/search" className="head-search" aria-label="Search">
              <SearchIcon />
            </NavLink>
            {profile.kids && <span className="kids-pill">Kids</span>}
            <Link to="/profiles" className="avatar-btn" aria-label={`Switch profile, current: ${profile.name}`}>
              <Avatar profile={profile} />
            </Link>
          </div>
        </div>
      </header>

      <main className={overlay ? 'main main-overlay' : 'main'}>
        <Outlet />
      </main>

      <footer className="wrap site-foot">
        <p>
          Titles, artwork, details and videos come from{' '}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB. Free full movies stream from the{' '}
          <a href="https://archive.org/details/feature_films" target="_blank" rel="noreferrer">
            Internet Archive
          </a>
          . Where-to-watch data from{' '}
          <a href="https://www.justwatch.com/" target="_blank" rel="noreferrer">
            JustWatch
          </a>
          .
        </p>
      </footer>

      <nav className="tabbar" aria-label="App tabs">
        {TABS.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="tab">
            <Icon />
            {short ?? label}
          </NavLink>
        ))}
      </nav>

      <Toast msg={toastMsg} />
    </div>
  )
}

export function Toast({ msg }) {
  return (
    <div className={`toast ${msg ? 'show' : ''}`} role="status" aria-live="polite">
      {msg?.text}
    </div>
  )
}