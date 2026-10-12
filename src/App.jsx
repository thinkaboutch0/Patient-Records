import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import { Field } from './components/Fields.jsx'
import { History, Labs, Soap, Certificates } from './components/Sections.jsx'
import CertificatePrint from './components/CertificatePrint.jsx'
import DoctorDialog from './components/DoctorDialog.jsx'
import { blankPatient, blankSoap, blankCert, blankLab, normalizePatient, loadPatients, savePatients, loadDoctor, saveDoctor, ageFrom, today } from './utils.js'

const TABS = [['a', 'A. Medical history'], ['b', 'B. Laboratories / diagnostics'], ['c', 'C. SOAP notes'], ['d', 'D. Medical certificate']]

export default function App() {
  const [patients, setPatients] = useState(loadPatients)
  const [curId, setCurId] = useState(null)
  const [tab, setTab] = useState('a')
  const [query, setQuery] = useState('')
  const [printIdx, setPrintIdx] = useState(null)
  const [toast, setToast] = useState('')
  const [doctor, setDoctor] = useState(loadDoctor)
  const [showDoctor, setShowDoctor] = useState(false)

  const patient = patients.find(p => p.id === curId)

  useEffect(() => {
    if (!savePatients(patients)) flash('Could not save: browser storage is full or blocked.')
  }, [patients])

  useEffect(() => { saveDoctor(doctor) }, [doctor])

  useEffect(() => {
    if (printIdx === null) return
    window.print()
    setPrintIdx(null)
  }, [printIdx])

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const patch = fn => setPatients(ps => ps.map(p => (p.id === curId ? fn(p) : p)))
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
    setCurId(p.id)
    setTab('a')
  }

  function deletePatient() {
    if (!confirm(`Delete ${patient.name || 'this patient'}? This cannot be undone.`)) return
    setPatients(ps => ps.filter(p => p.id !== curId))
    setCurId(null)
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
      if (!confirm('Replace all current records with this backup?')) return
      setPatients(d.patients.map(normalizePatient))
      setCurId(null)
      flash('Backup imported')
    } catch { flash('That file is not a valid backup.') }
  }

  return (
    <>
      <div className="app">
        <Sidebar patients={patients} curId={curId} query={query} setQuery={setQuery}
          onSelect={id => { setCurId(id); setTab('a') }} onNew={newPatient}
          onExport={exportBackup} onImport={importBackup} onDoctor={() => setShowDoctor(true)} />
        <main>
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
      {showDoctor && <DoctorDialog doctor={doctor} onChange={setDoctor} onClose={() => setShowDoctor(false)} />}
      <div className={`toast ${toast ? 'on' : ''}`} role="status">{toast}</div>
    </>
  )
}
