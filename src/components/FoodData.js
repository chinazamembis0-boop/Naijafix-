import { supabase } from '../supabase.js'
import { resolveCategoryId } from './foodUtils.js'

/**
 * Ewizzy Food & Restaurants data layer.
 *
 * Source of truth:
 *   restaurants                  -> restaurant list
 *   restaurant_menu_categories   -> menu grouping (joined onto menu items)
 *   restaurant_menu_items        -> food items and prices (price is NOT NULL)
 *   food_orders / food_order_items -> customer orders
 *
 * `mockRestaurants` below is the pre-existing demo catalogue. It is only
 * used when the database has no active restaurants, and every demo entry is
 * flagged with `isDemo: true` so the UI can refuse to fake an order for it.
 */

export const FALLBACK_MENU_IMAGE =
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop'

export const mockRestaurants = [
  {
    id: 'mama-cater-service',
    name: "Mama Cater's Kitchen",
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
    rating: 4.7,
    reviewCount: 234,
    cuisine: 'Nigerian Food',
    categories: ['nigerian-food', 'swallow', 'soups-stews'],
    deliveryTime: '25-40 min',
    deliveryFee: 500,
    isOpen: true,
    address: 'Ikeja, Lagos',
    description: 'Authentic Nigerian home cooking. Pounded yam, egusi, efo riro and more.',
    menu: [
      {
        id: 'egusi-soup',
        name: 'Egusi Soup',
        description: 'Rich melon seed soup with assorted meat and vegetables',
        price: 4500,
        image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=200&fit=crop',
        category: 'soups-stews',
        popular: true,
      },
      {
        id: 'jollof-rice-chicken',
        name: 'Jollof Rice & Chicken',
        description: 'Smoky party jollof rice served with grilled chicken',
        price: 7500,
        image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=200&fit=crop',
        category: 'jollof-rice',
        popular: true,
      },
      {
        id: 'pounded-yam-egusi',
        name: 'Pounded Yam & Egusi Soup',
        description: 'Smooth pounded yam served with rich egusi soup',
        price: 6500,
        image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=200&fit=crop',
        category: 'swallow',
        popular: true,
      },
      {
        id: 'efo-riro',
        name: 'Efo Riro',
        description: 'Spinach stew with assorted meat and stockfish',
        price: 5500,
        image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=200&fit=crop',
        category: 'soups-stews',
        popular: true,
      },
    ],
  },
  {
    id: 'suya-express',
    name: 'Suya Express',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    rating: 4.5,
    reviewCount: 189,
    cuisine: 'Suya & Grills',
    categories: ['suya-grills', 'nigerian-food', 'chicken'],
    deliveryTime: '20-35 min',
    deliveryFee: 400,
    isOpen: true,
    address: 'Victoria Island, Lagos',
    description: 'The best suya in town. Beef, chicken and fish suya with fresh peppers.',
    menu: [
      {
        id: 'beef-suya',
        name: 'Beef Suya (Full)',
        description: 'Spicy grilled beef with yaji spice and onions',
        price: 5000,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=200&fit=crop',
        category: 'suya-grills',
        popular: true,
      },
      {
        id: 'chicken-suya',
        name: 'Chicken Suya',
        description: 'Grilled chicken with suya spice',
        price: 5000,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=200&fit=crop',
        category: 'suya-grills',
        popular: true,
      },
      {
        id: 'grilled-fish',
        name: 'Grilled Tilapia',
        description: 'Whole grilled tilapia with pepper sauce',
        price: 7500,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=200&fit=crop',
        category: 'fish-seafood',
        popular: true,
      },
      {
        id: 'suya-salad',
        name: 'Suya Salad',
        description: 'Fresh salad topped with suya meat',
        price: 3500,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=200&fit=crop',
        category: 'healthy-meals',
        popular: false,
      },
    ],
  },
  {
    id: 'tasty-burger',
    name: 'Tasty Burger Joint',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
    rating: 4.3,
    reviewCount: 156,
    cuisine: 'Burgers & Fast Food',
    categories: ['burgers', 'fast-food', 'shawarma'],
    deliveryTime: '15-30 min',
    deliveryFee: 350,
    isOpen: true,
    address: 'Lekki, Lagos',
    description: 'Juicy burgers, crispy shawarma and fast food favorites.',
    menu: [
      {
        id: 'classic-beef-burger',
        name: 'Classic Beef Burger',
        description: 'Double beef patty with cheese, lettuce and special sauce',
        price: 3500,
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&h=200&fit=crop',
        category: 'burgers',
        popular: true,
      },
      {
        id: 'chicken-shawarma',
        name: 'Chicken Shawarma',
        description: 'Grilled chicken wrapped in flatbread with veggies and sauce',
        price: 2500,
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&h=200&fit=crop',
        category: 'shawarma',
        popular: true,
      },
      {
        id: 'loaded-fries',
        name: 'Loaded Fries',
        description: 'Crispy fries with cheese, bacon and special sauce',
        price: 2800,
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&h=200&fit=crop',
        category: 'fast-food',
        popular: true,
      },
      {
        id: 'pepperoni-pizza',
        name: 'Pepperoni Pizza',
        description: 'Classic pepperoni pizza with mozzarella cheese',
        price: 5000,
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&h=200&fit=crop',
        category: 'pizza',
        popular: false,
      },
    ],
  },
  {
    id: 'ofada-boy',
    name: 'Ofada Boy Restaurant',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    rating: 4.6,
    reviewCount: 201,
    cuisine: 'Local Nigerian',
    categories: ['nigerian-food', 'jollof-rice', 'swallow'],
    deliveryTime: '30-45 min',
    deliveryFee: 450,
    isOpen: true,
    address: 'Yaba, Lagos',
    description: 'Premium ofada rice, local delicacies and traditional Nigerian dishes.',
    menu: [
      {
        id: 'ofada-rice-stew',
        name: 'Ofada Rice & Stew',
        description: 'Local ofada rice with assorted meat stew',
        price: 3000,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop',
        category: 'nigerian-food',
        popular: true,
      },
      {
        id: 'amala-ewedu',
        name: 'Amala & Ewedu',
        description: 'Yam flour with jute leaf soup and assorted meat',
        price: 2800,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop',
        category: 'swallow',
        popular: true,
      },
      {
        id: 'fried-rice-salad',
        name: 'Fried Rice & Salad',
        description: 'Nigerian fried rice with coleslaw and chicken',
        price: 3200,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop',
        category: 'fried-rice',
        popular: false,
      },
      {
        id: 'asun',
        name: 'Asun (Spicy Goat)',
        description: 'Spicy grilled goat meat with peppers',
        price: 4500,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop',
        category: 'suya-grills',
        popular: true,
      },
    ],
  },
  {
    id: 'chicken-republic',
    name: 'Chicken Republic',
    image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop',
    rating: 4.4,
    reviewCount: 312,
    cuisine: 'Chicken & Fast Food',
    categories: ['chicken', 'fast-food', 'jollof-rice'],
    deliveryTime: '20-35 min',
    deliveryFee: 400,
    isOpen: true,
    address: 'Surulere, Lagos',
    description: 'Delicious chicken meals, rice and fast food at affordable prices.',
    menu: [
      {
        id: 'crispy-chicken',
        name: 'Crispy Chicken (2pcs)',
        description: 'Crispy fried chicken pieces with seasoned coating',
        price: 3000,
        image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300&h=200&fit=crop',
        category: 'chicken',
        popular: true,
      },
      {
        id: 'chicken-meal',
        name: 'Chicken Meal Deal',
        description: 'Fried chicken, chips and drink combo',
        price: 4000,
        image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300&h=200&fit=crop',
        category: 'fast-food',
        popular: true,
      },
      {
        id: 'jollof-rice-meal',
        name: 'Jollof Rice Meal',
        description: 'Jollof rice with chicken and plantain',
        price: 3500,
        image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300&h=200&fit=crop',
        category: 'jollof-rice',
        popular: true,
      },
      {
        id: 'chicken-shawarma-wrap',
        name: 'Chicken Shawarma Wrap',
        description: 'Shawarma wrap with fresh vegetables',
        price: 2500,
        image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300&h=200&fit=crop',
        category: 'shawarma',
        popular: false,
      },
    ],
  },
  {
    id: 'bites-and-sips',
    name: 'Bites & Sips Cafe',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
    rating: 4.2,
    reviewCount: 98,
    cuisine: 'Cafe & Pastries',
    categories: ['pastries', 'cakes', 'breakfast', 'drinks'],
    deliveryTime: '15-25 min',
    deliveryFee: 300,
    isOpen: true,
    address: 'Ikeja GRA, Lagos',
    description: 'Cozy cafe with fresh pastries, cakes, coffee and breakfast items.',
    menu: [
      {
        id: 'meat-pie',
        name: 'Meat Pie',
        description: 'Flaky pastry filled with seasoned minced beef',
        price: 800,
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300&h=200&fit=crop',
        category: 'pastries',
        popular: true,
      },
      {
        id: 'chicken-pie',
        name: 'Chicken Pie',
        description: 'Creamy chicken filling in buttery pastry',
        price: 800,
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300&h=200&fit=crop',
        category: 'pastries',
        popular: true,
      },
      {
        id: 'chocolate-cake-slice',
        name: 'Chocolate Cake (Slice)',
        description: 'Rich chocolate cake with creamy frosting',
        price: 1500,
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300&h=200&fit=crop',
        category: 'cakes',
        popular: true,
      },
      {
        id: 'pancake-stack',
        name: 'Pancake Stack',
        description: 'Fluffy pancakes with maple syrup and butter',
        price: 2000,
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300&h=200&fit=crop',
        category: 'breakfast',
        popular: false,
      },
      {
        id: 'fresh-juice',
        name: 'Fresh Juice (500ml)',
        description: 'Freshly squeezed orange or pineapple juice',
        price: 1000,
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300&h=200&fit=crop',
        category: 'drinks',
        popular: true,
      },
    ],
  },
  {
    id: 'ocean-fish',
    name: 'Ocean Fish Grill',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
    rating: 4.6,
    reviewCount: 145,
    cuisine: 'Seafood',
    categories: ['fish-seafood', 'nigerian-food', 'healthy-meals'],
    deliveryTime: '30-45 min',
    deliveryFee: 500,
    isOpen: false,
    address: 'Ajah, Lagos',
    description: 'Fresh seafood, fish pepper soup and grilled specialties.',
    menu: [
      {
        id: 'fish-pepper-soup',
        name: 'Fish Pepper Soup',
        description: 'Spicy fresh fish pepper soup',
        price: 4000,
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&h=200&fit=crop',
        category: 'fish-seafood',
        popular: true,
      },
      {
        id: 'grilled-tilapia',
        name: 'Grilled Tilapia (Full)',
        description: 'Whole grilled tilapia with plantain and fries',
        price: 6500,
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&h=200&fit=crop',
        category: 'fish-seafood',
        popular: true,
      },
      {
        id: 'prawns-stir-fry',
        name: 'Prawns Stir Fry',
        description: 'Juicy prawns stir fried with vegetables',
        price: 5500,
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&h=200&fit=crop',
        category: 'fish-seafood',
        popular: false,
      },
      {
        id: 'seafood-platter',
        name: 'Seafood Platter',
        description: 'Mixed seafood platter for sharing',
        price: 12000,
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&h=200&fit=crop',
        category: 'fish-seafood',
        popular: true,
      },
    ],
  },
  {
    id: 'small-chops-palace',
    name: 'Small Chops Palace',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop',
    rating: 4.4,
    reviewCount: 167,
    cuisine: 'Small Chops & Snacks',
    categories: ['small-chops', 'desserts', 'pastries'],
    deliveryTime: '25-40 min',
    deliveryFee: 400,
    isOpen: true,
    address: 'Maryland, Lagos',
    description: 'Party-ready small chops: spring rolls, samosa, chicken rolls and more.',
    menu: [
      {
        id: 'spring-rolls',
        name: 'Spring Rolls (10pcs)',
        description: 'Crispy spring rolls with vegetable filling',
        price: 2500,
        image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=200&fit=crop',
        category: 'small-chops',
        popular: true,
      },
      {
        id: 'samosa',
        name: 'Samosa (10pcs)',
        description: 'Spicy meat-filled samosa',
        price: 2000,
        image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=200&fit=crop',
        category: 'small-chops',
        popular: true,
      },
      {
        id: 'chicken-rolls',
        name: 'Chicken Rolls (10pcs)',
        description: 'Chicken rolls with savory filling',
        price: 3000,
        image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=200&fit=crop',
        category: 'small-chops',
        popular: false,
      },
      {
        id: 'meat-pie-dozen',
        name: 'Meat Pie (Dozen)',
        description: 'Dozen flaky meat pies',
        price: 8000,
        image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=200&fit=crop',
        category: 'small-chops',
        popular: true,
      },
    ],
  },
]

function deliveryTimeLabel(minutes) {
  const value = Number(minutes)
  if (!Number.isFinite(value) || value <= 0) return '30-45 min'
  return `${Math.max(5, value - 15)}-${value} min`
}

function normaliseMenuItem(item, categoryName) {
  return {
    id: item.id,
    menuItemId: item.id,
    name: item.name,
    description: item.description || '',
    price: Number(item.price) || 0,
    image: item.image_url || FALLBACK_MENU_IMAGE,
    category: resolveCategoryId(categoryName),
    categoryName: categoryName || 'Menu',
    popular: false,
  }
}

function normaliseDemoItem(item) {
  return {
    id: item.id,
    // Demo items keep their string id so the cart can match them. Demo
    // restaurants are refused by createFoodOrder, so this never reaches
    // the food_order_items.menu_item_id foreign key.
    menuItemId: item.id,
    name: item.name,
    description: item.description || '',
    price: Number(item.price) || 0,
    image: item.image || FALLBACK_MENU_IMAGE,
    category: item.category || 'main',
    categoryName: item.category || 'Menu',
    popular: Boolean(item.popular),
  }
}

/**
 * Load active restaurants. Returns live database rows when available and
 * otherwise falls back to the demo catalogue flagged with `isDemo: true`.
 */
export async function fetchRestaurants() {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      return mockRestaurants.map((r) => ({ ...r, isDemo: true }))
    }

    return data.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.cover_image_url || r.logo_url || FALLBACK_MENU_IMAGE,
      rating: Number(r.rating) || 0,
      reviewCount: 0,
      cuisine: r.cuisine || 'Nigerian Food',
      categories: [],
      deliveryTime: deliveryTimeLabel(r.estimated_delivery_minutes),
      deliveryFee: Number(r.delivery_fee) || 0,
      isOpen: r.is_open !== false,
      address: r.address || r.city || 'Lagos',
      description: r.description || '',
      isDemo: false,
    }))
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return mockRestaurants.map((r) => ({ ...r, isDemo: true }))
  }
}

/**
 * Load the menu for one restaurant, joining restaurant_menu_categories so
 * each food item is grouped under its real database category name.
 */
export async function fetchRestaurantMenu(restaurantId) {
  if (restaurantId === null || restaurantId === undefined) return []

  // Demo restaurants use string ids, live restaurants use the bigint primary key.
  if (typeof restaurantId === 'string' && !/^\d+$/.test(restaurantId)) {
    const demo = mockRestaurants.find((r) => r.id === restaurantId)
    return demo ? demo.menu.map(normaliseDemoItem) : []
  }

  const numericId = Number(restaurantId)
  if (!Number.isFinite(numericId)) return []

  try {
    const [{ data: items, error: itemsError }, { data: categories, error: catError }] =
      await Promise.all([
        supabase
          .from('restaurant_menu_items')
          .select('*')
          .eq('restaurant_id', numericId)
          .eq('available', true)
          .order('created_at', { ascending: true }),
        supabase
          .from('restaurant_menu_categories')
          .select('id,name')
          .eq('restaurant_id', numericId)
          .order('sort_order', { ascending: true }),
      ])

    if (itemsError) throw itemsError
    if (catError) throw catError

    const nameById = new Map((categories || []).map((c) => [c.id, c.name]))

    return (items || []).map((item) =>
      normaliseMenuItem(item, nameById.get(item.category_id) || 'Menu')
    )
  } catch (error) {
    console.error('Error fetching menu:', error)
    return []
  }
}

/** Category ids that actually have available food items for a restaurant. */
export async function fetchRestaurantMenuCategories(restaurantId) {
  const menu = await fetchRestaurantMenu(restaurantId)
  return Array.from(new Set(menu.map((item) => item.category)))
}

export function searchRestaurants(query, restaurants) {
  const q = String(query || '').toLowerCase().trim()
  if (!q) return restaurants.filter((r) => r.isOpen)
  return restaurants.filter(
    (r) =>
      r.isOpen &&
      (String(r.name).toLowerCase().includes(q) ||
        String(r.cuisine).toLowerCase().includes(q) ||
        String(r.description || '').toLowerCase().includes(q))
  )
}

/**
 * Filter restaurants down to those whose menu actually contains food in the
 * selected category. Live restaurants are matched on real menu items; the
 * demo catalogue is matched on its own `categories` list.
 */
export async function filterRestaurantsByCategory(restaurants, categoryId, menusById) {
  if (!categoryId || categoryId === 'all') return restaurants.filter((r) => r.isOpen)

  const matches = await Promise.all(
    restaurants.map(async (restaurant) => {
      if (!restaurant.isOpen) return false
      if (restaurant.isDemo) {
        return (restaurant.categories || []).includes(categoryId)
      }
      const menu = menusById?.get(String(restaurant.id)) ?? (await fetchRestaurantMenu(restaurant.id))
      return (menu || []).some((item) => item.category === categoryId)
    })
  )

  return restaurants.filter((_, index) => matches[index])
}

/**
 * Place a food order.
 *
 * Prices are NOT decided here. This sends only the restaurant id, the
 * menu item ids, the quantities, the address and optional notes/location.
 * The database re-reads every price from restaurant_menu_items, verifies
 * each item still exists, belongs to that restaurant and is available,
 * re-reads the delivery fee from restaurants, and computes the subtotal and
 * total itself. It also writes the order and its items in one transaction,
 * so an order can never be left without its food.
 *
 * The saved food_order_items.unit_price is a historical snapshot: a later
 * price change at the restaurant does not rewrite it.
 *
 * payment_status stays 'pending' because no food payment flow exists yet;
 * nothing here pretends a payment succeeded.
 */
export async function createFoodOrder({
  customerUserId,
  restaurantId,
  items,
  deliveryAddress,
  notes = null,
  deliveryLatitude = null,
  deliveryLongitude = null,
}) {
  if (!customerUserId) {
    return { success: false, error: 'You must be signed in to place an order.' }
  }
  if (!restaurantId) {
    return { success: false, error: 'Restaurant information is missing.' }
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'Your cart is empty.' }
  }
  if (!deliveryAddress || !String(deliveryAddress).trim()) {
    return { success: false, error: 'A delivery address is required.' }
  }
  if (typeof restaurantId === 'string' && !/^\d+$/.test(restaurantId)) {
    return {
      success: false,
      error:
        'This is a demo restaurant with no database record, so an order cannot be saved. Please order from a registered Ewizzy restaurant.',
    }
  }

  // Shape the request as menu item ids and quantities only. Any price on
  // the cart object is deliberately dropped: the browser has no authority
  // over what an order costs.
  const lines = []
  for (const item of items) {
    const menuItemId = Number(item.menuItemId)
    const quantity = Number(item.quantity)

    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      return {
        success: false,
        error: 'Your cart contains an item that is not a real menu item. Please refresh and try again.',
      }
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { success: false, error: 'Every item in your cart needs a quantity of at least 1.' }
    }

    lines.push({ menu_item_id: menuItemId, quantity })
  }

  try {
    const { data, error } = await supabase.rpc('place_food_order', {
      p_restaurant_id: Number(restaurantId),
      p_items: lines,
      p_delivery_address: String(deliveryAddress).trim(),
      p_notes: notes || null,
      p_delivery_latitude: deliveryLatitude,
      p_delivery_longitude: deliveryLongitude,
    })

    if (error) {
      console.error('Failed to place order:', error)
      return { success: false, error: placeOrderErrorMessage(error.message) }
    }

    if (!data || !data.order_id) {
      return { success: false, error: 'Your order could not be saved. Please try again.' }
    }

    // Return the authoritative figures the database persisted, so the UI
    // shows the real prices rather than re-deriving them from the cart.
    return {
      success: true,
      order: {
        id: Number(data.order_id),
        order_number: data.order_number || null,
        status: data.status || 'pending',
        subtotal: Number(data.subtotal) || 0,
        delivery_fee: Number(data.delivery_fee) || 0,
        total: Number(data.total) || 0,
        items: (data.items || []).map((item) => ({
          menuItemId: item.menu_item_id,
          name: item.name,
          price: Number(item.unit_price) || 0,
          quantity: Number(item.quantity) || 0,
          lineTotal: Number(item.line_total) || 0,
        })),
      },
    }
  } catch (error) {
    console.error('Error placing order:', error)
    return { success: false, error: placeOrderErrorMessage(error?.message) }
  }
}

/** Turn the RPC's error text into something a customer can act on. */
function placeOrderErrorMessage(message) {
  const text = String(message || '')

  if (text.includes('signed in to place a food order')) {
    return 'You must be signed in to place an order.'
  }
  if (text.includes('cart is empty')) {
    return 'Your cart is empty.'
  }
  if (text.includes('delivery address is required')) {
    return 'Please enter a delivery address.'
  }
  if (text.includes('restaurant could not be found')) {
    return 'This restaurant could not be found. Please choose another restaurant.'
  }
  if (text.includes('not currently available on Ewizzy')) {
    return 'This restaurant is not currently available on Ewizzy.'
  }
  if (text.includes('closed right now')) {
    return 'This restaurant is closed right now. Please try again later.'
  }
  if (text.includes('no longer exists')) {
    return 'An item in your cart no longer exists. Please review your cart.'
  }
  if (text.includes('does not belong to this restaurant')) {
    return 'An item in your cart does not belong to this restaurant. Please review your cart.'
  }
  if (text.includes('no longer available')) {
    return 'An item in your cart is no longer available. Please review your cart.'
  }
  if (text.includes('does not have a valid price')) {
    return 'An item in your cart does not have a valid price. Please contact Ewizzy support.'
  }
  if (text.includes('valid quantity') || text.includes('quantity of at least 1')) {
    return 'Every item in your cart needs a valid quantity.'
  }
  if (text.includes('valid menu item')) {
    return 'Your cart contains an item that is not a real menu item. Please refresh and try again.'
  }
  if (text.includes('at most')) {
    return 'Your order has too many items. Please reduce the quantity and try again.'
  }
  if (text.includes('too large to place online')) {
    return 'This order is too large to place online. Please contact Ewizzy support.'
  }
  if (text.includes('address is too long') || text.includes('notes are too long')) {
    return 'Your delivery address or notes are too long. Please shorten them.'
  }
  if (text.includes('delivery location could not be read')) {
    return 'That delivery location could not be read. Please check your address.'
  }
  if (text.includes('could not be saved with all of its items')) {
    return 'Your order could not be saved with all of its items. Nothing was charged and no order was created.'
  }
  if (text.includes('place_food_order') || text.includes('404')) {
    return 'Placing an order is not available yet. Please contact Ewizzy support.'
  }

  return text || 'Could not place your order. Please try again.'
}

const ORDER_SELECT = `
  id,
  order_number,
  status,
  payment_status,
  subtotal,
  delivery_fee,
  total,
  notes,
  delivery_address,
  created_at,
  updated_at,
  customer_user_id,
  restaurant_id,
  rider_id,
  restaurant:restaurants(id, name, cover_image_url, logo_url, cuisine, address, phone),
  items:food_order_items(id, order_id, menu_item_id, item_name_snapshot, unit_price, quantity, line_total)
`

function decorateOrder(order) {
  if (!order) return null
  const restaurant = order.restaurant
  return {
    ...order,
    // food_orders.order_number is generated and stored by the database
    // (e.g. EZ-000123). It is the persistent customer-facing reference.
    orderNumber: order.order_number || null,
    restaurantName: restaurant?.name || 'Restaurant',
    restaurantImage: restaurant?.cover_image_url || restaurant?.logo_url || null,
    items: (order.items || []).map((item) => ({
      id: item.id,
      menuItemId: item.menu_item_id,
      name: item.item_name_snapshot,
      price: Number(item.unit_price) || 0,
      quantity: Number(item.quantity) || 0,
      lineTotal: Number(item.line_total) || 0,
    })),
  }
}

export async function fetchCustomerFoodOrders(customerUserId) {
  if (!customerUserId) return []
  try {
    const { data, error } = await supabase
      .from('food_orders')
      .select(ORDER_SELECT)
      .eq('customer_user_id', customerUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch customer food orders:', error)
      return []
    }
    return (data || []).map(decorateOrder)
  } catch (error) {
    console.error('Error fetching customer food orders:', error)
    return []
  }
}

export async function fetchFoodOrder(orderId, customerUserId) {
  if (!orderId) return null
  try {
    let query = supabase.from('food_orders').select(ORDER_SELECT).eq('id', orderId)
    if (customerUserId) query = query.eq('customer_user_id', customerUserId)
    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Failed to fetch food order:', error)
      return null
    }
    return decorateOrder(data)
  } catch (error) {
    console.error('Error fetching food order:', error)
    return null
  }
}

/**
 * Claim an available food delivery.
 *
 * Uses the claim_food_order RPC rather than a direct update. The RPC
 * assigns rider_id for the current authenticated rider while leaving the
 * order status at 'ready_for_pickup'; picking the order up is a separate,
 * later transition. It also makes the claim atomic, so two riders
 * pressing Claim at the same time cannot both win.
 *
 * This performs no authorization of its own: the database decides whether
 * the caller is an active, available rider and whether the order is still
 * unclaimed.
 */
export async function claimFoodOrder(orderId) {
  if (!orderId) return { success: false, error: 'Missing order reference.' }

  try {
    const { data, error } = await supabase.rpc('claim_food_order', {
      p_order_id: orderId,
    })

    if (error) {
      console.error('Failed to claim food order:', error)
      return { success: false, error: claimErrorMessage(error.message) }
    }

    if (!data) {
      return { success: false, error: 'This delivery is no longer available.' }
    }

    return { success: true, order: data }
  } catch (error) {
    console.error('Error claiming food order:', error)
    return { success: false, error: claimErrorMessage(error?.message) }
  }
}

/** Turn the RPC's error text into something a rider can act on. */
function claimErrorMessage(message) {
  const text = String(message || '')

  if (text.includes('order_not_claimable')) {
    return 'This delivery was just taken by another rider.'
  }
  if (text.includes('not an active Ewizzy rider')) {
    return 'Your rider account is not active. Please contact Ewizzy support.'
  }
  if (text.includes('Go online before accepting')) {
    return 'Go online before accepting a delivery.'
  }
  if (text.includes('order_id is required')) {
    return 'This delivery could not be identified.'
  }
  if (text.includes('claim_food_order') || text.includes('404')) {
    return 'Claiming a delivery is not available yet. Please contact Ewizzy support.'
  }

  return text || 'This delivery could not be claimed.'
}

/**
 * Cancel a food order. The row is never deleted: status moves to
 * 'cancelled', which the food_orders status constraint allows. The
 * existing RLS policy only permits customer updates while the order is
 * still 'pending', so this is rejected by the database once the
 * restaurant has accepted the order.
 *
 * Only the cancellation reason is sent from the client. cancelled_at and
 * cancelled_by are populated by the database trigger, so they are never
 * supplied here and cannot be fabricated.
 */
export async function cancelFoodOrder(orderId, customerUserId, reason = null) {
  if (!orderId) return { success: false, error: 'Missing order reference.' }
  if (!customerUserId) return { success: false, error: 'You must be signed in to cancel an order.' }

  const update = { status: 'cancelled' }
  if (typeof reason === 'string' && reason.trim()) {
    update.cancel_reason = reason.trim()
  }

  try {
    const { data, error } = await supabase
      .from('food_orders')
      .update(update)
      .eq('id', orderId)
      .eq('customer_user_id', customerUserId)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Failed to cancel order:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return {
        success: false,
        error: 'This order can no longer be cancelled because the restaurant has already accepted it.',
      }
    }

    return { success: true, order: data }
  } catch (error) {
    console.error('Error cancelling order:', error)
    return { success: false, error: error.message }
  }
}

export async function fetchRestaurantOrders(restaurantId) {
  if (!restaurantId) return []
  try {
    // food_orders.customer_user_id has no foreign key to profiles, so the
    // customer is resolved with a separate lookup instead of an embed.
    const { data, error } = await supabase
      .from('food_orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        subtotal,
        delivery_fee,
        total,
        notes,
        delivery_address,
        created_at,
        customer_user_id,
        items:food_order_items(*)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch restaurant orders:', error)
      return []
    }

    const customerIds = Array.from(
      new Set((data || []).map((o) => o.customer_user_id).filter(Boolean))
    )

    let customersById = {}
    if (customerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', customerIds)
      customersById = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, { name: p.full_name, phone: p.phone }])
      )
    }

    return (data || []).map((order) => ({
      ...order,
      customerName: customersById[order.customer_user_id]?.name || 'Customer',
      customerPhone: customersById[order.customer_user_id]?.phone || '',
      items: (order.items || []).map((item) => ({
        id: item.id,
        name: item.item_name_snapshot,
        price: Number(item.unit_price) || 0,
        quantity: Number(item.quantity) || 0,
        lineTotal: Number(item.line_total) || 0,
      })),
    }))
  } catch (error) {
    console.error('Error fetching restaurant orders:', error)
    return []
  }
}

/** Restaurant-side status transition. Accepts any status the schema allows. */
export async function updateFoodOrderStatus(orderId, newStatus) {
  if (!orderId || !newStatus) return { success: false, error: 'Missing order or status.' }

  try {
    const { data, error } = await supabase
      .from('food_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Failed to update order status:', error)
      return { success: false, error: error.message }
    }

    return { success: true, order: data }
  } catch (error) {
    console.error('Error updating order:', error)
    return { success: false, error: error.message }
  }
}

export default mockRestaurants
