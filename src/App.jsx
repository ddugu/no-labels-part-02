import { useEffect, useMemo, useState } from 'react'
import './App.css'
import FlavorsPage from './FlavorsPage'
import {
  getFlavorEntries,
  deleteFlavorEntry,
  adminLogin,
  adminLogout,
  isAdminLoggedIn,
} from './submissions'
import { resolveUploadUrl } from './api'

function getRoute() {
  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
  if (hash === 'admin') return 'admin'
  if (hash === 'flavors') return 'flavors'
  return 'home'
}

// Poster üzerindeki buz küpü etkinlikleri (poster 730x1024 baz alınarak % konum)
const EVENTS = [
  {
    id: 1,
    title: 'CHOOSING THE FLAVORS',
    hot: { left: 31, top: 26, w: 28, h: 17 },
    desc: 'Albümdeki favori anlarını seç, kendi “flavor” listeni oluştur ve paylaş.',
  },
  {
    id: 2,
    title: 'MELTING POV',
    hot: { left: 40, top: 44, w: 26, h: 13 },
    desc: 'Kendi POV videonu çek; o eridiğin anı yakala ve etikete ekle.',
  },
  {
    id: 3,
    title: 'ICE-COLD FIT CHECK',
    hot: { left: 13, top: 52, w: 27, h: 16 },
    desc: 'Albüm konseptine uygun kombinini paylaş, en “cool” fit’i birlikte seçelim.',
  },
  {
    id: 4,
    title: 'EMPTY THE FREEZER',
    hot: { left: 35, top: 67, w: 27, h: 15 },
    desc: 'Arşivini boşalt: eski fotoğraf ve edit’lerini geri getir.',
  },
  {
    id: 5,
    title: 'NON-STOP MELTING',
    hot: { left: 17, top: 83, w: 27, h: 15 },
    desc: 'Durmadan stream! Sayaç dolana kadar dinlemeye devam et.',
  },
]

function App() {
  // intro -> home (animasyon bitince arcade gelir)
  const [introDone, setIntroDone] = useState(false)
  const [skipped, setSkipped] = useState(false)
  // sahne akışı: arcade -> ticket -> poster
  const [scene, setScene] = useState('arcade')
  // poster gelince açılan tanıtım rehberi
  const [showGuide, setShowGuide] = useState(false)
  // açık olan etkinlik kutusu (null = kapalı, 1 = ayrı sayfa)
  const [openEvent, setOpenEvent] = useState(null)
  const [route, setRoute] = useState(() => getRoute())

  // Dondurma yağmuru — rastgele konum/zamanlama bir kez üretilir
  const popsicles = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        left: Math.random() * 100,
        size: 20 + Math.random() * 32,
        delay: -Math.random() * 14,
        duration: 8 + Math.random() * 9,
        sway: (Math.random() * 2 - 1) * 60,
        spin: (Math.random() * 2 - 1) * 260,
      })),
    [],
  )

  useEffect(() => {
    if (skipped) {
      setIntroDone(true)
      return
    }
    // Toplam animasyon süresi sonunda giriş tamamlanır
    const t = setTimeout(() => setIntroDone(true), 9200)
    return () => clearTimeout(t)
  }, [skipped])

  // ESC ile kutuyu kapat
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenEvent(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // hash ile sayfa yönlendirme (#admin, #flavors)
  useEffect(() => {
    const onHash = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const backToPoster = () => {
    setScene('poster')
    setIntroDone(true)
    setShowGuide(false)
    setOpenEvent(null)
    window.location.hash = ''
    window.scrollTo(0, 0)
  }

  const goToFlavors = () => {
    setScene('poster')
    setIntroDone(true)
    setShowGuide(false)
    setOpenEvent(null)
    window.location.hash = '#flavors'
  }

  const active = EVENTS.find((e) => e.id === openEvent) || null

  if (route === 'admin') {
    return <AdminView />
  }

  return (
    <>
    <main
      className={`stage ${skipped ? 'skip' : ''} ${introDone ? 'done' : ''} scene-${scene} ${route !== 'home' ? 'stage--hidden' : ''}`}
    >
      <div className="brand">
        <img
          src="/logo.png"
          alt="Too Cool To Label Campaign"
          className="brand-logo"
        />
        <span className="brand-text">TOO COOL TO LABEL</span>
      </div>

      <section className="hero">
        {/* Dondurma yağmuru */}
        <div className="popsicles" aria-hidden="true">
          {popsicles.map((p, i) => (
            <img
              key={i}
              src="/popsicle.png"
              alt=""
              className="popsicle"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                '--sway': `${p.sway}px`,
                '--spin': `${p.spin}deg`,
              }}
            />
          ))}
        </div>

        {/* Konvoy: araba "NO LABELS" pankartını arkasından çeker */}
        <div className="convoy">
          <div className="convoy__truck">
            <img src="/truck.png" alt="" className="convoy__img" />
          </div>

          <div className="convoy__banner">
            <h1 className="convoy__title">NO&nbsp;LABELS</h1>
            <div className="convoy__sub">
              <span>PART 02</span>
              <span className="convoy__dot" aria-hidden="true">
                •
              </span>
              <span>YEONJUN</span>
            </div>
          </div>

          {/* yazıyı ekranda tam ortalamak için denge boşluğu */}
          <div className="convoy__spacer" aria-hidden="true" />
        </div>

        {/* peşlerinden koşan karakter (sprite döngüsü) */}
        <div className="runner" aria-hidden="true" />

        {/* 1) Arcade makinesi: tıkla, yuvadan bilet çıksın */}
        <div
          className={`arcade-scene scene-${scene} ${
            introDone && (scene === 'arcade' || scene === 'ticket')
              ? 'show'
              : ''
          }`}
        >
          <div className="arcade-wrap">
            <button
              type="button"
              className="arcade-machine"
              onClick={() => scene === 'arcade' && setScene('ticket')}
              aria-label="Bilet almak için makineye dokun"
            >
              <img src="/arcade.png" alt="Too Cool To Label arcade makinesi" />
            </button>
          </div>

          {/* makineden çıkıp ekrana doğru büyüyen bilet */}
          <img
            src="/ticket.png"
            alt="No Labels bileti"
            className="slot-ticket"
          />

          {scene === 'arcade' && (
            <p className="arcade-hint">Bilet almak için makineye dokun</p>
          )}
          {scene === 'ticket' && (
            <div className="ticket-cta">
              <p className="ticket-cta__text">Biletin hazır!</p>
              <button
                type="button"
                className="ticket-cta__btn"
                onClick={() => {
                  setScene('poster')
                  setShowGuide(true)
                }}
              >
                Etkinliklere Başla
              </button>
            </div>
          )}
        </div>

        {/* 3) İnteraktif poster */}
        <div
          className={`poster-overlay ${
            introDone && scene === 'poster' ? 'show' : ''
          }`}
        >
          <div className="poster-wrap">
            <img src="/poster.png" alt="No Labels Part 02 — Yeonjun" className="poster-img" />
            {EVENTS.map((ev) => (
              <button
                key={ev.id}
                type="button"
                className="hotspot"
                style={{
                  left: `${ev.hot.left}%`,
                  top: `${ev.hot.top}%`,
                  width: `${ev.hot.w}%`,
                  height: `${ev.hot.h}%`,
                }}
                onClick={() => {
                  if (ev.id === 1) {
                    goToFlavors()
                  } else {
                    setOpenEvent(ev.id)
                  }
                }}
                aria-label={`${ev.id}. etkinlik: ${ev.title}`}
              >
                <span className="hotspot__badge">{ev.id}</span>
              </button>
            ))}
          </div>
          <p className="poster-hint">Bir etkinliğe dokun</p>
        </div>
      </section>

      {/* Poster gelince açılan tanıtım rehberi (dondurma temalı) */}
      {scene === 'poster' && showGuide && (
        <div className="guide" onClick={() => setShowGuide(false)}>
          <div
            className="guide__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="guide__close"
              onClick={() => setShowGuide(false)}
              aria-label="Kapat"
            >
              ×
            </button>
            <img src="/popsicle.png" alt="" className="guide__pop" aria-hidden="true" />
            <h3 className="guide__title" id="guide-title">
              ETKİNLİK REHBERİ
            </h3>
            <p className="guide__intro">
              Posterdeki buz küplerinden birine dokun — her küp farklı bir
              etkinlik! İşte kısaca ne yapacağız:
            </p>
            <ul className="guide__list">
              {EVENTS.map((ev) => (
                <li key={ev.id} className="guide__item">
                  <span className="guide__no">{ev.id}</span>
                  <span className="guide__text">
                    <strong>{ev.title}</strong>
                    <span>{ev.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="guide__btn"
              onClick={() => setShowGuide(false)}
            >
              Haydi başlayalım
            </button>
          </div>
        </div>
      )}

      {/* Etkinlik detay kutusu */}
      {active && (
        <div className="modal" onClick={() => setOpenEvent(null)}>
          <div
            className="modal__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal__close"
              onClick={() => setOpenEvent(null)}
              aria-label="Kapat"
            >
              ×
            </button>
            <span className="modal__no">{String(active.id).padStart(2, '0')}</span>
            <h3 className="modal__title" id="modal-title">
              {active.title}
            </h3>

            <p className="modal__desc">{active.desc}</p>
            <button
              type="button"
              className="modal__start"
              onClick={() => {
                if (active.id === 1) {
                  goToFlavors()
                } else {
                  setOpenEvent(null)
                }
              }}
            >
              Başla
            </button>
          </div>
        </div>
      )}

      {!introDone && (
        <button
          type="button"
          className="skip-btn"
          onClick={() => setSkipped(true)}
        >
          Geç ›
        </button>
      )}

      <footer
        className={`disclaimer ${
          introDone && scene === 'poster' ? 'show' : ''
        }`}
      >
        Bu resmi olmayan, kâr amacı gütmeyen bir hayran projesidir. Tüm haklar
        YEONJUN ve ajansına aittir. Görseller hayranlar tarafından çizilmiştir.
      </footer>
    </main>

    {route === 'flavors' && (
      <FlavorsPage onBack={backToPoster} />
    )}
    </>
  )
}

function AdminView() {
  const [authed, setAuthed] = useState(() => isAdminLoggedIn())
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  const loadEntries = () => {
    setLoading(true)
    getFlavorEntries()
      .then(setEntries)
      .catch((err) => {
        if (err.message === 'UNAUTHORIZED') {
          adminLogout()
          setAuthed(false)
        }
        console.error(err)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (authed) loadEntries()
  }, [authed])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginErr('')
    setLoggingIn(true)
    try {
      await adminLogin(password)
      setAuthed(true)
      setPassword('')
    } catch {
      setLoginErr('Yanlış şifre')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = () => {
    adminLogout()
    setAuthed(false)
    setEntries([])
  }

  const remove = async (entry) => {
    try {
      await deleteFlavorEntry(entry)
      setEntries((prev) => prev.filter((e) => e !== entry))
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') {
        adminLogout()
        setAuthed(false)
      }
      console.error(err)
    }
  }

  if (!authed) {
    return (
      <main className="admin admin--login">
        <form className="admin-login" onSubmit={handleLogin}>
          <img src="/popsicle.png" alt="" className="admin-login__pop" aria-hidden="true" />
          <h1 className="admin-login__title">Admin Girişi</h1>
          <p className="admin-login__hint">Bu sayfa yalnızca organizatörler içindir.</p>
          <input
            type="password"
            className="admin-login__input"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {loginErr && <p className="admin-login__err">{loginErr}</p>}
          <button type="submit" className="admin-login__btn" disabled={loggingIn}>
            {loggingIn ? 'Giriş…' : 'Gir'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="admin">
      <header className="admin__head">
        <h1>Katılımlar — CHOOSING THE FLAVORS</h1>
        <div className="admin__head-right">
          <span className="admin__count">
            {loading ? 'Yükleniyor…' : `${entries.length} gönderi`}
          </span>
          <button type="button" className="admin__logout" onClick={handleLogout}>
            Çıkış
          </button>
        </div>
      </header>

      {!loading && entries.length === 0 ? (
        <p className="admin__empty">Henüz gönderi yok.</p>
      ) : (
        <div className="admin__grid">
          {entries.map((e, i) => {
            const imageUrl = resolveUploadUrl(e.image)
            return (
            <div key={e.id || e.ts || i} className="admin__card">
              <img src={imageUrl} alt={`${e.name} gönderisi`} />
              <div className="admin__meta">
                <strong>{e.name}</strong>
                <span>{new Date(e.ts).toLocaleString('tr-TR')}</span>
              </div>
              <div className="admin__row">
                <a
                  className="admin__link"
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={`${e.name}-flavors.jpg`}
                >
                  Aç / İndir
                </a>
                <button
                  type="button"
                  className="admin__del"
                  onClick={() => remove(e)}
                >
                  Sil
                </button>
              </div>
            </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

export default App
