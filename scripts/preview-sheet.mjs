import sharp from 'sharp'
const s = sharp('public/runner-sheet.png')
const { width, height } = await s.metadata()
await sharp({
  create: { width, height, channels: 4, background: { r: 174, g: 191, b: 217, alpha: 1 } },
})
  .composite([{ input: await s.png().toBuffer() }])
  .png()
  .toFile('scripts/preview-sheet.png')
console.log('ok', width, height)
