import { guard, redis, send } from './_lib.js'

export default guard(['PUT'], async (req, res) => {
  const d = req.body
  if (!d || typeof d !== 'object' || Array.isArray(d)) return send(res, 400, { error: 'Invalid doctor details' })
  await redis('SET', 'doctor', JSON.stringify(d))
  send(res, 200, { ok: true })
})
