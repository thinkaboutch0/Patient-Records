import { Field } from './Fields.jsx'

export default function DoctorDialog({ doctor, onChange, onClose }) {
  const set = k => v => onChange({ ...doctor, [k]: v })
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Doctor details" onClick={e => e.stopPropagation()}>
        <h2>Doctor details</h2>
        <p className="hint">Printed on every medical certificate. Saved on this device.</p>
        <div className="grid">
          <Field label="Physician name (e.g. Juan Dela Cruz, MD)" cls="w12" value={doctor.name} onChange={set('name')} />
          <Field label="Specialty (e.g. General Medicine)" cls="w12" value={doctor.specialty} onChange={set('specialty')} />
          <Field label="License no." cls="w4" value={doctor.license} onChange={set('license')} />
          <Field label="PTR no." cls="w4" value={doctor.ptr} onChange={set('ptr')} />
          <Field label="PHIC no." cls="w4" value={doctor.phic} onChange={set('phic')} />
          <Field label="Hospital / clinic name" cls="w12" value={doctor.clinic} onChange={set('clinic')} />
          <Field label="Address / contact (footer)" cls="w12" value={doctor.clinicInfo} onChange={set('clinicInfo')} />
        </div>
        <div style={{ marginTop: 18, textAlign: 'right' }}>
          <button className="btn dark" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
