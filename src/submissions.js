import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore/lite'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { firebaseEnabled, db, auth } from './firebase'

const COL = 'flavors_entries'
const LS_KEY = 'nl_flavors_entries'
const LOCAL_ADMIN = 'nl_admin_local'
const EVENT = 'CHOOSING THE FLAVORS'

const localAdminPassword = () =>
  (import.meta.env.VITE_ADMIN_PASSWORD || 'nolabels-admin').trim()

function canvasToUploadDataUrl(canvas) {
  const maxLen = 380_000
  let quality = 0.68
  let dataUrl = canvas.toDataURL('image/jpeg', quality)

  while (dataUrl.length > maxLen && quality > 0.45) {
    quality -= 0.07
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }

  if (dataUrl.length <= maxLen) return dataUrl

  const scale = 0.72
  const tmp = document.createElement('canvas')
  tmp.width = Math.round(canvas.width * scale)
  tmp.height = Math.round(canvas.height * scale)
  tmp.getContext('2d').drawImage(canvas, 0, 0, tmp.width, tmp.height)
  return tmp.toDataURL('image/jpeg', 0.65)
}

function firebaseErrorMessage(err) {
  const code = err?.code || ''
  if (code === 'permission-denied') {
    return 'Firestore izni yok. Firebase Console → Firestore → Rules → Publish (firestore.rules dosyasındaki kurallar).'
  }
  if (code === 'unavailable' || code === 'not-found') {
    return 'Firestore bulunamadı. Firebase Console’da veritabanını oluştur.'
  }
  if (code === 'invalid-argument' || code === 'resource-exhausted') {
    return 'Görsel çok büyük. Daha küçük bir fotoğrafla tekrar dene.'
  }
  return err?.message || 'Firebase hatası'
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}

const TIMEOUT_MSG =
  'Bağlantı zaman aşımı. Sayfayı yenile; hâlâ olmazsa farklı tarayıcı veya mobil veri dene.'

export async function checkFirestoreConnection() {
  if (!firebaseEnabled || !db) {
    return { ok: false, reason: 'Canlı sitede Firebase ayarları eksik — GitHub Variables + Deploy gerekli.' }
  }
  try {
    await withTimeout(
      getDocs(query(collection(db, COL), limit(1))),
      8_000,
      TIMEOUT_MSG,
    )
    return { ok: true }
  } catch (err) {
    if (err?.code === 'permission-denied') return { ok: true }
    return { ok: false, reason: err?.message || 'Bağlantı hatası' }
  }
}

export function watchAdminAuth(callback) {
  if (firebaseEnabled && auth) {
    return onAuthStateChanged(auth, (user) => callback(Boolean(user)))
  }
  callback(sessionStorage.getItem(LOCAL_ADMIN) === '1')
  return () => {}
}

export function isAdminLoggedIn() {
  if (firebaseEnabled && auth) return Boolean(auth.currentUser)
  return sessionStorage.getItem(LOCAL_ADMIN) === '1'
}

export async function adminLogin(email, password) {
  const pass = String(password || '').trim()
  if (firebaseEnabled && auth) {
    const mail = String(email || '').trim()
    if (!mail) throw new Error('E-posta gerekli')
    await signInWithEmailAndPassword(auth, mail, pass)
    return
  }
  if (pass !== localAdminPassword()) throw new Error('Yanlış şifre')
  sessionStorage.setItem(LOCAL_ADMIN, '1')
}

export async function adminLogout() {
  if (firebaseEnabled && auth && auth.currentUser) {
    await signOut(auth)
    return
  }
  sessionStorage.removeItem(LOCAL_ADMIN)
}

export async function addFlavorEntry(name, canvas) {
  const image = canvasToUploadDataUrl(canvas)
  const entry = { name, event: EVENT, image, ts: Date.now() }

  if (firebaseEnabled && db) {
    try {
      await withTimeout(
        addDoc(collection(db, COL), entry),
        45_000,
        TIMEOUT_MSG,
      )
      return
    } catch (err) {
      if (err instanceof Error && err.message === TIMEOUT_MSG) throw err
      throw new Error(firebaseErrorMessage(err))
    }
  }

  if (import.meta.env.PROD) throw new Error('Firebase yapılandırılmamış')

  const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  list.push({ ...entry, id: `local-${Date.now()}` })
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export async function getFlavorEntries() {
  if (firebaseEnabled && db) {
    if (!auth?.currentUser) throw new Error('UNAUTHORIZED')
    const snap = await getDocs(
      query(collection(db, COL), orderBy('ts', 'desc')),
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  if (!isAdminLoggedIn()) throw new Error('UNAUTHORIZED')
  const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  return list.sort((a, b) => b.ts - a.ts)
}

export async function deleteFlavorEntry(entry) {
  if (firebaseEnabled && db && entry.id) {
    if (!auth?.currentUser) throw new Error('UNAUTHORIZED')
    await deleteDoc(doc(db, COL, entry.id))
    return
  }

  const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  const next = list.filter((e) => e.id !== entry.id && e.ts !== entry.ts)
  localStorage.setItem(LS_KEY, JSON.stringify(next))
}
