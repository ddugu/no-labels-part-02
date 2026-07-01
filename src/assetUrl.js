// GitHub Pages alt yolu (/no-labels-part-02/) için public görselleri
export function assetUrl(path) {
  const clean = String(path).replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${clean}`
}
