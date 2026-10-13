import { useEffect, useRef, useState } from 'react'
import { Field, Area } from './Fields.jsx'
import { today, uid } from '../utils.js'
import { api } from '../api.js'
import { compressImage, getPhoto, putPhoto, dropPhoto } from '../photos.js'

const HISTORY = [
  ['procedures', 'Procedures'], ['immunization', 'Immunization'], ['allergies', 'Allergies'],
  ['meds', 'Medications'], ['family', 'Family history'],
  ['menstrual', 'Menstrual history', true], ['obstetric', 'Obstetric history', true],
]

/* A. Medical history */
export function History({ patient, setH }) {
  const female = patient.sex === 'Female'
  return (
    <>
      <div className="grid">
        {HISTORY.filter(([, , fOnly]) => !fOnly || female).map(([k, label]) => (
          <Area key={k} label={label} value={patient.h[k]} onChange={v => setH(k, v)} />
        ))}
      </div>
      {!female && <p className="hint">Menstrual and obstetric history appear when sex is set to Female.</p>}
    </>
  )
}

function ListHeader({ hint, button, onAdd }) {
  return (
    <div className="top" style={{ marginTop: 14 }}>
      <span className="hint" style={{ margin: 0 }}>{hint}</span>
      <button className="btn dark sm" onClick={onAdd}>{button}</button>
    </div>
  )
}

function Entry({ title, onRemove, children, extra }) {
  return (
    <div className="entry">
      <div className="hd">
        <strong>{title}</strong>
        <span>{extra} <button className="btn ghost sm" onClick={onRemove}>Remove</button></span>
      </div>
      {children}
    </div>
  )
}

const confirmRemove = fn => () => { if (confirm('Remove this entry?')) fn() }

/* B. Laboratories / diagnostics */
function Thumb({ id, name, onOpen }) {
  const [src, setSrc] = useState(null)
  const [bad, setBad] = useState(false)
  useEffect(() => {
    let on = true
    getPhoto(id).then(d => on && setSrc(d)).catch(() => on && setBad(true))
    return () => { on = false }
  }, [id])
  if (bad) return <div className="ph-empty">Unavailable</div>
  if (!src) return <div className="ph-empty">Loading…</div>
  return <button className="ph-btn" onClick={onOpen} aria-label={`View photo ${name || ''}`}><img src={src} alt={name || 'Laboratory photo'} /></button>
}

function Viewer({ id, onClose }) {
  const [src, setSrc] = useState(null)
  useEffect(() => { getPhoto(id).then(setSrc).catch(() => onClose()) }, [id]) // eslint-disable-line
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="modal-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer">
      {src ? <img className="lightbox" src={src} alt="Laboratory photo, enlarged" /> : <span style={{ color: '#fff' }}>Loading…</span>}
      <button className="btn sm lb-close" onClick={onClose}>Close</button>
    </div>
  )
}

function LabEntry({ e, i, update, remove }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(null)
  const fileRef = useRef(null)
  const latest = useRef(e)
  latest.current = e
  const photos = e.photos || []

  async function addFiles(files) {
    setBusy(true); setErr('')
    const added = []
    for (const f of files) {
      try {
        const data = await compressImage(f)
        const id = uid() + uid()
        await api.savePhoto(id, data)
        putPhoto(id, data)
        added.push({ id, name: f.name })
      } catch (ex) { setErr(`${f.name}: ${ex.message}`) }
    }
    if (added.length) update(i, 'photos', [...(latest.current.photos || []), ...added])
    setBusy(false)
  }
  function removePhoto(id) {
    if (!confirm('Remove this photo?')) return
    update(i, 'photos', photos.filter(p => p.id !== id))
    dropPhoto(id)
  }

  return (
    <Entry title={`Result ${i + 1}`} onRemove={confirmRemove(() => { photos.forEach(p => dropPhoto(p.id)); remove(i) })}>
      <div className="grid">
        <Field label="Date" type="date" cls="w3" value={e.date} onChange={v => update(i, 'date', v)} />
        <Field label="Test / procedure" cls="w4" value={e.test} onChange={v => update(i, 'test', v)} />
        <Field label="Result" cls="w12" value={e.result} onChange={v => update(i, 'result', v)} />
        <Field label="Interpretation / remarks" cls="w12" value={e.notes} onChange={v => update(i, 'notes', v)} />
      </div>
      <div className="photos-h">
        <span>Photos</span>
        <button className="btn ghost sm" disabled={busy} onClick={() => fileRef.current.click()}>{busy ? 'Uploading…' : '+ Add photo'}</button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden
          onChange={ev => { const fs = [...ev.target.files]; ev.target.value = ''; if (fs.length) addFiles(fs) }} />
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {photos.length > 0 && (
        <div className="photos">
          {photos.map(ph => (
            <div className="ph" key={ph.id}>
              <Thumb id={ph.id} name={ph.name} onOpen={() => setOpen(ph.id)} />
              <button className="btn ghost sm" onClick={() => removePhoto(ph.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
      {open && <Viewer id={open} onClose={() => setOpen(null)} />}
    </Entry>
  )
}

export function Labs({ items, add, update, remove }) {
  return (
    <>
      <ListHeader hint="Record each laboratory or diagnostic result. Photos of result sheets or scans can be attached." button="Add result" onAdd={add} />
      {items.map((e, i) => <LabEntry key={i} e={e} i={i} update={update} remove={remove} />)}
      {!items.length && <p className="hint">No results yet.</p>}
    </>
  )
}

/* C. SOAP */
function Block({ label, value, onChange }) {
  return (
    <label className="blk">{label}
      <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function Multi({ label, items, onChange, addLabel }) {
  const arr = items?.length ? items : ['']
  return (
    <div className="multi">
      {arr.map((t, j) => (
        <div key={j}>
          <Block label={j === 0 ? label : `${label} ${j + 1}`} value={t}
            onChange={v => onChange(arr.map((x, k) => (k === j ? v : x)))} />
          {j > 0 && <button className="btn ghost sm rm" onClick={() => onChange(arr.filter((_, k) => k !== j))}>Remove</button>}
        </div>
      ))}
      <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => onChange([...arr, ''])}>+ {addLabel}</button>
    </div>
  )
}

function SoapEntry({ e, i, update, remove }) {
  const set = (k, v) => update(i, k, v)
  const adv = e.mode !== 'simple'
  return (
    <Entry title={`Visit ${i + 1}`} onRemove={confirmRemove(() => remove(i))}>
      <div className="grid">
        <Field label="Clinic" cls="w6" placeholder="No clinic" value={e.clinic} onChange={v => set('clinic', v)} />
        <Field label="Date" type="date" cls="w3" value={e.date} onChange={v => set('date', v)} />
      </div>
      <div className="seg" role="group" aria-label="SOAP format">
        <button className={!adv ? 'on' : ''} onClick={() => set('mode', 'simple')}>Simple SOAP</button>
        <button className={adv ? 'on' : ''} onClick={() => set('mode', 'advanced')}>Advanced SOAP</button>
      </div>
      {adv ? (
        <>
          <h4 className="sec">Subjective</h4>
          <Block label="Chief complaint" value={e.cc} onChange={v => set('cc', v)} />
          <Block label="History of present illness" value={e.hpi} onChange={v => set('hpi', v)} />
          <h4 className="sec">Objective</h4>
          <Multi label="Remarks" items={e.remarks} addLabel="Add remarks" onChange={v => set('remarks', v)} />
          <h4 className="sec">Assessment</h4>
          <Multi label="Diagnosis" items={e.dx} addLabel="Add diagnosis" onChange={v => set('dx', v)} />
          <h4 className="sec">Plan</h4>
          <Multi label="Plan" items={e.plan} addLabel="Add plan" onChange={v => set('plan', v)} />
          <h4 className="sec">Follow up check-up</h4>
          {e.followUp == null
            ? <button className="btn ghost sm" onClick={() => set('followUp', today())}>+ Schedule follow up</button>
            : (
              <div className="row">
                <input type="date" aria-label="Follow up date" value={e.followUp} onChange={ev => set('followUp', ev.target.value)} />
                <button className="btn ghost sm" onClick={() => set('followUp', null)}>Remove</button>
              </div>
            )}
        </>
      ) : (
        <>
          <Block label="Subjective (S)" value={e.s} onChange={v => set('s', v)} />
          <Block label="Objective (O)" value={e.o} onChange={v => set('o', v)} />
          <Block label="Assessment (A)" value={e.a} onChange={v => set('a', v)} />
          <Block label="Plan (P)" value={e.p} onChange={v => set('p', v)} />
        </>
      )}
    </Entry>
  )
}

export function Soap({ items, add, update, remove }) {
  return (
    <>
      <ListHeader hint="One SOAP note per visit." button="Add visit note" onAdd={add} />
      {items.map((e, i) => <SoapEntry key={i} e={e} i={i} update={update} remove={remove} />)}
      {!items.length && <p className="hint">No visit notes yet.</p>}
    </>
  )
}

/* D. Medical certificate */
export function Certificates({ items, add, update, remove, onPrint, patient, age }) {
  return (
    <>
      <ListHeader hint="Name and age come from the patient details above." button="New certificate" onAdd={add} />
      {items.map((e, i) => (
        <Entry key={i} title={`Certificate ${i + 1}`} onRemove={confirmRemove(() => remove(i))}
          extra={<button className="btn dark sm" onClick={() => onPrint(i)}>Print</button>}>
          <p className="sentence">
            This is to certify that <b>{patient.name || '(patient name)'}{age ? `, ${age} years of age` : ''}</b>, consulted on{' '}
            <input type="date" className="inl" aria-label="Date consulted" value={e.date ?? ''} onChange={ev => update(i, 'date', ev.target.value)} />{' '}
            with the following clinical impression
          </p>
          <textarea aria-label="Clinical impression" placeholder="Enter text" value={e.impression ?? ''} onChange={ev => update(i, 'impression', ev.target.value)} />
          <p className="sentence">
            And would need medical attention for{' '}
            <input className="inl num" aria-label="Days" value={e.days ?? ''} onChange={ev => update(i, 'days', ev.target.value)} />{' '}
            day(s) barring complications
          </p>
          <Block label="Further recommendations" value={e.recs} onChange={v => update(i, 'recs', v)} />
          <Block label="Disclaimer" value={e.disclaimer} onChange={v => update(i, 'disclaimer', v)} />
        </Entry>
      ))}
      {!items.length && <p className="hint">No certificates yet.</p>}
    </>
  )
}
