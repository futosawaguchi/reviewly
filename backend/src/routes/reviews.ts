import { Router, Response } from 'express'
import prisma from '../prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// レビュー作成（要認証）
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { spotId, rating, comment } = req.body

    if (!spotId || !rating || !comment) {
      res.status(400).json({ message: '全ての項目を入力してください' })
      return
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ message: '評価は1〜5で入力してください' })
      return
    }

    // スポットの存在確認
    const spot = await prisma.spot.findUnique({
      where: { id: parseInt(spotId) }
    })
    if (!spot) {
      res.status(404).json({ message: 'スポットが見つかりませんでした' })
      return
    }

    // 同じユーザーが同じスポットに2回レビューしていないか確認
    const existingReview = await prisma.review.findFirst({
      where: {
        spotId: parseInt(spotId),
        userId: req.user!.userId,
      }
    })
    if (existingReview) {
      res.status(400).json({ message: 'このスポットにはすでにレビューを投稿しています' })
      return
    }

    const review = await prisma.review.create({
      data: {
        spotId: parseInt(spotId),
        rating: parseInt(rating),
        comment,
        userId: req.user!.userId,
      },
      include: {
        user: { select: { id: true, name: true } },
      }
    })

    res.status(201).json({ message: 'レビューを投稿しました', review })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// レビュー更新（要認証・本人のみ）
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { rating, comment } = req.body

    if (rating && (rating < 1 || rating > 5)) {
      res.status(400).json({ message: '評価は1〜5で入力してください' })
      return
    }

    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) }
    })

    if (!review) {
      res.status(404).json({ message: 'レビューが見つかりませんでした' })
      return
    }

    // 本人チェック
    if (review.userId !== req.user!.userId) {
      res.status(403).json({ message: '権限がありません' })
      return
    }

    const updatedReview = await prisma.review.update({
      where: { id: parseInt(id) },
      data: {
        ...(rating && { rating: parseInt(rating) }),
        ...(comment && { comment }),
      },
      include: {
        user: { select: { id: true, name: true } },
      }
    })

    res.json({ message: 'レビューを更新しました', review: updatedReview })
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// レビュー削除（要認証・本人のみ）
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) }
    })

    if (!review) {
      res.status(404).json({ message: 'レビューが見つかりませんでした' })
      return
    }

    // 本人チェック
    if (review.userId !== req.user!.userId) {
      res.status(403).json({ message: '権限がありません' })
      return
    }

    // レビューに紐づくいいねも削除
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

// いいねの切り替え（要認証）
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) }
    })

    if (!review) {
      res.status(404).json({ message: 'レビューが見つかりませんでした' })
      return
    }

    // すでにいいねしているか確認
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_reviewId: {
          userId: req.user!.userId,
          reviewId: parseInt(id),
        }
      }
    })

    if (existingLike) {
      // いいねを取り消す
      await prisma.like.delete({
        where: {
          userId_reviewId: {
            userId: req.user!.userId,
            reviewId: parseInt(id),
          }
        }
      })
      res.json({ message: 'いいねを取り消しました', liked: false })
    } else {
      // いいねする
      await prisma.like.create({
        data: {
          userId: req.user!.userId,
          reviewId: parseInt(id),
        }
      })
      res.json({ message: 'いいねしました', liked: true })
    }
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

export default router