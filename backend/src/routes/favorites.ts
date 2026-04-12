import { Router, Response } from 'express'
import prisma from '../prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// お気に入り一覧取得（要認証・自分のみ）
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.userId },
      include: {
        spot: {
          include: {
            reviews: { select: { rating: true } },
            user: { select: { id: true, name: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 平均評価を計算
    const favoritesWithAvgRating = favorites.map((fav) => ({
      ...fav,
      spot: {
        ...fav.spot,
        avgRating:
          fav.spot.reviews.length > 0
            ? fav.spot.reviews.reduce((acc, r) => acc + r.rating, 0) /
              fav.spot.reviews.length
            : null,
        reviewCount: fav.spot.reviews.length,
      }
    }))

    res.json({ favorites: favoritesWithAvgRating })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// お気に入りの切り替え（要認証）
router.post('/:spotId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { spotId } = req.params

    // スポットの存在確認
    const spot = await prisma.spot.findUnique({
      where: { id: parseInt(spotId) }
    })
    if (!spot) {
      res.status(404).json({ message: 'スポットが見つかりませんでした' })
      return
    }

    // すでにお気に入りしているか確認
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_spotId: {
          userId: req.user!.userId,
          spotId: parseInt(spotId),
        }
      }
    })

    if (existingFavorite) {
      // お気に入りを解除
      await prisma.favorite.delete({
        where: {
          userId_spotId: {
            userId: req.user!.userId,
            spotId: parseInt(spotId),
          }
        }
      })
      res.json({ message: 'お気に入りを解除しました', favorited: false })
    } else {
      // お気に入りに追加
      await prisma.favorite.create({
        data: {
          userId: req.user!.userId,
          spotId: parseInt(spotId),
        }
      })
      res.json({ message: 'お気に入りに追加しました', favorited: true })
    }
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// お気に入り状態の確認（要認証）
router.get('/:spotId/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { spotId } = req.params

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_spotId: {
          userId: req.user!.userId,
          spotId: parseInt(spotId),
        }
      }
    })

    res.json({ favorited: !!favorite })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

export default router