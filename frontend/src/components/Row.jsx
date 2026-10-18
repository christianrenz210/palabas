import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from './Icons'

// A horizontally scrolling row; on desktop it gets arrow buttons.
export default function Row({ title, aside, children, className = '' }) {
  const rail = useRef(null)
  const scroll = (dir) => {
    const el = rail.current
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }
  return (
    <section className={`row-sec ${className}`}>
      <div className="sec-h">
        <h2>{title}</h2>
        {aside}
      </div>
      <div className="rail-wrap">
        <button className="rail-arrow left" aria-label="Scroll left" onClick={() => scroll(-1)}>
          <ChevronLeft />
        </button>
        <div className="rail" ref={rail}>
          {children}
        </div>
        <button className="rail-arrow right" aria-label="Scroll right" onClick={() => scroll(1)}>
          <ChevronRight />
        </button>
      </div>
    </section>
  )
}
