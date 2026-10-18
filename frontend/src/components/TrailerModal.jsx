import { useEffect, useState } from 'react'
import YouTubePlayer from './YouTubePlayer'
import { CloseIcon } from './Icons'

export default function TrailerModal({ videoKey, title, onClose }) {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`${title} trailer`} onClick={onClose}>
      <div className="modal-in" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-close" aria-label="Close trailer" onClick={onClose}>
          <CloseIcon />
        </button>
        {blocked ? (
          <div className="next-ov">
            <p>This trailer can’t play inside Palabas.</p>
            <a className="btn btn-primary" href={`https://www.youtube.com/watch?v=${videoKey}`} target="_blank" rel="noreferrer">
              Watch on YouTube
            </a>
          </div>
        ) : (
          <YouTubePlayer videoKey={videoKey} onError={() => setBlocked(true)} />
        )}
      </div>
    </div>
  )
}
