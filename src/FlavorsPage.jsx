import { useEffect, useRef, useState } from 'react'
import { addFlavorEntry } from './submissions'
import { drawFrameComposite } from './frameUtils'
import { assetUrl } from './assetUrl'

export default function FlavorsPage({ onBack }) {
  const [fanName, setFanName] = useState('')
  const [photoReady, setPhotoReady] = useState(false)
  const [frameReady, setFrameReady] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [submitState, setSubmitState] = useState('idle')
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const fileInputRef = useRef(null)

  const drawComposite = (photoImg) => {
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas || !photoImg) return false
    canvas.width = frame.naturalWidth
    canvas.height = frame.naturalHeight
    drawFrameComposite(canvas.getContext('2d'), photoImg, frame)
    return true
  }

  useEffect(() => {
    const img = new Image()
    img.src = assetUrl('frame.png')
    img.onload = () => {
      frameRef.current = img
      setFrameReady(true)
    }
  }, [])

  useEffect(() => {
    if (!frameReady || !pendingPhoto) return
    if (drawComposite(pendingPhoto)) {
      setPhotoReady(true)
      setPendingPhoto(null)
    }
  }, [frameReady, pendingPhoto])

  const handlePhoto = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      if (drawComposite(img)) {
        setPhotoReady(true)
        setPendingPhoto(null)
      } else {
        setPhotoReady(false)
        setPendingPhoto(img)
      }
      setSubmitState('idle')
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const canSubmit =
    photoReady && fanName.trim().length > 0 && submitState !== 'sending'

  const downloadComposite = () => {
    const canvas = canvasRef.current
    if (!canvas || !photoReady) return
    const a = document.createElement('a')
    a.download = 'no-labels-choosing-the-flavors.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  const handleSubmit = async () => {
    const canvas = canvasRef.current
    if (!canvas || !photoReady || !fanName.trim()) return
    setSubmitState('sending')
    try {
      await addFlavorEntry(fanName.trim(), canvas)
      setSubmitState('done')
    } catch (err) {
      console.error(err)
      setSubmitState('error')
    }
  }

  return (
    <main className="flavors-page">
      <header className="flavors-page__head">
        <button type="button" className="flavors-page__back" onClick={onBack}>
          ← Postere Dön
        </button>
        <div className="flavors-page__title-wrap">
          <span className="flavors-page__no">01</span>
          <h1 className="flavors-page__title">CHOOSING THE FLAVORS</h1>
        </div>
      </header>

      <p className="flavors-page__desc">
        Temaya uygun bir fotoğraf seç; “NO LABELS PART 02” çerçevesi otomatik olarak
        fotoğrafının üstüne yerleşsin. Sonra indir ve paylaş!
      </p>

      <div className="flavors-page__layout">
        <div className="flavors-page__preview">
          {!photoReady && (
            <div className="flavors-page__empty">
              <img src={assetUrl('frame.png')} alt="" aria-hidden="true" />
              <span>Önizleme burada görünecek</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`flavors-page__canvas ${photoReady ? 'show' : ''}`}
          />
        </div>

        <aside className="flavors-page__panel">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="flavors__file"
            onChange={handlePhoto}
          />

          <input
            type="text"
            className="flavors__name"
            placeholder="Adın / kullanıcı adın"
            value={fanName}
            onChange={(e) => setFanName(e.target.value)}
            maxLength={40}
          />

          <div className="flavors-page__actions">
            <button
              type="button"
              className="flavors__btn flavors__btn--ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoReady ? 'Fotoğrafı Değiştir' : 'Galeriden Seç'}
            </button>
            <button
              type="button"
              className="flavors__btn"
              onClick={downloadComposite}
              disabled={!photoReady}
            >
              İndir
            </button>
            <button
              type="button"
              className="flavors__btn flavors__btn--send"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitState === 'sending'
                ? 'Gönderiliyor…'
                : submitState === 'done'
                  ? 'Gönderildi ✓'
                  : 'Gönder'}
            </button>
          </div>

          {!canSubmit && submitState !== 'done' && (
            <p className="flavors__hint">
              {!photoReady
                ? 'Önce galeriden bir fotoğraf seç.'
                : 'Göndermek için yukarıya adını yaz.'}
            </p>
          )}

          {submitState === 'done' && (
            <p className="flavors__note">
              Teşekkürler {fanName.trim()}! Katılımın kaydedildi.
            </p>
          )}
          {submitState === 'error' && (
            <p className="flavors__note flavors__note--err">
              Gönderilemedi. Firebase bağlantısını kontrol et ve tekrar dene.
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}
