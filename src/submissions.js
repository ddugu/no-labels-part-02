// Gönderi servisi — MongoDB API (Express) üzerinden çalışır.
import { apiUrl } from './api'

const LS_KEY = 'nl_flavors_entries'
const ADMIN_KEY = 'nl_admin_key'
const EVENT = 'CHOOSING THE FLAVORS'
const API = '/api/flavors'

const canvasToBlob = (canvas) =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))

async function apiOk() {
  try {
    const r = await fetch(apiUrl('/api/health'))
    return r.ok
  } catch {
    return false
  }
}

function adminHeaders() {
  const key = sessionStorage.getItem(ADMIN_KEY)
  return key ? { 'X-Admin-Key': key } : {}
}

export function isAdminLoggedIn() {
  return Boolean(sessionStorage.getItem(ADMIN_KEY))
}

export function adminLogout() {
  sessionStorage.removeItem(ADMIN_KEY)
}

export async function adminLogin(password) {
  const clean = String(password || '').trim()
  const r = await fetch(apiUrl('/api/admin/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: clean }),
  })
  if (!r.ok) throw new Error('Yanlış şifre')
  sessionStorage.setItem(ADMIN_KEY, clean)
}

export async function addFlavorEntry(name, canvas) {
  const blob = await canvasToBlob(canvas)
  if (!blob) throw new Error('Görsel oluşturulamadı')

  if (await apiOk()) {
    const fd = new FormData()
    fd.append('name', name)
    fd.append('image', blob, 'flavors.jpg')
    const r = await fetch(apiUrl(API), { method: 'POST', body: fd })
    if (!r.ok) throw new Error('API hatası')
    return
  }

  // API kapalıysa yerel yedek (geliştirme)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  list.push({ name, event: EVENT, image: dataUrl, ts: Date.now() })
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export async function getFlavorEntries() {
  if (await apiOk()) {
    const r = await fetch(apiUrl(API), { headers: adminHeaders() })
    if (r.status === 401) throw new Error('UNAUTHORIZED')
    if (!r.ok) throw new Error('API hatası')
    return r.json()
  }
  if (!isAdminLoggedIn()) throw new Error('UNAUTHORIZED')
  const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  return list.sort((a, b) => b.ts - a.ts)
}

export async function deleteFlavorEntry(entry) {
  if (await apiOk() && entry.id) {
    const r = await fetch(apiUrl(`${API}/${entry.id}`), {
      method: 'DELETE',
      headers: adminHeaders(),
    })
    if (r.status === 401) throw new Error('UNAUTHORIZED')
    if (!r.ok) throw new Error('API hatası')
    return
  }
  const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  const next = list.filter((e) => e.ts !== entry.ts)
  localStorage.setItem(LS_KEY, JSON.stringify(next))
}
