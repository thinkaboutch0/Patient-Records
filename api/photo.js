import { guard, redis, send } from './_lib.js'

const ID = /^[a-z0-9]{8,40}$/
const DATA = /^data:image\/(jpeg|png|webp);base64,/
const MAX_CHARS = 700000 // stays under the database's per-request size limit

export default guard(['GET', 'PUT', 'DELETE'], async (req, res) => {
  const id = String(req.method === 'PUT' ? req.body?.id : req.query?.id || '')
  if (!ID.test(id)) return send(res, 400, { error: 'Invalid photo id' })
  const key = `photo:${id}`

  if (req.method === 'PUT') {
    const data = req.body?.data
    if (typeof data !== 'string' || !DATA.test(data)) return send(res, 400, { error: 'Only JPEG, PNG or WebP photos are accepted' })
    if (data.length > MAX_CHARS) return send(res, 413, { error: 'That photo is too large' })
    await redis('SET', key, data)
    return send(res, 200, { ok: true })
  }
  if (req.method === 'DELETE') {
    await redis('DEL', key)
    return send(res, 200, { ok: true })
  }
  const data = await redis('GET', key)
  if (!data) return send(res, 404, { error: 'Photo not found' })
  send(res, 200, { data })
})
