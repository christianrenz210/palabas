import { Link, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import Profiles from './pages/Profiles'
import Home from './pages/Home'
import Title from './pages/Title'
import Catalog from './pages/Catalog'
import { FreeList, FreePlayer, FreeTitle } from './pages/Free'
import Search from './pages/Search'
import MyList from './pages/MyList'
import Player from './pages/Player'

function NotFound() {
  return (
    <div className="wrap scr narrow pad-top">
      <h1 className="disp page-title">Lost in the dark</h1>
      <p className="muted">That page doesn’t exist.</p>
      <Link className="btn btn-primary btn-inline" to="/">
        Back to home
      </Link>
    </div>
  )
}

// A fresh page for each title, so season picks don't carry over.
function TitlePage() {
  const { type, id } = useParams()
  return <Title key={`${type}-${id}`} />
}

export default function App() {
  return (
    <Routes>
      <Route path="profiles" element={<Profiles />} />
      <Route path="watch/free/:id" element={<FreePlayer />} />
      <Route path="watch/movie/:id" element={<Player />} />
      <Route path="watch/:type/:id/:s/:e" element={<Player />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="movies" element={<Catalog key="movie" type="movie" />} />
        <Route path="tv" element={<Catalog key="tv" type="tv" />} />
        <Route path="free" element={<FreeList />} />
        <Route path="free/:id" element={<FreeTitle />} />
        <Route path="title/:type/:id" element={<TitlePage />} />
        <Route path="search" element={<Search />} />
        <Route path="my-list" element={<MyList />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
