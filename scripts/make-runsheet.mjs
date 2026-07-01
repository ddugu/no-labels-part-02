import sharp from 'sharp'

const SRC = 'public/runner-green.png'
const OUT = 'public/runner-sheet.png'
const N = 7 // kare sayısı (eşit aralıklı)
const TARGET_H = 260
const PAD_X = 14

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: Ch } = info

// 1) yeşili kes + despill
const op = new Uint8Array(W * H)
for (let p = 0; p < W * H; p++) {
  const i = p * Ch
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  if (g > 110 && g - r > 32 && g - b > 32) {
    data[i + 3] = 0
  } else {
    data[i + 3] = 255
    op[p] = 1
    if (g > r && g > b) data[i + 1] = Math.round((r + b) / 2)
  }
}

const colCount = new Array(W).fill(0)
for (let x = 0; x < W; x++) {
  let c = 0
  for (let y = 0; y < H; y++) if (op[y * W + x]) c++
  colCount[x] = c
}

// 2) her dilimde, en dolu sütundan tohumla bağlı karakteri (CC) bul
function bfsFrom(seedX, seedY) {
  const stack = [seedY * W + seedX]
  const seen = new Set()
  seen.add(seedY * W + seedX)
  let minX = seedX
  let maxX = seedX
  let minY = seedY
  let maxY = seedY
  const pts = []
  while (stack.length) {
    const p = stack.pop()
    const x = p % W
    const y = (p / W) | 0
    pts.push(p)
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const np = ny * W + nx
        if (op[np] && !seen.has(np)) {
          seen.add(np)
          stack.push(np)
        }
      }
    }
  }
  return { pts, minX, maxX, minY, maxY }
}

const frames = []
for (let i = 0; i < N; i++) {
  const sx0 = Math.round((i * W) / N)
  const sx1 = Math.round(((i + 1) * W) / N) - 1
  // dilim içindeki en dolu sütun
  let bestX = sx0
  let best = -1
  for (let x = sx0; x <= sx1; x++) {
    if (colCount[x] > best) {
      best = colCount[x]
      bestX = x
    }
  }
  // o sütunda opak bir y bul
  let seedY = -1
  for (let y = 0; y < H; y++) {
    if (op[y * W + bestX]) {
      seedY = y
      break
    }
  }
  frames.push(bfsFrom(bestX, seedY))
}

// 3) ortak dikey aralık
const gMinY = Math.min(...frames.map((f) => f.minY))
const gMaxY = Math.max(...frames.map((f) => f.maxY))
const cropH = gMaxY - gMinY + 1
const cellW = Math.max(...frames.map((f) => f.maxX - f.minX + 1)) + PAD_X * 2

// 4) sheet raw buffer (sadece karakter pikselleri)
const sheetW = cellW * N
const out = Buffer.alloc(sheetW * cropH * 4, 0)
for (let i = 0; i < N; i++) {
  const f = frames[i]
  const fw = f.maxX - f.minX + 1
  const cx = i * cellW + Math.round((cellW - fw) / 2)
  for (const p of f.pts) {
    const x = p % W
    const y = (p / W) | 0
    const dx = cx + (x - f.minX)
    const dy = y - gMinY
    if (dy < 0 || dy >= cropH || dx < 0 || dx >= sheetW) continue
    const si = p * Ch
    const di = (dy * sheetW + dx) * 4
    out[di] = data[si]
    out[di + 1] = data[si + 1]
    out[di + 2] = data[si + 2]
    out[di + 3] = data[si + 3]
  }
}

// 5) hedef yüksekliğe ölçekle ve kaydet
const scale = TARGET_H / cropH
await sharp(out, { raw: { width: sheetW, height: cropH, channels: 4 } })
  .resize(Math.round(sheetW * scale), Math.round(cropH * scale))
  .png()
  .toFile(OUT)

console.log('FRAMES =', N)
console.log('CELL_W =', Math.round(cellW * scale))
console.log('CELL_H =', Math.round(cropH * scale))
