import { guard, redis, send } from './_lib.js'

export default guard(['PUT', 'DELETE'], async (req, res) => {
  if (req.method === 'DELETE') {
    const id = String(req.query?.id || '')
    if (!id || id.length > 64) return send(res, 400, { error: 'Missing patient id' })
    await redis('HDEL', 'patients', id)
    return send(res, 200, { ok: true })
  }
  const p = req.body
  if (!p || typeof p.id !== 'string' || !p.id || p.id.length > 64) return send(res, 400, { error: 'Invalid patient' })
  await redis('HSET', 'patients', p.id, JSON.stringify(p))
  send(res, 200, { ok: true })
})
