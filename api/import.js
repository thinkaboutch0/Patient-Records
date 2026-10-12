import { guard, redis, send } from './_lib.js'

export default guard(['POST'], async (req, res) => {
  const list = req.body?.patients
  if (!Array.isArray(list) || list.some(p => !p || typeof p.id !== 'string' || !p.id)) return send(res, 400, { error: 'Invalid backup' })
  await redis('DEL', 'patients')
  if (list.length) await redis('HSET', 'patients', ...list.flatMap(p => [p.id, JSON.stringify(p)]))
  send(res, 200, { ok: true, count: list.length })
})
