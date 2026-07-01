// Çerçevenin şeffaf foto penceresi (730×1024 frame analizi)
export const FRAME_WINDOW = { x: 81, y: 293, w: 558, h: 442 }

export function drawFrameComposite(ctx, photoImg, frameImg) {
  const cw = frameImg.naturalWidth
  const ch = frameImg.naturalHeight
  const { x, y, w, h } = FRAME_WINDOW

  ctx.clearRect(0, 0, cw, ch)

  // fotoğraf yalnızca pencere alanına "cover" ile yerleşir
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()

  const wr = w / h
  const ir = photoImg.naturalWidth / photoImg.naturalHeight
  let dw, dh, dx, dy
  if (ir > wr) {
    dh = h
    dw = h * ir
    dx = x + (w - dw) / 2
    dy = y
  } else {
    dw = w
    dh = w / ir
    dx = x
    dy = y + (h - dh) / 2
  }
  ctx.drawImage(photoImg, dx, dy, dw, dh)
  ctx.restore()

  ctx.drawImage(frameImg, 0, 0, cw, ch)
}
