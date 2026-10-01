/**
 * Shared helpers for the Ewizzy Food & Restaurants experience.
 *
 * Food items always have a numeric price (restaurant_menu_items.price is NOT NULL),
 * so there is no "Price unavailable" state anywhere in this flow.
 */

/**
 * Format a naira amount for display.
 * Examples: 5000 -> "₦5,000" | 7500 -> "₦7,500" | 12000 -> "₦12,000"
 */
export function formatNaira(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return '₦0'
  return `₦${Math.round(value).toLocaleString('en-NG')}`
}

// ============================================================
// Customer-facing food categories
// ============================================================

export const FOOD_CATEGORIES = [
  { id: 'all', name: 'All', icon: '🍽️' },
  { id: 'nigerian-food', name: 'Nigerian Food', icon: '🇳🇬' },
  { id: 'jollof-rice', name: 'Jollof Rice', icon: '🍚' },
  { id: 'fried-rice', name: 'Fried Rice', icon: '🍛' },
  { id: 'swallow', name: 'Swallow', icon: '🍲' },
  { id: 'soups-stews', name: 'Soups & Stews', icon: '🥘' },
  { id: 'suya-grills', name: 'Suya & Grills', icon: '🥩' },
  { id: 'chicken', name: 'Chicken', icon: '🍗' },
  { id: 'fish-seafood', name: 'Fish & Seafood', icon: '🐟' },
  { id: 'shawarma', name: 'Shawarma', icon: '🌯' },
  { id: 'pizza', name: 'Pizza', icon: '🍕' },
  { id: 'burgers', name: 'Burgers', icon: '🍔' },
  { id: 'fast-food', name: 'Fast Food', icon: '🍟' },
  { id: 'small-chops', name: 'Small Chops', icon: '🥟' },
  { id: 'pastries', name: 'Pastries', icon: '🥐' },
  { id: 'cakes', name: 'Cakes', icon: '🎂' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
  { id: 'drinks', name: 'Drinks', icon: '🥤' },
  { id: 'breakfast', name: 'Breakfast', icon: '🍳' },
  { id: 'healthy-meals', name: 'Healthy Meals', icon: '🥗' },
]

/**
 * Map a free-text menu category name from the database onto one of the
 * customer-facing category ids. Restaurants create their own category
 * rows, so the names will not always match exactly.
 */
const CATEGORY_ALIASES = {
  nigerian: 'nigerian-food',
  'nigerian dishes': 'nigerian-food',
  local: 'nigerian-food',
  traditional: 'nigerian-food',
  jollof: 'jollof-rice',
  'jollof rice': 'jollof-rice',
  'jollof spaghetti': 'jollof-rice',
  'fried rice': 'fried-rice',
  swallows: 'swallow',
  'swallow & swallow': 'swallow',
  'swallow and swallow': 'swallow',
  soup: 'soups-stews',
  soups: 'soups-stews',
  stew: 'soups-stews',
  stews: 'soups-stews',
  'soups and stews': 'soups-stews',
  'soups & stew': 'soups-stews',
  suya: 'suya-grills',
  grill: 'suya-grills',
  grills: 'suya-grills',
  'suya and grills': 'suya-grills',
  'suya & grill': 'suya-grills',
  'grilled chicken': 'chicken',
  'chicken & chips': 'chicken',
  seafood: 'fish-seafood',
  fish: 'fish-seafood',
  'fish and seafood': 'fish-seafood',
  'fish & sea foods': 'fish-seafood',
  burger: 'burgers',
  'fast food': 'fast-food',
  fastfood: 'fast-food',
  'small chops': 'small-chops',
  'smallchops': 'small-chops',
  snacks: 'small-chops',
  pastry: 'pastries',
  pastries: 'pastries',
  cake: 'cakes',
  cakes: 'cakes',
  dessert: 'desserts',
  desserts: 'desserts',
  drink: 'drinks',
  drinks: 'drinks',
  beverages: 'drinks',
  breakfast: 'breakfast',
  brunch: 'breakfast',
  healthy: 'healthy-meals',
  'healthy meals': 'healthy-meals',
  'healthy eating': 'healthy-meals',
  mains: 'main',
  main: 'main',
  'main dishes': 'main',
  sides: 'main',
  extras: 'main',
  starters: 'main',
  menu: 'main',
}

const CATEGORY_IDS = new Set(FOOD_CATEGORIES.map((c) => c.id))

/** Normalise a category label for lookup: "Soups & Stews" -> "soups-stews". */
export function slugifyCategory(label) {
  return String(label ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Human label for a category id, falling back to the raw value. */
export function categoryLabel(categoryId) {
  const found = FOOD_CATEGORIES.find((c) => c.id === categoryId)
  if (found) return found.name
  return String(categoryId ?? 'Menu')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Resolve a database menu-category name to a customer-facing category id.
 * Exact alias wins, then an exact slug match, then a substring match,
 * then a safe fallback to "main" so items are never hidden.
 */
export function resolveCategoryId(name) {
  const raw = String(name ?? '').trim()
  if (!raw) return 'main'

  const lower = raw.toLowerCase()
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower]

  const slug = slugifyCategory(raw)
  if (CATEGORY_IDS.has(slug)) return slug
  if (CATEGORY_ALIASES[slug]) return CATEGORY_ALIASES[slug]

  const words = lower.split(/[^a-z0-9]+/).filter(Boolean)
  for (const word of words) {
    if (CATEGORY_ALIASES[word]) return CATEGORY_ALIASES[word]
  }

  for (const category of FOOD_CATEGORIES) {
    if (category.id === 'all') continue
    if (lower.includes(category.name.toLowerCase())) return category.id
    if (slug.includes(category.id)) return category.id
  }

  return 'main'
}

// ============================================================
// Food order status model
//
// food_orders.status is constrained to these eight values.
// The sequence below is the display order only; it introduces no
// new states and does not change what the database can store.
// ============================================================

export const FOOD_ORDER_STATUS_SEQUENCE = [
  { status: 'pending', label: 'Order placed', short: 'Order placed' },
  { status: 'confirmed', label: 'Restaurant confirming', short: 'Confirming' },
  { status: 'preparing', label: 'Preparing', short: 'Preparing' },
  { status: 'ready_for_pickup', label: 'Rider assigned', short: 'Rider assigned' },
  { status: 'picked_up', label: 'Picked up', short: 'Picked up' },
  { status: 'out_for_delivery', label: 'On the way', short: 'On the way' },
  { status: 'delivered', label: 'Delivered', short: 'Delivered' },
]

const STATUS_LABELS = {
  ...Object.fromEntries(FOOD_ORDER_STATUS_SEQUENCE.map((s) => [s.status, s.label])),
  cancelled: 'Order cancelled',
}

/** Display label for a stored status value. */
export function foodStatusLabel(status) {
  const key = String(status ?? '').toLowerCase()
  return STATUS_LABELS[key] || STATUS_LABELS[key.replace(/_/g, '-')] || 'Order placed'
}

/**
 * A customer may only cancel while the order is still 'pending'.
 * This mirrors the existing RLS policy "Customers can update their own
 * pending orders" (food_orders), which restricts customer updates to
 * status = 'pending'. Once the restaurant confirms, the database
 * refuses the update.
 */
export function isFoodOrderCancellable(status) {
  return String(status ?? '').toLowerCase() === 'pending'
}

/**
 * Backwards-compatible derived order reference, used only as a fallback
 * for rows created before food_orders.order_number existed:
 * id 24 -> "#EZ-1024". No data is invented.
 */
export function derivedFoodOrderReference(orderId) {
  const id = Number(orderId)
  if (!Number.isFinite(id)) return '#EZ-'
  return `#EZ-${1000 + id}`
}

/**
 * Order reference for display.
 *
 * Prefers the persistent food_orders.order_number value generated by the
 * database (e.g. "EZ-001024"). Falls back to the derived reference for
 * any order that predates the column, so existing rows keep rendering.
 */
export function foodOrderReference(order) {
  const persistent = order && typeof order === 'object' ? order.order_number : null

  if (typeof persistent === 'string' && persistent.trim() !== '') {
    return persistent.trim()
  }

  const orderId = order && typeof order === 'object' ? order.id : order
  return derivedFoodOrderReference(orderId)
}

// ============================================================
// Restaurant-side view of the same statuses
//
// A restaurant drives the order up to 'ready_for_pickup' and then
// stops: pickup and delivery belong to the rider, which keeps the
// existing rider flow working and avoids a 'picked_up' order that
// has no rider assigned.
// ============================================================

export const RESTAURANT_STATUS_LABELS = {
  pending: 'New order',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Awaiting rider',
  picked_up: 'Picked up',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const RESTAURANT_NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready_for_pickup',
}

export const RESTAURANT_ACTION_LABELS = {
  confirmed: 'Accept Order',
  preparing: 'Start Preparing',
  ready_for_pickup: 'Mark Ready for Pickup',
}

export function restaurantStatusLabel(status) {
  const key = String(status ?? '').toLowerCase()
  return RESTAURANT_STATUS_LABELS[key] || key || 'New order'
}

export function restaurantNextStatus(status) {
  return RESTAURANT_NEXT_STATUS[String(status ?? '').toLowerCase()] || null
}

export function restaurantActionLabel(status) {
  return RESTAURANT_ACTION_LABELS[String(status ?? '').toLowerCase()] || null
}

// ============================================================
// Cart maths
// ============================================================

export function cartSubtotal(cart) {
  return (cart || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
}

export function cartItemCount(cart) {
  return (cart || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}

export function cartTotals(cart, deliveryFee = 0) {
  const subtotal = cartSubtotal(cart)
  const fee = Number(deliveryFee || 0)
  return { subtotal, deliveryFee: fee, total: subtotal + fee }
}

export function formatOrderDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatOrderDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
