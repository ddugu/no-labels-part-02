import sharp from 'sharp'

const SRC = 'public/truck.png'
const OUT = 'public/truck.png'
const BLACK = 28 // bu eşiğin altındaki r,g,b => "siyah"
const ERODE = 3 // ince temas köprülerini kopar (lastik korunur)

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width: W, height: H, channels: C } = info
const N = W * H

// 1) siyah maskesi
const black = new Uint8Array(N)
for (let p = 0; p < N; p++) {
  const i = p * C
  if (data[i] < BLACK && data[i + 1] < BLACK && data[i + 2] < BLACK) black[p] = 1
}

const idx = (x, y) => y * W + x

// 8-komşu erozyon (ERODE kez)
function erode(src) {
  let cur = src
  for (let k = 0; k < ERODE; k++) {
    const next = new Uint8Array(N)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = idx(x, y)
        if (!cur[p]) continue
        let keep = 1
        for (let dy = -1; dy <= 1 && keep; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            // sınır dışı = siyah kabul (arka plan kenara bağlı kalsın)
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
            if (!cur[idx(nx, ny)]) {
              keep = 0
              break
            }
          }
        }
        next[p] = keep
      }
    }
    cur = next
  }
  return cur
}

const eroded = erode(black)

// 2) kenarlardan flood-fill => arka plan bileşeni (eroded maskesi üzerinde)
const bg = new Uint8Array(N)
const stack = []
for (let x = 0; x < W; x++) {
  for (const y of [0, H - 1]) {
    const p = idx(x, y)
    if (eroded[p] && !bg[p]) {
      bg[p] = 1
      stack.push(p)
    }
  }
}
for (let y = 0; y < H; y++) {
  for (const x of [0, W - 1]) {
    const p = idx(x, y)
    if (eroded[p] && !bg[p]) {
      bg[p] = 1
      stack.push(p)
    }
  }
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
    if (np >= 0 && eroded[np] && !bg[np]) {
      bg[np] = 1
      stack.push(np)
    }
  }
}

// 3) erozyonu geri al: bg'yi (ERODE+1) kez genişlet, orijinal siyah maskesiyle kesiştir
function dilateInto(seed, mask, times) {
  let cur = Uint8Array.from(seed)
  for (let k = 0; k < times; k++) {
    const next = Uint8Array.from(cur)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = idx(x, y)
        if (cur[p]) continue
        if (!mask[p]) continue
        if (
          (x > 0 && cur[p - 1]) ||
          (x < W - 1 && cur[p + 1]) ||
          (y > 0 && cur[p - W]) ||
          (y < H - 1 && cur[p + W])
        ) {
          next[p] = 1
        }
      }
    }
    cur = next
  }
  return cur
}

const bgFull = dilateInto(bg, black, ERODE + 1)

// 4) arka planı şeffaf yap
let removed = 0
for (let p = 0; p < N; p++) {
  if (bgFull[p]) {
    data[p * C + 3] = 0
    removed++
  }
}

console.log(`temizlenen arka plan pikseli: ${removed} / ${N}`)

await sharp(data, { raw: { width: W, height: H, channels: C } })
  .png()
  .toFile(OUT + '.tmp.png')

// güvenli üzerine yazma
import { renameSync, copyFileSync } from 'node:fs'
copyFileSync(OUT, 'public/truck-original.png')
renameSync(OUT + '.tmp.png', OUT)
console.log('yazıldı:', OUT, '(yedek: public/truck-original.png)')
