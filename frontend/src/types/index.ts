export interface User {
  id: number
  name: string
  email: string
  role: 'USER' | 'ADMIN'
}

export interface Spot {
  id: number
  name: string
  category: Category
  prefecture: string
  description: string
  image: string | null
  createdAt: string
  userId: number
  user: { id: number; name: string }
  reviews: Review[]
  avgRating: number | null
  reviewCount: number
}

export interface Review {
  id: number
  rating: number
  comment: string
  image: string | null
  createdAt: string
  userId: number
  user: { id: number; name: string }
  likes: Like[]
  spotId: number
}

export interface Like {
  id: number
  userId: number
  reviewId: number
}

export interface Favorite {
  id: number
  userId: number
  spotId: number
  spot: Spot
}

export type Category =
  | 'RESTAURANT'
  | 'TOURISM'
  | 'HOTEL'
  | 'PRODUCT'
  | 'OTHER'

export const CategoryLabels: Record<Category, string> = {
  RESTAURANT: '飲食店',
  TOURISM: '観光スポット',
  HOTEL: 'ホテル・宿泊施設',
  PRODUCT: '商品',
  OTHER: 'その他',
}

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県',
  '山形県', '福島県', '茨城県', '栃木県', '群馬県',
  '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県',
  '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県',
  '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県',
  '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県',
  '鹿児島県', '沖縄県',
]