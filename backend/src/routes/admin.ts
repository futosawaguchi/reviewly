import { Router, Response } from 'express'
import prisma from '../prisma'
import { authenticate, authorizeAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// 全ルートに認証・管理者権限チェックを適用
router.use(authenticate, authorizeAdmin)

// ダッシュボード用統計データ
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [userCount, spotCount, reviewCount] = await Promise.all([
      prisma.user.count(),
      prisma.spot.count(),
      prisma.review.count(),
    ])

    // 平均評価
    const reviews = await prisma.review.findMany({
      select: { rating: true }
    })
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : 0

    res.json({
      userCount,
      spotCount,
      reviewCount,
      avgRating: Math.round(avgRating * 10) / 10,
    })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// カテゴリ別スポット数
router.get('/stats/category', async (req: AuthRequest, res: Response) => {
  try {
    const categoryStats = await prisma.spot.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    })

    const result = categoryStats.map((stat) => ({
      category: stat.category,
      count: stat._count.category,
    }))

    res.json({ stats: result })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// 都道府県別スポット数
router.get('/stats/prefecture', async (req: AuthRequest, res: Response) => {
  try {
    const prefectureStats = await prisma.spot.groupBy({
      by: ['prefecture'],
      _count: { prefecture: true },
      orderBy: { _count: { prefecture: 'desc' } },
      take: 10,
    })

    const result = prefectureStats.map((stat) => ({
      prefecture: stat.prefecture,
      count: stat._count.prefecture,
    }))

    res.json({ stats: result })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// 月ごとのレビュー投稿数
router.get('/stats/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // 月ごとに集計
    const monthlyMap: Record<string, number> = {}
    reviews.forEach((review) => {
      const year = review.createdAt.getFullYear()
      const month = review.createdAt.getMonth() + 1
      const key = `${year}/${String(month).padStart(2, '0')}`
      monthlyMap[key] = (monthlyMap[key] || 0) + 1
    })

    const result = Object.entries(monthlyMap).map(([month, count]) => ({
      month,
      count,
    }))

    res.json({ stats: result })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// ユーザー一覧
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            spots: true,
            reviews: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ users })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// 不適切なレビューの削除
router.delete('/reviews/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) }
    })

    if (!review) {
      res.status(404).json({ message: 'レビューが見つかりませんでした' })
      return
    }

    await prisma.like.deleteMany({
      where: { reviewId: parseInt(id) }
    })

    await prisma.review.delete({
      where: { id: parseInt(id) }
    })

    res.json({ message: 'レビューを削除しました' })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// レビューデータのCSVエクスポート
router.get('/export/reviews', async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: { select: { name: true, email: true } },
        spot: { select: { name: true, category: true, prefecture: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // CSVのヘッダー
    const csvHeader = 'ID,スポット名,カテゴリ,都道府県,評価,コメント,投稿者名,投稿者メール,投稿日\n'

    // CSVの各行
    const csvRows = reviews.map((review) => {
      const date = review.createdAt.toLocaleDateString('ja-JP')
      // コメントにカンマや改行が含まれる場合はダブルクォートで囲む
      const comment = `"${review.comment.replace(/"/g, '""')}"`
      return `${review.id},${review.spot.name},${review.spot.category},${review.spot.prefecture},${review.rating},${comment},${review.user.name},${review.user.email},${date}`
    }).join('\n')

    const csv = csvHeader + csvRows

    // CSVファイルとしてレスポンスを返す
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=reviews.csv')
    // BOMを付けてExcelで文字化けしないようにする
    res.send('\uFEFF' + csv)
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

export default router