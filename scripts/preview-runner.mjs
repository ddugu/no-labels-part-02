import sharp from 'sharp'
const r = sharp('public/runner.png')
const { width, height } = await r.metadata()
await sharp({
  create: { width, height, channels: 4, background: { r: 174, g: 191, b: 217, alpha: 1 } },
})
  .composite([{ input: await r.png().toBuffer() }])
  .png()
  .toFile('scripts/preview-runner.png')
console.log('ok', width, height)
