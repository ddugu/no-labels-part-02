import sharp from 'sharp'

const SRC =
  'C:/Users/DUYGU/.cursor/projects/c-Users-DUYGU-Desktop-no-labels-part-2/assets/c__Users_DUYGU_AppData_Roaming_Cursor_User_workspaceStorage_1f26837dfedac6b0bad6cccfe69d5431_images___YURIN_3__1_-1f4389bf-40ec-4223-8573-91faed6fb058.png'
const OUT = 'public/frame.png'
const BLACK = 50 // bu eşiğin altındaki r,g,b => "siyah" (dış + orta boşluk)

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width: W, height: H, channels: C } = info
const N = W * H
const idx = (x, y) => y * W + x

const isBlack = (p) => {
  const i = p * C
  return data[i] < BLACK && data[i + 1] < BLACK && data[i + 2] < BLACK
}

// kenarlardan VE merkezden flood-fill => dışa/ortaya bağlı siyah = boşluk
const bg = new Uint8Array(N)
const stack = []
const seed = (p) => {
  if (p >= 0 && !bg[p] && isBlack(p)) {
    bg[p] = 1
    stack.push(p)
  }
}
for (let x = 0; x < W; x++) {
  seed(idx(x, 0))
  seed(idx(x, H - 1))
}
for (let y = 0; y < H; y++) {
  seed(idx(0, y))
  seed(idx(W - 1, y))
}
// merkez de tohum (orta pencere siyahı)
seed(idx((W / 2) | 0, (H / 2) | 0))

while (stack.length) {
  const p = stack.pop()
  const x = p % W
  const y = (p / W) | 0
  const ns = [
    x > 0 ? p - 1 : -1,
    x < W - 1 ? p + 1 : -1,
    y > 0 ? p - W : -1,
    y < H - 1 ? p + W : -1,
  ]
  for (const np of ns) {
    if (np >= 0 && !bg[np] && isBlack(np)) {
      bg[np] = 1
      stack.push(np)
    }
  }
}

let removed = 0
for (let p = 0; p < N; p++) {
  if (bg[p]) {
    data[p * C + 3] = 0
    removed++
  }
}
console.log(`şeffaflaştırılan piksel: ${removed} / ${N}`)

await sharp(data, { raw: { width: W, height: H, channels: C } })
  .png()
  .toFile(OUT)
console.log('yazıldı:', OUT)
