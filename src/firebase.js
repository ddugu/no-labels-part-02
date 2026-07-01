// Firebase yapılandırması — anahtarlar .env dosyasından okunur.
// .env yoksa/boşsa firebaseEnabled = false olur ve uygulama
// otomatik olarak yerel (localStorage) moda düşer.
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(cfg.apiKey && cfg.projectId)

let db = null
let storage = null

if (firebaseEnabled) {
  const app = initializeApp(cfg)
  db = getFirestore(app)
  storage = getStorage(app)
}

export { db, storage }
