const KEY = 'patient-records-v1'

export const DISCLAIMER = 'This certificate is being issued upon the request of the above-mentioned for whatever purpose it may serve, except those of a medico-legal-nature.'

export const uid = () => Math.random().toString(36).slice(2, 10)
export const today = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export const blankSoap = () => ({ date: today(), clinic: '', mode: 'advanced', cc: '', hpi: '', remarks: [''], dx: [''], plan: [''], followUp: null })
export const blankCert = () => ({ date: today(), impression: '', days: '1', recs: '', disclaimer: DISCLAIMER })
export const blankLab = () => ({ date: today(), photos: [] })

export const blankPatient = () => ({
  id: uid(), name: '', bday: '', age: '', sex: '', address: '',
  rank: '', branch: '', unit: '', h: {}, labs: [], soap: [], certs: [],
})

export const blankDoctor = () => ({
  name: 'Ruth Marie Santiago', specialty: '', license: '108773', ptr: '', phic: '',
  clinic: 'AFP Medical Center', clinicInfo: 'V. Luna Avenue, Pinyahan, Quezon City',
})

// keeps records saved by the earlier version working
export function normalizePatient(p) {
  return {
    ...blankPatient(), ...p, h: p.h || {}, labs: (p.labs || []).map(l => ({ photos: [], ...l })),
    soap: (p.soap || []).map(e =>
      e.mode ? { ...blankSoap(), ...e }
        : (e.s || e.o || e.a || e.p) ? { ...blankSoap(), ...e, mode: 'simple' }
        : { ...blankSoap(), ...e }),
    certs: (p.certs || []).map(e => ({ ...blankCert(), ...e, impression: e.impression ?? e.diagnosis ?? '', recs: e.recs ?? e.rec ?? '' })),
  }
}

// records saved by the old, single-device version (used once for upload)
export function loadLocalPatients() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(d?.patients) ? d.patients.map(normalizePatient) : []
  } catch { return [] }
}

export function ageFrom(bday) {
  if (!bday) return ''
  const d = new Date(bday), n = new Date()
  let a = n.getFullYear() - d.getFullYear()
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--
  return a >= 0 ? a : ''
}

export function longDate(s) {
  return s
    ? new Date(s + 'T00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '__________'
}
