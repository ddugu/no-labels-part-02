import sharp from 'sharp'

const truck = sharp('public/truck.png')
const { width, height } = await truck.metadata()

const bg = {
  create: {
    width,
    height,
    channels: 4,
    background: { r: 146, g: 168, b: 201, alpha: 1 }, // --truck-sky
  },
}

await sharp(bg)
  .composite([{ input: await truck.png().toBuffer() }])
  .png()
  .toFile('scripts/preview.png')

console.log('önizleme yazıldı: scripts/preview.png')
