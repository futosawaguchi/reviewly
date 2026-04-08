import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Requestの型を拡張してuserを追加
export interface AuthRequest extends Request {
  user?: { userId: number; role: string }
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: '認証が必要です' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number
      role: string
    }
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ message: 'トークンが無効です' })
  }
}

export const authorizeAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ message: '管理者権限が必要です' })
    return
  }
  next()
}