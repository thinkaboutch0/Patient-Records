import { timingSafeEqual } from 'node:crypto'

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export async function redis(...cmd) {
  if (!URL_ || !TOKEN) throw Object.assign(new Error('The database is not connected yet. Add Upstash Redis in the Vercel Storage tab.'), { expose: true })
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.error) throw new Error(j.error || `Database error ${r.status}`)
  return j.result
}

export function samePassword(given) {
  const pw = process.env.APP_PASSWORD || ''
  const a = Buffer.from(String(given ?? '')), b = Buffer.from(pw)
  return pw.length > 0 && a.length === b.length && timingSafeEqual(a, b)
}

export function send(res, code, body) {
  res.setHeader('Cache-Control', 'no-store')
  res.status(code).json(body)
}

// Wraps a handler: checks the server is configured, the password is right, and the method is allowed.
export function guard(methods, handler) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) return send(res, 405, { error: 'Method not allowed' })
      if (!process.env.APP_PASSWORD) return send(res, 500, { error: 'The passcode is not set on the server (APP_PASSWORD). Add it in Vercel > Settings > Environment Variables, then redeploy.' })
      let given = ''
      try { given = decodeURIComponent(String(req.headers['x-app-password'] || '')) } catch { /* bad header */ }
      if (!samePassword(given)) return send(res, 401, { error: 'Wrong passcode.' })
      await handler(req, res)
    } catch (e) {
      console.error(e)
      send(res, 500, { error: e.expose ? e.message : 'Server error. Please try again.' })
    }
  }
}

export function parsePatients(raw) {
  const out = []
  for (let i = 0; i < (raw?.length || 0); i += 2) {
    try { out.push(JSON.parse(raw[i + 1])) } catch { /* skip bad row */ }
  }
  return out
}
