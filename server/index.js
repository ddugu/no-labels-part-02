import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { MongoClient, ObjectId } from 'mongodb'
import { mkdirSync, existsSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS = join(__dirname, 'uploads', 'flavors')
mkdirSync(UPLOADS, { recursive: true })

const PORT = Number(process.env.PORT) || 3001
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/no-labels-part2'
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'nolabels-admin').trim()
const CORS_ORIGIN = process.env.CORS_ORIGIN?.trim()

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_req, file, cb) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      cb(null, `${id}.jpg`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Sadece görsel yüklenebilir'))
  },
})

const app = express()
app.use(
  cors(
    CORS_ORIGIN
      ? { origin: CORS_ORIGIN.split(',').map((o) => o.trim()), credentials: true }
      : undefined,
  ),
)
app.use(express.json())
app.use('/uploads', express.static(join(__dirname, 'uploads')))

function requireAdmin(req, res, next) {
  const key = String(req.headers['x-admin-key'] || '').trim()
  if (key && key === ADMIN_PASSWORD) return next()
  res.status(401).json({ error: 'Yetkisiz' })
}

let db

async function start() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  db = client.db()
  console.log('MongoDB bağlandı:', MONGODB_URI)

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  // admin giriş doğrulama
  app.post('/api/admin/login', (req, res) => {
    const password = String(req.body?.password || '').trim()
    if (password && password === ADMIN_PASSWORD) return res.json({ ok: true })
    res.status(401).json({ error: 'Yanlış şifre' })
  })

  // yeni katılım (herkese açık)
  app.post('/api/flavors', upload.single('image'), async (req, res) => {
    try {
      const name = (req.body.name || '').trim()
      if (!name) return res.status(400).json({ error: 'İsim gerekli' })
      if (!req.file) return res.status(400).json({ error: 'Görsel gerekli' })

      const doc = {
        name,
        event: 'CHOOSING THE FLAVORS',
        imagePath: `/uploads/flavors/${req.file.filename}`,
        ts: Date.now(),
      }
      const result = await db.collection('flavors_entries').insertOne(doc)
      res.json({ id: result.insertedId.toString(), ...doc })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Kaydedilemedi' })
    }
  })

  // admin listesi (şifre gerekli)
  app.get('/api/flavors', requireAdmin, async (_req, res) => {
    try {
      const rows = await db
        .collection('flavors_entries')
        .find({})
        .sort({ ts: -1 })
        .toArray()
      res.json(
        rows.map((r) => ({
          id: r._id.toString(),
          name: r.name,
          event: r.event,
          ts: r.ts,
          image: r.imagePath,
        })),
      )
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Liste alınamadı' })
    }
  })

  // sil (şifre gerekli)
  app.delete('/api/flavors/:id', requireAdmin, async (req, res) => {
    try {
      const id = req.params.id
      if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Geçersiz id' })

      const row = await db
        .collection('flavors_entries')
        .findOne({ _id: new ObjectId(id) })
      if (!row) return res.status(404).json({ error: 'Bulunamadı' })

      await db.collection('flavors_entries').deleteOne({ _id: new ObjectId(id) })

      if (row.imagePath) {
        const file = join(__dirname, row.imagePath.replace(/^\//, ''))
        if (existsSync(file)) unlinkSync(file)
      }
      res.json({ ok: true })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Silinemedi' })
    }
  })

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API http://0.0.0.0:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Sunucu başlatılamadı:', err.message)
  process.exit(1)
})
