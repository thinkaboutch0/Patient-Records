import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Login from './components/Login.jsx'
import { Field } from './components/Fields.jsx'
import { History, Labs, Soap, Certificates } from './components/Sections.jsx'
import CertificatePrint from './components/CertificatePrint.jsx'
import DoctorDialog from './components/DoctorDialog.jsx'
import { api, getPw, setPw, clearPw } from './api.js'
import { dropPhoto } from './photos.js'
import { blankPatient, blankSoap, blankCert, blankLab, blankDoctor, normalizePatient, loadLocalPatients, ageFrom, today } from './utils.js'

const TABS = [['a', 'A. Medical history'], ['b', 'B. Laboratories / diagnostics'], ['c', 'C. SOAP notes'], ['d', 'D. Medical certificate']]
const MIGRATED = 'patient-records-migrated'
const sameList = (a, b) => {
  const k = l => JSON.stringify([...l].sort((x, y) => x.id.localeCompare(y.id)))
  return k(a) === k(b)
}

export default function App() {
  const [phase, setPhase] = useState(getPw() ? 'loading' : 'login') // login | loading | ready | error
  const [loginError, setLoginError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [patients, setPatientsState] = useState([])
  const [doctor, setDoctorState] = useState(blankDoctor)
  const [curId, setCurId] = useState(null)
  const [tab, setTab] = useState('a')
  const [query, setQuery] = useState('')
  const [printIdx, setPrintIdx] = useState(null)
  const [toast, setToast] = useState('')
  const [showDoctor, setShowDoctor] = useState(false)
  const [sync, setSync] = useState('saved') // saved | saving | error
  const [localCount, setLocalCount] = useState(0)

  // refs let the saving and refreshing code always see the latest data
  const patientsRef = useRef([])
  const doctorRef = useRef(blankDoctor())
  const pending = useRef(new Set())
  const doctorDirty = useRef(false)
  const editSeq = useRef(0)
  const flushing = useRef(false)
  const timer = useRef(null)

  const setPatients = fn => {
    const next = typeof fn === 'function' ? fn(patientsRef.current) : fn
    patientsRef.current = next
    setPatientsState(next)
  }
  const setDoctor = d => { doctorRef.current = d; setDoctorState(d) }
  const patient = patients.find(p => p.id === curId)

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  function lock(message = '') {
    clearTimeout(timer.current)
    clearPw()
    pending.current.clear()
    doctorDirty.current = false
    setPatients([])
    setCurId(null)
    setLoginError(message)
    setPhase('login')
  }

  /* ---------- saving ---------- */
  function schedule() {
    setSync('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 700)
  }
  function markDirty(id) { pending.current.add(id); editSeq.current++; schedule() }

  async function flush() {
    if (flushing.current) { timer.current = setTimeout(flush, 400); return }
    flushing.current = true
    try {
      for (const id of [...pending.current]) {
        pending.current.delete(id)
        const p = patientsRef.current.find(x => x.id === id)
        if (!p) continue
        try { await api.savePatient(p) } catch (e) { pending.current.add(id); throw e }
      }
      if (doctorDirty.current) {
        doctorDirty.current = false
        try { await api.saveDoctor(doctorRef.current) } catch (e) { doctorDirty.current = true; throw e }
      }
      if (pending.current.size || doctorDirty.current) timer.current = setTimeout(flush, 700)
      else setSync('saved')
    } catch (e) {
      if (e.status === 401) lock('Your passcode is no longer valid. Enter it again.')
      else { setSync('error'); timer.current = setTimeout(flush, 5000) }
    } finally {
      flushing.current = false
    }
  }

  /* ---------- loading and refreshing ---------- */
  useEffect(() => { if (phase === 'loading') load() }, [phase]) // eslint-disable-line

  async function load() {
    try {
      const d = await api.load()
      setPatients((d.patients || []).map(normalizePatient))
      setDoctor({ ...blankDoctor(), ...(d.doctor || {}) })
      setPhase('ready')
      if (!localStorage.getItem(MIGRATED)) setLocalCount(loadLocalPatients().length)
    } catch (e) {
      if (e.status === 401) lock('Wrong passcode. Try again.')
      else { setLoadError(e.message); setPhase('error') }
    }
  }

  async function refresh() {
    if (flushing.current || pending.current.size || doctorDirty.current) return
    const seq = editSeq.current
    try {
      const d = await api.load()
      if (seq !== editSeq.current || flushing.current || pending.current.size || doctorDirty.current) return
      const ps = (d.patients || []).map(normalizePatient)
      if (!sameList(ps, patientsRef.current)) setPatients(ps)
      const doc = { ...blankDoctor(), ...(d.doctor || {}) }
      if (JSON.stringify(doc) !== JSON.stringify(doctorRef.current)) setDoctor(doc)
    } catch (e) {
      if (e.status === 401) lock('Your passcode is no longer valid. Enter it again.')
    }
  }

  useEffect(() => {
    if (phase !== 'ready') return
    const run = () => { if (document.visibilityState === 'visible') refresh() }
    const t = setInterval(run, 60000)
    document.addEventListener('visibilitychange', run)
    window.addEventListener('focus', run)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', run); window.removeEventListener('focus', run) }
  }, [phase]) // eslint-disable-line

  useEffect(() => {
    const warn = e => { if (pending.current.size || doctorDirty.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  useEffect(() => {
    if (printIdx === null) return
    window.print()
    setPrintIdx(null)
  }, [printIdx])

  /* ---------- actions ---------- */
  async function submitPasscode(pw) {
    setBusy(true); setLoginError('')
    try { await api.login(pw); setPw(pw); setPhase('loading') }
    catch (e) { setLoginError(e.message) }
    finally { setBusy(false) }
  }

  const patch = fn => { setPatients(ps => ps.map(p => (p.id === curId ? fn(p) : p))); markDirty(curId) }
  const setField = (k, v) => patch(p => ({ ...p, [k]: v }))
  const setH = (k, v) => patch(p => ({ ...p, h: { ...p.h, [k]: v } }))
  const list = (key, make) => ({
    items: patient[key],
    add: () => patch(p => ({ ...p, [key]: [...p[key], make()] })),
    update: (i, k, v) => patch(p => ({ ...p, [key]: p[key].map((e, j) => (j === i ? { ...e, [k]: v } : e)) })),
    remove: i => patch(p => ({ ...p, [key]: p[key].filter((_, j) => j !== i) })),
  })

  function newPatient() {
    const p = blankPatient()
    setPatients(ps => [...ps, p])
    markDirty(p.id)
    setCurId(p.id)
    setTab('a')
  }

  async function deletePatient() {
    if (!confirm(`Delete ${patient.name || 'this patient'}? This cannot be undone.`)) return
    const id = curId
    patient.labs.flatMap(l => l.photos || []).forEach(ph => dropPhoto(ph.id))
    pending.current.delete(id)
    editSeq.current++
    setPatients(ps => ps.filter(p => p.id !== id))
    setCurId(null)
    try { await api.deletePatient(id) } catch { flash('Could not delete on the server. Check your connection.'); refresh() }
  }

  function changeDoctor(d) {
    setDoctor(d)
    doctorDirty.current = true
    editSeq.current++
    schedule()
  }

  function exportBackup() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ patients }, null, 2)], { type: 'application/json' }))
    a.download = `patient-records-${today()}.json`
    a.click()
    flash('Backup downloaded')
  }

  async function importBackup(file) {
    try {
      const d = JSON.parse(await file.text())
      if (!Array.isArray(d.patients)) throw new Error()
      if (!confirm('Replace all records, on every device, with this backup?')) return
      const ps = d.patients.map(normalizePatient)
      await api.importAll(ps)
      pending.current.clear()
      editSeq.current++
      setPatients(ps)
      setCurId(null)
      flash('Backup imported')
    } catch { flash('That file is not a valid backup, or the server could not be reached.') }
  }

  async function uploadLocal() {
    const known = new Set(patientsRef.current.map(p => p.id))
    const add = loadLocalPatients().filter(p => !known.has(p.id))
    try {
      for (const p of add) await api.savePatient(p)
      editSeq.current++
      setPatients(ps => [...ps, ...add])
      localStorage.setItem(MIGRATED, '1')
      setLocalCount(0)
      flash(`${add.length} record(s) uploaded. Every device can now see them.`)
    } catch { flash('Upload failed. Check your connection and try again.') }
  }

  /* ---------- screens ---------- */
  if (phase === 'login') return <Login onSubmit={submitPasscode} error={loginError} busy={busy} />
  if (phase === 'loading') return <div className="empty">Loading records…</div>
  if (phase === 'error') {
    return (
      <div className="empty">
        <h2 style={{ fontFamily: 'Georgia,serif', color: 'var(--brand)' }}>Could not load the records</h2>
        <p>{loadError}</p>
        <button className="btn dark" onClick={() => { setLoadError(''); setPhase('loading') }}>Try again</button>
      </div>
    )
  }

  return (
    <>
      <div className="app">
        <Sidebar patients={patients} curId={curId} query={query} setQuery={setQuery}
          onSelect={id => { setCurId(id); setTab('a') }} onNew={newPatient}
          onExport={exportBackup} onImport={importBackup} onDoctor={() => setShowDoctor(true)}
          onLock={() => lock()} status={sync} />
        <main>
          {localCount > 0 && (
            <div className="banner">
              <span>Found {localCount} record(s) saved only on this device from the earlier version.</span>
              <button className="btn dark sm" onClick={uploadLocal}>Upload them</button>
              <button className="btn ghost sm" onClick={() => { localStorage.setItem(MIGRATED, '1'); setLocalCount(0) }}>Dismiss</button>
            </div>
          )}
          {!patient ? (
            <div className="empty">
              <h2 style={{ fontFamily: 'Georgia,serif', color: 'var(--brand)' }}>No patient selected</h2>
              <p>Pick a patient from the list, or add a new one.</p>
            </div>
          ) : (
            <>
              <div className="sheet">
                <div className="top">
                  <h2>{patient.name || 'New patient'}</h2>
                  <button className="btn ghost sm" onClick={deletePatient}>Delete patient</button>
                </div>
                <div className="grid">
                  <Field label="Name" cls="w12" value={patient.name} onChange={v => setField('name', v)} />
                  <Field label="Birthday" type="date" cls="w3" value={patient.bday} onChange={v => setField('bday', v)} />
                  <Field label="Age" cls="w3" readOnly={!!patient.bday}
                    value={patient.bday ? ageFrom(patient.bday) : patient.age} onChange={v => setField('age', v)} />
                  <div className="f w3">
                    <label>Sex
                      <select value={patient.sex} onChange={e => setField('sex', e.target.value)}>
                        <option value=""></option><option>Female</option><option>Male</option>
                      </select>
                    </label>
                  </div>
                  <Field label="Address" cls="w12" value={patient.address} onChange={v => setField('address', v)} />
                  <Field label="Rank" cls="w4" value={patient.rank} onChange={v => setField('rank', v)} />
                  <Field label="Branch of service" cls="w4" value={patient.branch} onChange={v => setField('branch', v)} />
                  <Field label="Unit / office" cls="w4" value={patient.unit} onChange={v => setField('unit', v)} />
                </div>
              </div>

              <div className="tabs" role="tablist">
                {TABS.map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{label}</button>
                ))}
              </div>
              <div className="panel">
                {tab === 'a' && <History patient={patient} setH={setH} />}
                {tab === 'b' && <Labs {...list('labs', blankLab)} />}
                {tab === 'c' && <Soap {...list('soap', blankSoap)} />}
                {tab === 'd' && <Certificates {...list('certs', blankCert)} onPrint={setPrintIdx} patient={patient} age={patient.bday ? ageFrom(patient.bday) : patient.age} />}
              </div>
            </>
          )}
        </main>
      </div>
      {printIdx !== null && patient?.certs[printIdx] && <CertificatePrint patient={patient} cert={patient.certs[printIdx]} doctor={doctor} />}
      {showDoctor && <DoctorDialog doctor={doctor} onChange={changeDoctor} onClose={() => setShowDoctor(false)} />}
      <div className={`toast ${toast ? 'on' : ''}`} role="status">{toast}</div>
    </>
  )
}
