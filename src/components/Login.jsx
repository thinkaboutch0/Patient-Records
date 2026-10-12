import { useState } from 'react'

export default function Login({ onSubmit, error, busy }) {
  const [v, setV] = useState('')
  return (
    <div className="gate">
      <form className="gate-card" onSubmit={e => { e.preventDefault(); if (v) onSubmit(v) }}>
        <h1>Patient Records</h1>
        <p className="hint">Enter the passcode to open the records.</p>
        <label>Passcode
          <input type="password" autoFocus autoComplete="current-password" value={v} onChange={e => setV(e.target.value)} />
        </label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn dark" type="submit" disabled={busy} style={{ marginTop: 14 }}>Open records</button>
      </form>
    </div>
  )
}
