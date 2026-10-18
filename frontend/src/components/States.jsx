import { useNavigate } from 'react-router-dom'
import { BackIcon } from './Icons'

export function Loading({ label = 'Loading' }) {
  return (
    <div className="state" role="status">
      <span className="spin" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <p>
        <b>Something went wrong.</b>
        <br />
        {error?.message || 'Please try again.'}
      </p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function useBack(fallback = '/') {
  const navigate = useNavigate()
  return () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(fallback))
}

export function BackButton({ fallback = '/', label = 'Back', className = 'icon-btn', children }) {
  const back = useBack(fallback)
  return (
    <button className={className} aria-label={label} onClick={back}>
      {children ?? <BackIcon />}
    </button>
  )
}

export function SkeletonRows({ rows = 3 }) {
  return Array.from({ length: rows }, (_, r) => (
    <section className="row-sec" key={r} aria-hidden="true">
      <div className="skeleton skel-h" />
      <div className="rail">
        {Array.from({ length: 8 }, (_, i) => (
          <div className="card" key={i}>
            <div className="poster skeleton" />
          </div>
        ))}
      </div>
    </section>
  ))
}