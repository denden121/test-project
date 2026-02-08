const STORAGE_KEY = 'wishlist_creator_secrets'

export type StoredWishlist = {
  creator_secret: string
  slug: string
  title: string
  occasion?: string | null
  event_date?: string | null
}

export function getStoredWishlists(): StoredWishlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addStoredWishlist(w: StoredWishlist): void {
  const list = getStoredWishlists()
  if (list.some((x) => x.creator_secret === w.creator_secret)) return
  list.unshift(w)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function removeStoredWishlist(creatorSecret: string): void {
  const list = getStoredWishlists().filter((x) => x.creator_secret !== creatorSecret)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function updateStoredWishlistTitle(creatorSecret: string, title: string): void {
  const list = getStoredWishlists().map((x) =>
    x.creator_secret === creatorSecret ? { ...x, title } : x
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
