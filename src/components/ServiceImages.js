const serviceIcons = {
  plumbing: '🔧',
  electrical: '⚡',
  cleaning: '🧹',
  'ac repair': '❄️',
  'generator repair': '🔌',
  'phone repair': '📱',
  'computer repair': '💻',
  carpentry: '🪚',
  painting: '🎨',
  'fashion and tailoring': '👕',
  barbering: '💈',
  beauty: '💇',
  'house building': '🏗️',
  roofing: '🏠',
  'tiling and flooring': '🔲',
  'pop and ceiling': '✨',
  welding: '⚒️',
  'aluminium and glass': '🪟',
  'furniture making': '🪑',
  'furniture repair': '🔨',
  'interior decoration': '🎨',
  handyman: '🔧',
  'gardening and landscaping': '🌿',
  'fumigation and pest control': '🐛',
  'solar installation': '☀️',
  'solar repair': '🔆',
  'inverter installation': '🔋',
  'inverter repair': '⚡',
  'cctv installation': '📹',
  'security systems': '🔒',
  'dstv / satellite installation': '📡',
  'borehole services': '💧',
  'water pump repair': '🔧',
  'water tank services': '🚰',
  'auto mechanic': '🚗',
  'auto electrical': '⚡',
  'car ac repair': '❄️',
  'tyre services': '🛞',
  vulcanizing: '🔧',
  'car wash': '🚿',
  'car detailing': '✨',
  'car painting': '🎨',
  'panel beating': '🔨',
  'car battery services': '🔋',
  towing: '🚛',
  'driver / chauffeur': '🧑‍✈️',
  'moving and relocation': '📦',
  'dispatch riders': '🏍️',
  'package delivery': '📦',
  'food delivery': '🍱',
  'grocery delivery': '🛒',
  'document delivery': '📄',
  'errand runner': '🏃',
  'pickup and drop-off': '📍',
  'laptop repair': '💻',
  'printer repair': '🖨️',
  'tv repair': '📺',
  'electronics repair': '🔌',
  'wi-fi and internet setup': '📶',
  'network installation': '🌐',
  'web development': '💻',
  'mobile app development': '📱',
  'graphic design': '🎨',
  'video editing': '🎬',
  photography: '📷',
  videography: '🎥',
  'social media management': '📱',
  'digital marketing': '📈',
  'virtual assistant': '🧑‍💻',
  hairdressing: '💇',
  'braiding / locs': '💇‍♀️',
  'makeup artist': '💄',
  'nail technician': '💅',
  'manicure and pedicure': '💅',
  massage: '💆',
  'fitness trainer': '🏋️',
  'home tutor': '📚',
  'jamb / waec tutor': '📝',
  'primary / secondary tutor': '📖',
  'music teacher': '🎵',
  'language tutor': '🗣️',
  'driving instructor': '🚗',
  'nanny / childcare': '👶',
  'elderly care / caregiver': '🧓',
  'home cook / personal chef': '👨‍🍳',
  'clothing alteration': '✂️',
  'shoe making': '👞',
  'shoe repair': '👟',
  'bag making': '👜',
  laundry: '👕',
  'dry cleaning': '🧥',
  catering: '🍽️',
  'small chops': '🥟',
  'cake and baking': '🎂',
  'event planning': '📋',
  'event decoration': '🎊',
  dj: '🎧',
  'mc / compere': '🎤',
  'sound and lighting': '🔊',
  'event photography': '📸',
  'event videography': '🎬',
  'equipment rentals': '🎪',
  'pet grooming': '🐕',
  'pet sitting': '🐾',
  'pet walking': '🐕‍🦺',
  'legal services': '⚖️',
  accounting: '📊',
  'tax services': '💰',
  'recruitment services': '🤝',
  'travel / tour services': '✈️',
  'printing services': '🖨️',
  translation: '🌍',
  'professional consulting': '💼',
}

function normalizeCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
}

function getServiceIcon(service) {
  const category = normalizeCategory(service?.category)
  const name = normalizeCategory(service?.name)

  return serviceIcons[category] || serviceIcons[name] || '🛠️'
}

const serviceImages = {
  'home-construction': {
    electrical: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&h=400&fit=crop',
    plumbing: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=400&fit=crop',
    cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop',
    'ac-repair': 'https://images.unsplash.com/photo-1631541909061-71e349d1f203?w=600&h=400&fit=crop',
    'generator-repair': 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=600&h=400&fit=crop',
    carpentry: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=400&fit=crop',
    painting: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop',
    'house-building': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&h=400&fit=crop',
    roofing: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=600&h=400&fit=crop',
    'tiling-flooring': 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&h=400&fit=crop',
    'pop-ceiling': 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600&h=400&fit=crop',
    'plastering-screeding': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop',
    'welding-fabrication': 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=600&h=400&fit=crop',
    'aluminium-glass': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
    'furniture-making': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop',
    'furniture-repair': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop',
    'interior-decoration': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&h=400&fit=crop',
    handyman: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=600&h=400&fit=crop',
    'gardening-landscaping': 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600&h=400&fit=crop',
    'fumigation-pest-control': 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=600&h=400&fit=crop',
  },
  'power-security': {
    'solar-installation': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop',
    'solar-repair': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop',
    'inverter-installation': 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&h=400&fit=crop',
    'inverter-repair': 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&h=400&fit=crop',
    'cctv-installation': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&h=400&fit=crop',
    'security-systems': 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop',
    'dstv-satellite': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop',
    'borehole-services': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=400&fit=crop',
    'water-pump-repair': 'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=600&h=400&fit=crop',
    'water-tank-services': 'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=600&h=400&fit=crop',
  },
  'auto-transport': {
    'auto-mechanic': 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=600&h=400&fit=crop',
    'auto-electrical': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=400&fit=crop',
    'car-ac-repair': 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=600&h=400&fit=crop',
    'tyre-services': 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop',
    vulcanizing: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop',
    'car-wash': 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&h=400&fit=crop',
    'car-detailing': 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&h=400&fit=crop',
    'car-painting': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop',
    'panel-beating': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop',
    'car-battery-services': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop',
    towing: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop',
    'driver-chauffeur': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop',
    'moving-relocation': 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=600&h=400&fit=crop',
  },
  'delivery-errands': {
    'dispatch-riders': 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&h=400&fit=crop',
    'package-delivery': 'https://images.unsplash.com/photo-1601598851547-4302969d0614?w=600&h=400&fit=crop',
    'food-delivery': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop',
    'grocery-delivery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop',
    'document-delivery': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=400&fit=crop',
    'errand-runner': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop',
    'pickup-dropoff': 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=600&h=400&fit=crop',
  },
  'technology-digital': {
    'phone-repair': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=400&fit=crop',
    'computer-repair': 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&h=400&fit=crop',
    'laptop-repair': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=400&fit=crop',
    'printer-repair': 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&h=400&fit=crop',
    'tv-repair': 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&h=400&fit=crop',
    'electronics-repair': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=600&h=400&fit=crop',
    'wifi-internet-setup': 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&h=400&fit=crop',
    'network-installation': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop',
    'web-development': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
    'mobile-app-development': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=400&fit=crop',
    'graphic-design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop',
    'video-editing': 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&h=400&fit=crop',
    photography: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=400&fit=crop',
    videography: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&h=400&fit=crop',
    'social-media-management': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop',
    'digital-marketing': 'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=600&h=400&fit=crop',
    'virtual-assistant': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop',
  },
  'beauty-personal-care': {
    'fashion-tailoring': 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&h=400&fit=crop',
    barbering: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=400&fit=crop',
    beauty: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop',
    hairdressing: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&h=400&fit=crop',
    'braiding-locs': 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&h=400&fit=crop',
    'makeup-artist': 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&h=400&fit=crop',
    'nail-technician': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=400&fit=crop',
    'manicure-pedicure': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=400&fit=crop',
    massage: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop',
    'fitness-trainer': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop',
  },
  'family-education': {
    'home-tutor': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop',
    'jamb-waec-tutor': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop',
    'primary-secondary-tutor': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop',
    'music-teacher': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop',
    'language-tutor': 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&h=400&fit=crop',
    'driving-instructor': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop',
    'nanny-childcare': 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&h=400&fit=crop',
    'elderly-care': 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=600&h=400&fit=crop',
    'home-cook': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=400&fit=crop',
  },
  'fashion-laundry': {
    'clothing-alteration': 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&h=400&fit=crop',
    'shoe-making': 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=400&fit=crop',
    'shoe-repair': 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=400&fit=crop',
    'bag-making': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&h=400&fit=crop',
    laundry: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600&h=400&fit=crop',
    'dry-cleaning': 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600&h=400&fit=crop',
  },
  'events-food': {
    catering: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&h=400&fit=crop',
    'small-chops': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=400&fit=crop',
    'cake-baking': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop',
    'event-planning': 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&h=400&fit=crop',
    'event-decoration': 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=600&h=400&fit=crop',
    dj: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=600&h=400&fit=crop',
    'mc-compere': 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&h=400&fit=crop',
    'sound-lighting': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop',
    'event-photography': 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&h=400&fit=crop',
    'event-videography': 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&h=400&fit=crop',
    'equipment-rentals': 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=600&h=400&fit=crop',
  },
  'professional-services': {
    'pet-grooming': 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600&h=400&fit=crop',
    'pet-sitting': 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600&h=400&fit=crop',
    'pet-walking': 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=600&h=400&fit=crop',
    'legal-services': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop',
    accounting: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&h=400&fit=crop',
    'tax-services': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&h=400&fit=crop',
    'recruitment-services': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=400&fit=crop',
    'travel-tour-services': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=400&fit=crop',
    'printing-services': 'https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=600&h=400&fit=crop',
    translation: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&h=400&fit=crop',
    'professional-consulting': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop',
  },
}

const defaultServiceImage = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&h=400&fit=crop'

const flatServiceImages = {}
for (const group of Object.values(serviceImages)) {
  for (const [k, url] of Object.entries(group)) {
    const normalizedKey = normalizeCategory(k)
    if (normalizedKey && !flatServiceImages[normalizedKey]) {
      flatServiceImages[normalizedKey] = url
    }
  }
}

export function getServiceImage(service) {
  if (!service) return defaultServiceImage

  if (service.image_url) {
    const trimmed = String(service.image_url).trim()
    if (trimmed) {
      return trimmed
    }
  }

  const slug = service.slug || service.id
  const normalizedSlug = normalizeCategory(slug)
  if (normalizedSlug && flatServiceImages[normalizedSlug]) {
    return flatServiceImages[normalizedSlug]
  }

  const category = normalizeCategory(service.category)
  const name = normalizeCategory(service.name)

  const categoryGroup = serviceImages[category] || serviceImages[name]
  if (categoryGroup) {
    const key = Object.keys(categoryGroup).find(
      (k) => {
        const nk = normalizeCategory(k)
        return category.includes(nk) || name.includes(nk) || nk.includes(category) || nk.includes(name)
      }
    )
    if (key) return categoryGroup[key]
  }

  for (const group of Object.values(serviceImages)) {
    const key = Object.keys(group).find(
      (k) => {
        const nk = normalizeCategory(k)
        return category.includes(nk) || name.includes(nk) || nk.includes(category) || nk.includes(name)
      }
    )
    if (key) return group[key]
  }

  return defaultServiceImage
}

export function getServiceImageByKey(key) {
  const normalized = normalizeCategory(key)
  if (flatServiceImages[normalized]) {
    return flatServiceImages[normalized]
  }
  for (const group of Object.values(serviceImages)) {
    const match = Object.keys(group).find((k) => {
      const nk = normalizeCategory(k)
      return normalized.includes(nk) || nk.includes(normalized)
    })
    if (match) return group[match]
  }
  return defaultServiceImage
}

export function getServiceGradient(service) {
  if (!service) return 'linear-gradient(135deg, #087f3d, #066630)'

  const category = normalizeCategory(service.category)
  const gradients = {
    'home-construction': 'linear-gradient(135deg, #8B5E3C, #5D4037)',
    'power-security': 'linear-gradient(135deg, #F59E0B, #D97706)',
    'auto-transport': 'linear-gradient(135deg, #3B82F6, #1E40AF)',
    'delivery-errands': 'linear-gradient(135deg, #10B981, #059669)',
    'technology-digital': 'linear-gradient(135deg, #6366F1, #4F46E5)',
    'beauty-personal-care': 'linear-gradient(135deg, #EC4899, #BE185D)',
    'family-education': 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    'fashion-laundry': 'linear-gradient(135deg, #F97316, #C2410C)',
    'events-food': 'linear-gradient(135deg, #EF4444, #B91C1C)',
    'professional-services': 'linear-gradient(135deg, #0EA5E9, #0369A1)',
  }

  return gradients[category] || 'linear-gradient(135deg, #087f3d, #066630)'
}

export { getServiceIcon }

export default serviceImages
