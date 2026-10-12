import { samePassword, send } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })
  if (!process.env.APP_PASSWORD) return send(res, 500, { error: 'The passcode is not set on the server (APP_PASSWORD). Add it in Vercel > Settings > Environment Variables, then redeploy.' })
  if (!samePassword(req.body?.password)) {
    await new Promise(r => setTimeout(r, 700)) // slows down password guessing
    return send(res, 401, { error: 'Wrong passcode.' })
  }
  send(res, 200, { ok: true })
}
