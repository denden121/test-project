const raw = import.meta.env.VITE_API_URL ?? ''
export const API_URL =
  raw.startsWith('http')
    ? `${raw.replace(/\/?$/, '').replace(/\/api\/?$/, '')}/api`
    : raw || '/api'

export type WishlistItemResponse = {
  id: number
  wishlist_id: number
  title: string
  link: string | null
  price: number | string | null
  min_contribution: number | string | null
  image_url: string | null
  sort_order: number
  is_reserved: boolean
  total_contributed: number | string
  created_at: string
}

export type ContributionCreatedResponse = {
  contributor_secret: string
  message: string
}

export type ContributionResponse = {
  id: number
  wishlist_item_id: number
  contributor_name: string
  amount: number | string
  contributed_at: string
  item_title: string | null
}

export type WishlistManageResponse = {
  id: number
  title: string
  occasion: string | null
  event_date: string | null
  currency: string
  slug: string
  creator_secret: string
  created_at: string
}

export type WishlistManageDetailResponse = WishlistManageResponse & {
  items: WishlistItemResponse[]
}

export type WishlistPublicResponse = {
  id: number
  title: string
  occasion: string | null
  event_date: string | null
  currency: string
  slug: string
  items: WishlistItemResponse[]
}

export type ReservationCreatedResponse = {
  reserver_secret: string
  message: string
}

export type ReservationResponse = {
  id: number
  wishlist_item_id: number
  reserver_name: string
  reserved_at: string
  item_title: string | null
}
