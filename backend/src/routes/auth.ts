import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../prisma'

const router = Router()

// ユーザー登録
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body

    // 入力チェック
    if (!name || !email || !password) {
      res.status(400).json({ message: '全ての項目を入力してください' })
      return
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    if (existingUser) {
      res.status(400).json({ message: 'このメールアドレスは既に使用されています' })
      return
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10)

    // ユーザーを作成
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    })

    // JWTトークンを生成
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'ユーザー登録が完了しました',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// ログイン
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // 入力チェック
    if (!email || !password) {
      res.status(400).json({ message: '全ての項目を入力してください' })
      return
    }

    // ユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email }
    })
    if (!user) {
      res.status(401).json({ message: 'メールアドレスまたはパスワードが間違っています' })
      return
    }

    // パスワードを照合
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      res.status(401).json({ message: 'メールアドレスまたはパスワードが間違っています' })
      return
    }

    // JWTトークンを生成
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'ログインしました',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

export default router