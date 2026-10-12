export function Field({ label, value, onChange, type = 'text', cls = '', readOnly = false, placeholder }) {
  return (
    <div className={`f ${cls}`}>
      <label>
        {label}
        <input type={type} value={value ?? ''} readOnly={readOnly} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      </label>
    </div>
  )
}

export function Area({ label, value, onChange }) {
  return (
    <div className="f w12">
      <label>
        {label}
        <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} />
      </label>
    </div>
  )
}
