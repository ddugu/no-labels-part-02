import sharp from 'sharp'

// beyaz zemini sil, çizgileri lacivere boya (yumuşak kenarlı)
const NAVY = [35, 63, 99] // #233f63

const { data, info } = await sharp('public/runner-src.png')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height, channels } = info
const N = width * height

for (let p = 0; p < N; p++) {
  const i = p * channels
  // kaynak zaten şeffaf; sadece görünür çizgileri lacivere boya,
  // mevcut alfayı (yumuşak kenarları) koru
  if (data[i + 3] > 0) {
    data[i] = NAVY[0]
    data[i + 1] = NAVY[1]
    data[i + 2] = NAVY[2]
  }
}

// görseli içeriğe göre kırp (etrafındaki boş alanı at)
await sharp(data, { raw: { width, height, channels } })
  .png()
  .trim({ threshold: 1 })
  .toFile('public/runner.png')

console.log('runner.png yazıldı')
