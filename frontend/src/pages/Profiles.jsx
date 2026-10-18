import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo, Toast } from '../components/Layout'
import { LockIcon, PencilIcon } from '../components/Icons'
import { MAX_PROFILES, useStore } from '../lib/store'

// ── PIN numpad ────────────────────────────────────────────────────────────────

function PinChallenge({ profile, onSuccess, onCancel }) {
  const [digits, setDigits] = useState([])
  const [wrong, setWrong] = useState(false)

  const push = (d) => {
    if (digits.length >= 4) return
    const next = [...digits, d]
    setDigits(next)
    if (next.length === 4) {
      if (next.join('') === profile.pin) {
        onSuccess()
      } else {
        setWrong(true)
        setTimeout(() => { setDigits([]); setWrong(false) }, 700)
      }
    }
  }
  const pop = () => setDigits((d) => d.slice(0, -1))

  return (
    <div className="pin-wrap">
      <div className="pin-head">
        <h2>Enter PIN for <span style={{ color: profile.color }}>{profile.name}</span></h2>
      </div>
      <div className={`pin-dots${wrong ? ' pin-wrong' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-dot${digits[i] != null ? ' filled' : ''}`} />
        ))}
      </div>
      <div className="pin-pad">
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <button key={n} type="button" className="pin-key" onClick={() => push(String(n))}>{n}</button>
        ))}
        <button type="button" className="pin-key pin-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="pin-key" onClick={() => push('0')}>0</button>
        <button type="button" className="pin-key pin-del" onClick={pop}>⌫</button>
      </div>
    </div>
  )
}

// ── Profile form (edit / new) ─────────────────────────────────────────────────

function PinInput({ value, onChange, label }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        placeholder="4-digit PIN"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        autoComplete="off"
      />
    </label>
  )
}

function ProfileForm({ initial, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [kids, setKids] = useState(!!initial?.kids)
  const [pinMode, setPinMode] = useState(null) // null | 'set' | 'change'
  const [pinVal, setPinVal] = useState('')
  const [removePin, setRemovePin] = useState(false)

  const hasPin = !!initial?.pin && !removePin

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    let pin = undefined
    if (removePin) pin = null
    else if (pinMode && pinVal.length === 4) pin = pinVal
    onSave(name.trim(), kids, pin)
  }

  return (
    <form className="prof-form" onSubmit={submit}>
      <h1>{initial ? 'Edit profile' : 'Add profile'}</h1>
      <label className="field">
        <span>Name</span>
        <input autoFocus maxLength={20} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lola" />
      </label>
      <label className="check">
        <input type="checkbox" checked={kids} onChange={(e) => setKids(e.target.checked)} />
        <span>
          Kids profile
          <small>Only shows all-ages titles</small>
        </span>
      </label>

      {initial && (
        <div className="pin-setting">
          <div className="pin-setting-row">
            <span className="pin-setting-label"><LockIcon /> Profile lock</span>
            {hasPin ? (
              <div className="pin-setting-actions">
                <button type="button" className="link-btn" onClick={() => { setPinMode('change'); setPinVal(''); setRemovePin(false) }}>Change PIN</button>
                <button type="button" className="link-danger" onClick={() => { setRemovePin(true); setPinMode(null); setPinVal('') }}>Remove</button>
              </div>
            ) : removePin ? (
              <span className="pin-badge pin-badge-off">Will be removed</span>
            ) : (
              <button type="button" className="link-btn" onClick={() => { setPinMode('set'); setPinVal('') }}>Set PIN</button>
            )}
          </div>
          {hasPin && <p className="pin-hint">PIN is set. Viewers must enter it to access this profile.</p>}
          {pinMode && (
            <PinInput
              value={pinVal}
              onChange={setPinVal}
              label={pinMode === 'change' ? 'New 4-digit PIN' : 'Create 4-digit PIN'}
            />
          )}
        </div>
      )}

      <div className="btn-row">
        <button className="btn btn-primary" disabled={!name.trim() || (pinMode && pinVal.length < 4)}>
          Save
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {onDelete && (
        <button type="button" className="link-danger" onClick={onDelete}>
          Delete this profile
        </button>
      )}
    </form>
  )
}

// ── Main Profiles page ────────────────────────────────────────────────────────

export default function Profiles() {
  const navigate = useNavigate()
  const { profiles, setActiveId, addProfile, updateProfile, removeProfile, toast, toastMsg } = useStore()
  const [manage, setManage] = useState(false)
  const [editing, setEditing] = useState(null) // profile object or 'new'
  const [challenging, setChallenging] = useState(null) // profile that needs PIN

  const pick = (p) => {
    if (manage) return setEditing(p)
    if (p.pin) return setChallenging(p)
    setActiveId(p.id)
    toast(`Welcome back, ${p.name}`)
    navigate('/')
  }

  const unlock = (p) => {
    setChallenging(null)
    setActiveId(p.id)
    toast(`Welcome back, ${p.name}`)
    navigate('/')
  }

  if (challenging) {
    return (
      <div className="prof-wrap">
        <PinChallenge profile={challenging} onSuccess={() => unlock(challenging)} onCancel={() => setChallenging(null)} />
      </div>
    )
  }

  if (editing) {
    return (
      <div className="prof-wrap">
        <ProfileForm
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={(name, kids, pin) => {
            if (editing === 'new') {
              addProfile(name, kids)
            } else {
              const patch = { name, kids: kids || undefined }
              if (pin === null) patch.pin = undefined
              else if (pin) patch.pin = pin
              updateProfile(editing.id, patch)
            }
            setEditing(null)
          }}
          onDelete={
            editing !== 'new' && profiles.length > 1
              ? () => { removeProfile(editing.id); setEditing(null) }
              : null
          }
        />
      </div>
    )
  }

  return (
    <div className="prof-wrap">
      <div className="prof-head">
        <Logo />
        <h1>{manage ? 'Manage profiles' : "Who’s watching?"}</h1>
      </div>
      <div className="prof-grid">
        {profiles.map((p) => (
          <button key={p.id} className="prof" onClick={() => pick(p)}>
            <span className="pic" style={{ background: p.color }}>
              {p.name[0]?.toUpperCase()}
              {manage && <span className="pic-edit"><PencilIcon /></span>}
              {!manage && p.pin && <span className="pic-lock"><LockIcon /></span>}
            </span>
            {p.name}
            {p.kids && <small>All-ages only</small>}
          </button>
        ))}
        {profiles.length < MAX_PROFILES && (
          <button className="prof" onClick={() => setEditing('new')}>
            <span className="pic add" aria-hidden="true">+</span>
            Add profile
          </button>
        )}
      </div>
      <button className="btn btn-outline" onClick={() => setManage(!manage)}>
        {manage ? 'Done' : 'Manage profiles'}
      </button>
      <p className="small muted">Free to watch. No account or card needed.</p>
      <Toast msg={toastMsg} />
    </div>
  )
}
