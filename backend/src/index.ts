import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRouter from './routes/auth'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ルーティング
app.use('/api/auth', authRouter)

app.get('/', (req, res) => {
  res.json({ message: 'Reviewly API is running!' })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})