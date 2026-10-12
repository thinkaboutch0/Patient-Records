import { guard, redis, send, parsePatients } from './_lib.js'

export default guard(['GET'], async (_req, res) => {
  const [raw, doctor] = await Promise.all([redis('HGETALL', 'patients'), redis('GET', 'doctor')])
  let doc = null
  try { doc = doctor ? JSON.parse(doctor) : null } catch { /* ignore */ }
  send(res, 200, { patients: parsePatients(raw), doctor: doc })
})
