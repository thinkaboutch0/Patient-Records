import { useRef } from 'react'

export default function Sidebar({ patients, curId, query, setQuery, onSelect, onNew, onExport, onImport, onDoctor }) {
  const fileRef = useRef(null)
  const q = query.toLowerCase()
  const rows = patients
    .filter(p => [p.name, p.unit, p.rank].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (a.name || '~').localeCompare(b.name || '~'))

  return (
    <aside>
      <h1>Patient Records</h1>
      <input type="search" placeholder="Search name, unit, rank…" aria-label="Search patients"
        value={query} onChange={e => setQuery(e.target.value)} />
      <button className="btn" onClick={onNew}>New patient</button>
      <div id="list" role="list">
        {rows.map(p => (
          <button key={p.id} className={`pt ${p.id === curId ? 'on' : ''}`} onClick={() => onSelect(p.id)}>
            {p.name || 'Unnamed patient'}
            <small>{[p.rank, p.unit].filter(Boolean).join(' · ') || 'No unit yet'}</small>
          </button>
        ))}
        {!rows.length && <p style={{ opacity: .8, padding: '0 10px' }}>No patients found.</p>}
      </div>
      <div className="side-foot">
        <button className="btn" onClick={onDoctor}>Doctor details</button>
        <button className="btn" onClick={onExport}>Export backup</button>
        <button className="btn" onClick={() => fileRef.current.click()}>Import backup</button>
        <input ref={fileRef} type="file" accept="application/json" hidden
          onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onImport(f) }} />
      </div>
    </aside>
  )
}
