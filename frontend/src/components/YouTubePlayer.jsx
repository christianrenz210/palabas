import { useEffect, useRef } from 'react'

let apiPromise
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiPromise ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  })
  return apiPromise
}

/**
 * Embedded YouTube player. Calls onError(code) when a video can't play here
 * (removed, private, or embedding disabled) and onEnded() when it finishes.
 */
export default function YouTubePlayer({ videoKey, onError, onEnded }) {
  const host = useRef(null)
  const player = useRef(null)
  const ready = useRef(false)
  const handlers = useRef({ onError, onEnded })
  handlers.current = { onError, onEnded }
  const keyRef = useRef(videoKey)
  keyRef.current = videoKey

  useEffect(() => {
    let cancelled = false
    // YouTube replaces this element with an iframe, so keep it out of React's tree.
    const el = document.createElement('div')
    host.current.appendChild(el)
    loadYouTubeApi().then((YT) => {
      if (cancelled) return
      player.current = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com',
        videoId: keyRef.current,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            ready.current = true
            if (player.current.getVideoData?.().video_id !== keyRef.current) player.current.loadVideoById(keyRef.current)
          },
          onError: (e) => handlers.current.onError?.(e.data),
          onStateChange: (e) => e.data === YT.PlayerState.ENDED && handlers.current.onEnded?.(),
        },
      })
    })
    return () => {
      cancelled = true
      ready.current = false
      player.current?.destroy?.()
      player.current = null
      if (host.current) host.current.innerHTML = ''
    }
  }, [])

  useEffect(() => {
    if (ready.current && videoKey) player.current?.loadVideoById(videoKey)
  }, [videoKey])

  return <div className="yt" ref={host} />
}
