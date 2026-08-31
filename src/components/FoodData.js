import { supabase } from '../supabase.js'

export const foodCategories = [
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
        price: 2500,
        image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=200&fit=crop',
        category: 'soups-stews',
        popular: true,
      },
      {
        id: 'jollof-rice-chicken',
        name: 'Jollof Rice & Chicken',
        description: 'Smoky party jollof rice with grilled chicken',
        price: 3500,
        image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=200&fit=crop',
        category: 'jollof-rice',
        popular: true,
      },
      {
        id: 'pounded-yam-egusi',
        name: 'Pounded Yam & Egusi',
        description: 'Smooth pounded yam served with egusi soup',
        price: 3000,
        image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=200&fit=crop',
        category: 'swallow',
        popular: false,
      },
      {
        id: 'efo-riro',
        name: 'Efo Riro',
        description: 'Spinach stew with assorted meat and stockfish',
        price: 2800,
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
        price: 3000,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=200&fit=crop',
        category: 'suya-grills',
        popular: true,
      },
      {
        id: 'chicken-suya',
        name: 'Chicken Suya',
        description: 'Grilled chicken with suya spice',
        price: 4000,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=200&fit=crop',
        category: 'suya-grills',
        popular: true,
      },
      {
        id: 'grilled-fish',
        name: 'Grilled Tilapia',
        description: 'Whole grilled tilapia with pepper sauce',
        price: 5500,
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
    categories: ['chicken', 'fast-food', 'rice'],
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

export async function fetchRestaurants() {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch restaurants:', error)
      return mockRestaurants
    }

    if (!data || data.length === 0) {
      return mockRestaurants
    }

    return data.map((r) => ({
      ...r,
      image: r.cover_image_url || r.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      rating: Number(r.rating) || 0,
      reviewCount: 0,
      cuisine: r.cuisine || 'Nigerian Food',
      categories: r.cuisine ? [r.cuisine.toLowerCase().replace(/\s+/g, '-')] : ['nigerian-food'],
      deliveryTime: r.estimated_delivery_minutes ? `${r.estimated_delivery_minutes-10}-${r.estimated_delivery_minutes} min` : '30-45 min',
      deliveryFee: Number(r.delivery_fee) || 0,
      isOpen: r.is_open !== false,
      address: r.address || r.city || 'Lagos',
    }))
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return mockRestaurants
  }
}

export async function fetchRestaurantMenu(restaurantId) {
  try {
    const { data: items, error } = await supabase
      .from('restaurant_menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('available', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch menu items:', error)
      return null
    }

    if (!items || items.length === 0) {
      const mockRestaurant = mockRestaurants.find((r) => r.id === restaurantId)
      return mockRestaurant ? mockRestaurant.menu : []
    }

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      image: item.image_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=200&fit=crop',
      category: 'main',
      popular: false,
      _supabaseId: item.id,
    }))
  } catch (error) {
    console.error('Error fetching menu:', error)
    return null
  }
}

export async function fetchRestaurantsByCategory(categoryId) {
  const all = await fetchRestaurants()
  if (!categoryId) return all.filter((r) => r.isOpen)
  return all.filter((r) => r.isOpen && r.categories.includes(categoryId))
}

export function searchRestaurants(query, restaurants) {
  const q = String(query || '').toLowerCase().trim()
  if (!q) return restaurants.filter((r) => r.isOpen)
  return restaurants.filter(
    (r) =>
      r.isOpen &&
      (String(r.name).toLowerCase().includes(q) ||
        String(r.cuisine).toLowerCase().includes(q) ||
        String(r.description).toLowerCase().includes(q))
  )
}

export async function createFoodOrder({ customerUserId, restaurantId, items, deliveryAddress, deliveryFee, notes }) {
  try {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const total = subtotal + (deliveryFee || 0)

    const { data: order, error: orderError } = await supabase
      .from('food_orders')
      .insert({
        customer_user_id: customerUserId,
        restaurant_id: restaurantId,
        delivery_address: deliveryAddress,
        subtotal,
        delivery_fee: deliveryFee || 0,
        total,
        status: 'pending',
        payment_status: 'pending',
        notes: notes || null,
      })
      .select('*')
      .single()

    if (orderError) {
      console.error('Failed to create order:', orderError)
      return { success: false, error: orderError.message }
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      menu_item_id: item._supabaseId || null,
      item_name_snapshot: item.name,
      unit_price: item.price,
      quantity: item.quantity,
      line_total: item.price * item.quantity,
    }))

    const { error: itemsError } = await supabase
      .from('food_order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Failed to create order items:', itemsError)
      return { success: false, error: itemsError.message }
    }

    return { success: true, order }
  } catch (error) {
    console.error('Error creating order:', error)
    return { success: false, error: error.message }
  }
}

export async function fetchCustomerFoodOrders(customerUserId) {
  try {
    const { data, error } = await supabase
      .from('food_orders')
      .select(`
        *,
        restaurant:restaurants(name, cover_image_url),
        items:food_order_items(*)
      `)
      .eq('customer_user_id', customerUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch orders:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching orders:', error)
    return []
  }
}

export async function fetchRestaurantOrders(restaurantId) {
  try {
    const { data, error } = await supabase
      .from('food_orders')
      .select(`
        *,
        items:food_order_items(*)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch restaurant orders:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching restaurant orders:', error)
    return []
  }
}

export async function updateFoodOrderStatus(orderId, newStatus) {
  try {
    const { data, error } = await supabase
      .from('food_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*')
      .single()

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
