import { api } from './api.js'

const cache = new Map()

export function getPhoto(id) {
  if (!cache.has(id)) {
    cache.set(id, api.photo(id).then(r => r.data).catch(e => { cache.delete(id); throw e }))
  }
  return cache.get(id)
}
export const putPhoto = (id, data) => cache.set(id, Promise.resolve(data))
export function dropPhoto(id) {
  cache.delete(id)
  return api.deletePhoto(id).catch(() => {})
}

const MAX_BYTES = 480 * 1024

const toDataUrl = blob => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = () => reject(new Error('Could not read the photo.'))
  r.readAsDataURL(blob)
})

// Shrinks a photo in the browser so it uploads quickly and fits in the database.
export async function compressImage(file) {
  let bmp
  try { bmp = await createImageBitmap(file) }
  catch { throw new Error('This browser cannot read that file as a photo.') }
  let scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  let quality = 0.8
  try {
    for (let n = 0; n < 10; n++) {
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(bmp.width * scale))
      c.height = Math.max(1, Math.round(bmp.height * scale))
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(bmp, 0, 0, c.width, c.height)
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', quality))
      if (blob && blob.size <= MAX_BYTES) return await toDataUrl(blob)
      if (quality > 0.5) quality -= 0.1
      else scale *= 0.8
    }
  } finally { bmp.close?.() }
  throw new Error('Could not shrink that photo enough. Try a smaller one.')
}
