import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { MongoClient, ObjectId } from 'mongodb'

const PORT = Number(process.env.PORT) || 3001
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/no-labels-part2'
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'nolabels-admin').trim()
const CORS_ORIGIN = process.env.CORS_ORIGIN?.trim()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Sadece görsel yüklenebilir'))
  },
})

const corsOptions = CORS_ORIGIN
  ? {
      origin: CORS_ORIGIN.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Admin-Key'],
    }
  : undefined

const app = express()
app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))

function requireAdmin(req, res, next) {
  const key = String(req.headers['x-admin-key'] || '').trim()
  if (key && key === ADMIN_PASSWORD) return next()
  res.status(401).json({ error: 'Yetkisiz' })
}

function entryImage(row) {
  if (row.imageData) return `data:image/jpeg;base64,${row.imageData}`
  return row.imagePath || ''
}

function entryJson(row) {
  return {
    id: row._id.toString(),
    name: row.name,
    event: row.event,
    ts: row.ts,
    image: entryImage(row),
  }
}

let db

async function start() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  db = client.db()
  console.log('MongoDB bağlandı')

  app.get('/api/health', async (_req, res) => {
    try {
      await db.command({ ping: 1 })
      res.json({ ok: true })
    } catch {
      res.status(503).json({ ok: false })
    }
  })

  app.post('/api/admin/login', (req, res) => {
    const password = String(req.body?.password || '').trim()
    if (password && password === ADMIN_PASSWORD) return res.json({ ok: true })
    res.status(401).json({ error: 'Yanlış şifre' })
  })

  app.post('/api/flavors', upload.single('image'), async (req, res) => {
    try {
      const name = (req.body.name || '').trim()
      if (!name) return res.status(400).json({ error: 'İsim gerekli' })
      if (!req.file) return res.status(400).json({ error: 'Görsel gerekli' })

      const doc = {
        name,
        event: 'CHOOSING THE FLAVORS',
        imageData: req.file.buffer.toString('base64'),
        ts: Date.now(),
      }
      const result = await db.collection('flavors_entries').insertOne(doc)
      res.json(entryJson({ _id: result.insertedId, ...doc }))
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Kaydedilemedi' })
    }
  })

  app.get('/api/flavors', requireAdmin, async (_req, res) => {
    try {
      const rows = await db
        .collection('flavors_entries')
        .find({})
        .sort({ ts: -1 })
        .toArray()
      res.json(rows.map(entryJson))
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Liste alınamadı' })
    }
  })

  app.delete('/api/flavors/:id', requireAdmin, async (req, res) => {
    try {
      const id = req.params.id
      if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Geçersiz id' })

      const result = await db
        .collection('flavors_entries')
        .deleteOne({ _id: new ObjectId(id) })
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Bulunamadı' })

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
