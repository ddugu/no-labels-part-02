import sharp from 'sharp'

const img = sharp('public/truck.png')
const meta = await img.metadata()
console.log('meta', {
  width: meta.width,
  height: meta.height,
  channels: meta.channels,
  hasAlpha: meta.hasAlpha,
})

const { data, info } = await img
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const { width, height, channels } = info

function px(x, y) {
  const i = (y * width + x) * channels
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

console.log('top-left   ', px(0, 0))
console.log('top-right  ', px(width - 1, 0))
console.log('bottom-left', px(0, height - 1))
console.log('bottom-right', px(width - 1, height - 1))
console.log('center-top ', px((width / 2) | 0, 3))
