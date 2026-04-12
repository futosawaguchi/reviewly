import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRouter from './routes/auth'
import spotsRouter from './routes/spots'
import reviewsRouter from './routes/reviews'
import favoritesRouter from './routes/favorites'
import adminRouter from './routes/admin'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ルーティング
app.use('/api/auth', authRouter)
app.use('/api/spots', spotsRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/favorites', favoritesRouter)
app.use('/api/admin', adminRouter)

app.get('/', (req, res) => {
  res.json({ message: 'Reviewly API is running!' })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})