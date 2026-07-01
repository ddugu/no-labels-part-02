import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
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
  const image = canvas.toDataURL('image/jpeg', 0.85)
  const entry = { name, event: EVENT, image, ts: Date.now() }

  if (firebaseEnabled && db) {
    await addDoc(collection(db, COL), entry)
    return
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
