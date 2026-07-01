// Boş = geliştirme (Vite proxy /api ve /uploads yönlendirir)
// Canlıda: VITE_API_URL=https://senin-api-adresin.com
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

export function resolveUploadUrl(path) {
  if (!path) return path
  if (path.startsWith('http') || path.startsWith('data:')) return path
  return apiUrl(path)
}
