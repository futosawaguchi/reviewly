import { Router, Response } from 'express'
import { Category } from '@prisma/client'
import prisma from '../prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// スポット一覧取得
router.get('/', async (req, res) => {
  try {
    const { category, prefecture, page = '1', limit = '10' } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    // 絞り込み条件を動的に作成
    const where: {
      category?: Category
      prefecture?: string
    } = {}
    if (category) where.category = category as Category
    if (prefecture) where.prefecture = prefecture as string

    const [spots, total] = await Promise.all([
      prisma.spot.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          reviews: { select: { rating: true } },
        },
      }),
      prisma.spot.count({ where }),
    ])

    // 平均評価を計算
    const spotsWithAvgRating = spots.map((spot) => {
    const reviews = spot.reviews ?? []
    return {
        ...spot,
        avgRating:
        reviews.length > 0
            ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
            : null,
        reviewCount: reviews.length,
    }
    })

    res.json({
      spots: spotsWithAvgRating,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// スポット詳細取得
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const spot = await prisma.spot.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, name: true } },
        reviews: {
          include: {
            user: { select: { id: true, name: true } },
            likes: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!spot) {
      res.status(404).json({ message: 'スポットが見つかりませんでした' })
      return
    }

    const avgRating =
      spot.reviews.length > 0
        ? spot.reviews.reduce((acc, r) => acc + r.rating, 0) /
          spot.reviews.length
        : null

    res.json({ ...spot, avgRating })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// スポット作成（要認証）
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, prefecture, description } = req.body

    if (!name || !category || !prefecture || !description) {
      res.status(400).json({ message: '全ての項目を入力してください' })
      return
    }

    const spot = await prisma.spot.create({
      data: {
        name,
        category,
        prefecture,
        description,
        userId: req.user!.userId,
      },
    })

    res.status(201).json({ message: 'スポットを作成しました', spot })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// スポット更新（要認証・本人のみ）
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, category, prefecture, description } = req.body

    const spot = await prisma.spot.findUnique({
      where: { id: parseInt(id) },
    })

    if (!spot) {
      res.status(404).json({ message: 'スポットが見つかりませんでした' })
      return
    }

    // 本人チェック
    if (spot.userId !== req.user!.userId) {
      res.status(403).json({ message: '権限がありません' })
      return
    }

    const updatedSpot = await prisma.spot.update({
      where: { id: parseInt(id) },
      data: { name, category, prefecture, description },
    })

    res.json({ message: 'スポットを更新しました', spot: updatedSpot })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// スポット削除（要認証・本人のみ）
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const spot = await prisma.spot.findUnique({
      where: { id: parseInt(id) },
    })

    if (!spot) {
      res.status(404).json({ message: 'スポットが見つかりませんでした' })
      return
    }

    // 本人チェック
    if (spot.userId !== req.user!.userId) {
      res.status(403).json({ message: '権限がありません' })
      return
    }

    await prisma.spot.delete({ where: { id: parseInt(id) } })

    res.json({ message: 'スポットを削除しました' })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

export default router