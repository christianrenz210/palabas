const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const HomeIcon = () => (
  <svg {...base}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </svg>
)
export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
export const PlusIcon = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const CheckIcon = () => (
  <svg {...base}>
    <path d="m5 12 5 5 9-10" />
  </svg>
)
export const BackIcon = () => (
  <svg {...base} strokeWidth={2}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const DownIcon = () => (
  <svg {...base} strokeWidth={2}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)
export const ChevronLeft = () => (
  <svg {...base} strokeWidth={2.2}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const ChevronRight = () => (
  <svg {...base} strokeWidth={2.2}>
    <path d="m9 5 7 7-7 7" />
  </svg>
)
export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15a.8.8 0 0 0 1.2.7l12-7.5a.8.8 0 0 0 0-1.4l-12-7.5A.8.8 0 0 0 7 4.5z" />
  </svg>
)
export const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="4.5" width="4" height="15" rx="1" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" />
  </svg>
)
export const NextIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M5 5.5v13a.8.8 0 0 0 1.2.7L15 13.5V18h3V6h-3v4.5L6.2 4.8A.8.8 0 0 0 5 5.5z" />
  </svg>
)
const Ten = () => (
  <text x="12" y="15.5" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="700">
    10
  </text>
)
export const RewIcon = () => (
  <svg {...base}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <Ten />
  </svg>
)
export const FwdIcon = () => (
  <svg {...base}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 4v5h-5" />
    <Ten />
  </svg>
)
export const ShareIcon = () => (
  <svg {...base}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
)
export const ThumbIcon = () => (
  <svg {...base}>
    <path d="M7 11v9H4v-9zM7 11l4-8a2.5 2.5 0 0 1 2.5 2.8L13 9h5.5a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.1 20H7" />
  </svg>
)
export const FilmIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  </svg>
)
export const TvIcon = () => (
  <svg {...base}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="m8 2 4 4 4-4" />
  </svg>
)
export const PlayCircleIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5v7l5.5-3.5z" fill="currentColor" />
  </svg>
)
export const CloseIcon = () => (
  <svg {...base} strokeWidth={2}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const PencilIcon = () => (
  <svg {...base}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
)
export const LockIcon = () => (
  <svg {...base} style={{ width: '1em', height: '1em', verticalAlign: '-0.1em' }}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
export const ExpandIcon = () => (
  <svg {...base}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
)
