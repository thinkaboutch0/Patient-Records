const PW = 'patient-records-pw'

export const getPw = () => sessionStorage.getItem(PW) || localStorage.getItem(PW) || ''
export function setPw(pw) {
  clearPw()
  localStorage.setItem(PW, pw)
}
export function clearPw() {
  sessionStorage.removeItem(PW)
  localStorage.removeItem(PW)
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) headers['x-app-password'] = encodeURIComponent(getPw())
  let r
  try {
    r = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw Object.assign(new Error('Cannot reach the server. Check your internet connection.'), { status: 0 })
  }
  const j = await r.json().catch(() => null)
  if (!r.ok) throw Object.assign(new Error(j?.error || `Request failed (${r.status})`), { status: r.status })
  return j
}

export const api = {
  login: password => request('/api/login', { method: 'POST', body: { password }, auth: false }),
  load: () => request('/api/data'),
  savePatient: p => request('/api/patient', { method: 'PUT', body: p }),
  deletePatient: id => request('/api/patient?id=' + encodeURIComponent(id), { method: 'DELETE' }),
  saveDoctor: d => request('/api/doctor', { method: 'PUT', body: d }),
  photo: id => request('/api/photo?id=' + encodeURIComponent(id)),
  savePhoto: (id, data) => request('/api/photo', { method: 'PUT', body: { id, data } }),
  deletePhoto: id => request('/api/photo?id=' + encodeURIComponent(id), { method: 'DELETE' }),
  importAll: patients => request('/api/import', { method: 'POST', body: { patients } }),
}
