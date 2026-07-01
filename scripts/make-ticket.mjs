import sharp from 'sharp'

const TICKET =
  'C:/Users/DUYGU/.cursor/projects/c-Users-DUYGU-Desktop-no-labels-part-2/assets/ticket-blank.png'
const LOGO = 'public/logo.png'
const OUT = 'public/ticket.png'

const t = await sharp(TICKET).metadata()
const W0 = t.width
const H0 = t.height

// logoyu NET haliyle yerleştir (yüksek kaliteli yeniden boyutlandırma)
const targetW = Math.round(W0 * 0.26)
const logoBuf = await sharp(LOGO)
  .resize(targetW, null, { kernel: 'lanczos3' })
  .png()
  .toBuffer()
const lm = await sharp(logoBuf).metadata()

// sol boşluğun ortasına hizala
const cx = Math.round(W0 * 0.27)
const cy = Math.round(H0 * 0.5)
const left = Math.round(cx - lm.width / 2)
const top = Math.round(cy - lm.height / 2)

// logoyu bilete bindir
const composited = await sharp(TICKET)
  .composite([{ input: logoBuf, left, top }])
  .png()
  .toBuffer()

// --- arka planı kes: AI damalı/açık zemini kenarlardan flood-fill ile temizle ---
const { data, info } = await sharp(composited)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info
const N = W * H
const idx = (x, y) => y * W + x

const isBg = (p) => {
  const i = p * C
  const a = data[i + 3]
  if (a < 40) return true
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  const avg = (r + g + b) / 3
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  // açık + doygunluğu düşük => damalı/beyaz zemin
  return avg > 205 && mx - mn < 45
}

const bg = new Uint8Array(N)
const stack = []
const seed = (p) => {
  if (!bg[p] && isBg(p)) {
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
    if (np >= 0 && !bg[np] && isBg(np)) {
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

await sharp(data, { raw: { width: W, height: H, channels: C } })
  .png()
  .trim()
  .toFile(OUT)

console.log(
  `logo ${lm.width}x${lm.height} @ (${left},${top}); kesilen zemin ${removed}/${N} -> ${OUT}`,
)
