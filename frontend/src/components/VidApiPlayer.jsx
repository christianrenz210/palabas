import { useEffect, useRef } from 'react'
import { ScreenOrientation } from '@capacitor/screen-orientation'

function storageKey(type, id, season, episode) {
  return `vap_${type}_${id}${season != null ? `_${season}_${episode}` : ''}`
}

function getResumeAt(key) {
  try {
    const v = parseFloat(localStorage.getItem(key) || '0')
    return v > 30 ? v : 0
  } catch {
    return 0
  }
}

/**
 * Embeds a vaplayer.ru player for full movie or TV-episode playback.
 * Progress is saved to localStorage so the user can resume later.
 * Fires onEnded() when the media reaches its end.
 */
export default function VidApiPlayer({ type, id, season, episode, onEnded }) {
  const key = storageKey(type, id, season, episode)
  const resumeAt = useRef(getResumeAt(key)).current

  const base =
    type === 'tv'
      ? `https://vaplayer.ru/embed/tv/${id}/${season}/${episode}`
      : `https://vaplayer.ru/embed/movie/${id}`

  const params = new URLSearchParams({ color: '#f2b544', autoplay: '1' })
  if (resumeAt > 0) params.set('resumeAt', String(Math.floor(resumeAt)))
  const src = `${base}?${params}`

  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  useEffect(() => {
    const handle = (ev) => {
      if (ev.data?.type !== 'PLAYER_EVENT') return
      const d = ev.data.data
      if (!d) return
      if (d.player_status === 'completed') {
        try { localStorage.removeItem(key) } catch {}
        onEndedRef.current?.()
      } else if (d.player_progress != null) {
        try { localStorage.setItem(key, String(d.player_progress)) } catch {}
      }
    }
    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [key])

  useEffect(() => {
    const lockLandscape = async () => {
      try { await ScreenOrientation.lock({ orientation: 'landscape' }) } catch {
        try { await screen.orientation?.lock?.('landscape') } catch {}
      }
    }
    const unlockOrientation = async () => {
      try { await ScreenOrientation.unlock() } catch {
        try { screen.orientation?.unlock?.() } catch {}
      }
    }
    const onFsChange = () => {
      const fs = !!(document.fullscreenElement || document.webkitFullscreenElement)
      if (fs) lockLandscape()
      else unlockOrientation()
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
      unlockOrientation()
    }
  }, [])

  return <iframe src={src} className="vap" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen />
}
