import sharp from 'sharp'
const m = await sharp('public/runner-src.png').metadata()
console.log('meta', { width: m.width, height: m.height, channels: m.channels, hasAlpha: m.hasAlpha })
const { data, info } = await sharp('public/runner-src.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, channels } = info
const px = (x, y) => {
  const i = (y * width + x) * channels
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}
console.log('corner(0,0)', px(0, 0))
console.log('center', px((info.width / 2) | 0, (info.height / 2) | 0))
