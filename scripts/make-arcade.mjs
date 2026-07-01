import sharp from 'sharp'

const SRC =
  'C:/Users/DUYGU/.cursor/projects/c-Users-DUYGU-Desktop-no-labels-part-2/assets/arcade-pixel-v2.png'
const OUT = 'public/arcade.png'
const TOL = 60 // arka plan mavisine yakınlık eşiği

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width: W, height: H, channels: C } = info
const N = W * H
const idx = (x, y) => y * W + x

// köşe rengini arka plan referansı al
const cr = data[0]
const cg = data[1]
const cb = data[2]
const near = (p) => {
  const i = p * C
  return (
    Math.abs(data[i] - cr) < TOL &&
    Math.abs(data[i + 1] - cg) < TOL &&
    Math.abs(data[i + 2] - cb) < TOL
  )
}

// kenarlardan flood-fill => sadece dışa bağlı mavi = arka plan
const bg = new Uint8Array(N)
const stack = []
const seed = (p) => {
  if (!bg[p] && near(p)) {
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
    if (np >= 0 && !bg[np] && near(np)) {
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
console.log(`temizlenen arka plan pikseli: ${removed} / ${N}`)

await sharp(data, { raw: { width: W, height: H, channels: C } })
  .png()
  .trim()
  .toFile(OUT)
console.log('yazıldı:', OUT)
