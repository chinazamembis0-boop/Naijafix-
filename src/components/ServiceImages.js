const serviceIcons = {
  plumbing: 'ðŸ”§',
  electrical: 'âš¡',
  cleaning: 'ðŸ§¹',
  'ac repair': 'â„ï¸',
  'generator repair': 'ðŸ”Œ',
  'phone repair': 'ðŸ“±',
  'computer repair': 'ðŸ’»',
  carpentry: 'ðŸªš',
  painting: 'ðŸŽ¨',
  'fashion and tailoring': 'ðŸ‘•',
  barbering: 'ðŸ’ˆ',
  beauty: 'ðŸ’‡',
  'house building': 'ðŸ—ï¸',
  roofing: 'ðŸ ',
  'tiling and flooring': 'ðŸ”²',
  'pop and ceiling': 'âœ¨',
  welding: 'âš’ï¸',
  'aluminium and glass': 'ðŸªŸ',
  'furniture making': 'ðŸª‘',
  'furniture repair': 'ðŸ”¨',
  'interior decoration': 'ðŸŽ¨',
  handyman: 'ðŸ”§',
  'gardening and landscaping': 'ðŸŒ¿',
  'fumigation and pest control': 'ðŸ›',
  'solar installation': 'â˜€ï¸',
  'solar repair': 'ðŸ”†',
  'inverter installation': 'ðŸ”‹',
  'inverter repair': 'âš¡',
  'cctv installation': 'ðŸ“¹',
  'security systems': 'ðŸ”’',
  'dstv / satellite installation': 'ðŸ“¡',
  'borehole services': 'ðŸ’§',
  'water pump repair': 'ðŸ”§',
  'water tank services': 'ðŸš°',
  'auto mechanic': 'ðŸš—',
  'auto electrical': 'âš¡',
  'car ac repair': 'â„ï¸',
  'tyre services': 'ðŸ›ž',
  vulcanizing: 'ðŸ”§',
  'car wash': 'ðŸš¿',
  'car detailing': 'âœ¨',
  'car painting': 'ðŸŽ¨',
  'panel beating': 'ðŸ”¨',
  'car battery services': 'ðŸ”‹',
  towing: 'ðŸš›',
  'driver / chauffeur': 'ðŸ§‘â€âœˆï¸',
  'moving and relocation': 'ðŸ“¦',
  'dispatch riders': 'ðŸï¸',
  'package delivery': 'ðŸ“¦',
  'food delivery': 'ðŸ±',
  'grocery delivery': 'ðŸ›’',
  'document delivery': 'ðŸ“„',
  'errand runner': 'ðŸƒ',
  'pickup and drop-off': 'ðŸ“',
  'laptop repair': 'ðŸ’»',
  'printer repair': 'ðŸ–¨ï¸',
  'tv repair': 'ðŸ“º',
  'electronics repair': 'ðŸ”Œ',
  'wi-fi and internet setup': 'ðŸ“¶',
  'network installation': 'ðŸŒ',
  'web development': 'ðŸ’»',
  'mobile app development': 'ðŸ“±',
  'graphic design': 'ðŸŽ¨',
  'video editing': 'ðŸŽ¬',
  photography: 'ðŸ“·',
  videography: 'ðŸŽ¥',
  'social media management': 'ðŸ“±',
  'digital marketing': 'ðŸ“ˆ',
  'virtual assistant': 'ðŸ§‘â€ðŸ’»',
  hairdressing: 'ðŸ’‡',
  'braiding / locs': 'ðŸ’‡â€â™€ï¸',
  'makeup artist': 'ðŸ’„',
  'nail technician': 'ðŸ’…',
  'manicure and pedicure': 'ðŸ’…',
  massage: 'ðŸ’†',
  'fitness trainer': 'ðŸ‹ï¸',
  'home tutor': 'ðŸ“š',
  'jamb / waec tutor': 'ðŸ“',
  'primary / secondary tutor': 'ðŸ“–',
  'music teacher': 'ðŸŽµ',
  'language tutor': 'ðŸ—£ï¸',
  'driving instructor': 'ðŸš—',
  'nanny / childcare': 'ðŸ‘¶',
  'elderly care / caregiver': 'ðŸ§“',
  'home cook / personal chef': 'ðŸ‘¨â€ðŸ³',
  'clothing alteration': 'âœ‚ï¸',
  'shoe making': 'ðŸ‘ž',
  'shoe repair': 'ðŸ‘Ÿ',
  'bag making': 'ðŸ‘œ',
  laundry: 'ðŸ‘•',
  'dry cleaning': 'ðŸ§¥',
  catering: 'ðŸ½ï¸',
  'small chops': 'ðŸ¥Ÿ',
  'cake and baking': 'ðŸŽ‚',
  'event planning': 'ðŸ“‹',
  'event decoration': 'ðŸŽŠ',
  dj: 'ðŸŽ§',
  'mc / compere': 'ðŸŽ¤',
  'sound and lighting': 'ðŸ”Š',
  'event photography': 'ðŸ“¸',
  'event videography': 'ðŸŽ¬',
  'equipment rentals': 'ðŸŽª',
  'pet grooming': 'ðŸ•',
  'pet sitting': 'ðŸ¾',
  'pet walking': 'ðŸ•â€ðŸ¦º',
  'legal services': 'âš–ï¸',
  accounting: 'ðŸ“Š',
  'tax services': 'ðŸ’°',
  'recruitment services': 'ðŸ¤',
  'travel / tour services': 'âœˆï¸',
  'printing services': 'ðŸ–¨ï¸',
  translation: 'ðŸŒ',
  'professional consulting': 'ðŸ’¼',
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

  return serviceIcons[category] || serviceIcons[name] || 'ðŸ› ï¸'
}

const serviceImages = {
  'home-construction': {
    electrical: '/images/services/cleaning-01.jpeg',
    plumbing: '/images/services/cleaning-01.jpeg',
    cleaning: '/images/services/cleaning-01.jpeg',
    'ac-repair': '/images/services/cleaning-01.jpeg',
    'generator-repair': '/images/services/cleaning-01.jpeg',
    carpentry: '/images/services/cleaning-01.jpeg',
    painting: '/images/services/cleaning-01.jpeg',
    'house-building': '/images/services/cleaning-01.jpeg',
    roofing: '/images/services/cleaning-01.jpeg',
    'tiling-flooring': '/images/services/cleaning-01.jpeg',
    'pop-ceiling': '/images/services/cleaning-01.jpeg',
    'plastering-screeding': '/images/services/cleaning-01.jpeg',
    'welding-fabrication': '/images/services/cleaning-01.jpeg',
    'aluminium-glass': '/images/services/cleaning-01.jpeg',
    'furniture-making': '/images/services/cleaning-01.jpeg',
    'furniture-repair': '/images/services/cleaning-01.jpeg',
    'interior-decoration': '/images/services/cleaning-01.jpeg',
    handyman: '/images/services/cleaning-01.jpeg',
    'gardening-landscaping': '/images/services/cleaning-01.jpeg',
    'fumigation-pest-control': '/images/services/cleaning-01.jpeg',
  },
  'power-security': {
    'solar-installation': '/images/services/cleaning-01.jpeg',
    'solar-repair': '/images/services/cleaning-01.jpeg',
    'inverter-installation': '/images/services/cleaning-01.jpeg',
    'inverter-repair': '/images/services/cleaning-01.jpeg',
    'cctv-installation': '/images/services/cleaning-01.jpeg',
    'security-systems': '/images/services/cleaning-01.jpeg',
    'dstv-satellite': '/images/services/cleaning-01.jpeg',
    'borehole-services': '/images/services/cleaning-01.jpeg',
    'water-pump-repair': '/images/services/cleaning-01.jpeg',
    'water-tank-services': '/images/services/cleaning-01.jpeg',
  },
  'auto-transport': {
    'auto-mechanic': '/images/services/cleaning-01.jpeg',
    'auto-electrical': '/images/services/cleaning-01.jpeg',
    'car-ac-repair': '/images/services/cleaning-01.jpeg',
    'tyre-services': '/images/services/cleaning-01.jpeg',
    vulcanizing: '/images/services/cleaning-01.jpeg',
    'car-wash': '/images/services/cleaning-01.jpeg',
    'car-detailing': '/images/services/cleaning-01.jpeg',
    'car-painting': '/images/services/cleaning-01.jpeg',
    'panel-beating': '/images/services/cleaning-01.jpeg',
    'car-battery-services': '/images/services/cleaning-01.jpeg',
    towing: '/images/services/cleaning-01.jpeg',
    'driver-chauffeur': '/images/services/cleaning-01.jpeg',
    'moving-relocation': '/images/services/cleaning-01.jpeg',
  },
  'delivery-errands': {
    'dispatch-riders': '/images/services/cleaning-01.jpeg',
    'package-delivery': '/images/services/cleaning-01.jpeg',
    'food-delivery': '/images/services/cleaning-01.jpeg',
    'grocery-delivery': '/images/services/cleaning-01.jpeg',
    'document-delivery': '/images/services/cleaning-01.jpeg',
    'errand-runner': '/images/services/cleaning-01.jpeg',
    'pickup-dropoff': '/images/services/cleaning-01.jpeg',
  },
  'technology-digital': {
    'phone-repair': '/images/services/cleaning-01.jpeg',
    'computer-repair': '/images/services/cleaning-01.jpeg',
    'laptop-repair': '/images/services/cleaning-01.jpeg',
    'printer-repair': '/images/services/cleaning-01.jpeg',
    'tv-repair': '/images/services/cleaning-01.jpeg',
    'electronics-repair': '/images/services/cleaning-01.jpeg',
    'wifi-internet-setup': '/images/services/cleaning-01.jpeg',
    'network-installation': '/images/services/cleaning-01.jpeg',
    'web-development': '/images/services/cleaning-01.jpeg',
    'mobile-app-development': '/images/services/cleaning-01.jpeg',
    'graphic-design': '/images/services/cleaning-01.jpeg',
    'video-editing': '/images/services/cleaning-01.jpeg',
    photography: '/images/services/cleaning-01.jpeg',
    videography: '/images/services/cleaning-01.jpeg',
    'social-media-management': '/images/services/cleaning-01.jpeg',
    'digital-marketing': '/images/services/cleaning-01.jpeg',
    'virtual-assistant': '/images/services/cleaning-01.jpeg',
  },
  'beauty-personal-care': {
    'fashion-tailoring': '/images/services/cleaning-01.jpeg',
    barbering: '/images/services/cleaning-01.jpeg',
    beauty: '/images/services/cleaning-01.jpeg',
    hairdressing: '/images/services/cleaning-01.jpeg',
    'braiding-locs': '/images/services/cleaning-01.jpeg',
    'makeup-artist': '/images/services/cleaning-01.jpeg',
    'nail-technician': '/images/services/cleaning-01.jpeg',
    'manicure-pedicure': '/images/services/cleaning-01.jpeg',
    massage: '/images/services/cleaning-01.jpeg',
    'fitness-trainer': '/images/services/cleaning-01.jpeg',
  },
  'family-education': {
    'home-tutor': '/images/services/cleaning-01.jpeg',
    'jamb-waec-tutor': '/images/services/cleaning-01.jpeg',
    'primary-secondary-tutor': '/images/services/cleaning-01.jpeg',
    'music-teacher': '/images/services/cleaning-01.jpeg',
    'language-tutor': '/images/services/cleaning-01.jpeg',
    'driving-instructor': '/images/services/cleaning-01.jpeg',
    'nanny-childcare': '/images/services/cleaning-01.jpeg',
    'elderly-care': '/images/services/cleaning-01.jpeg',
    'home-cook': '/images/services/cleaning-01.jpeg',
  },
  'fashion-laundry': {
    'clothing-alteration': '/images/services/cleaning-01.jpeg',
    'shoe-making': '/images/services/cleaning-01.jpeg',
    'shoe-repair': '/images/services/cleaning-01.jpeg',
    'bag-making': '/images/services/cleaning-01.jpeg',
    laundry: '/images/services/cleaning-01.jpeg',
    'dry-cleaning': '/images/services/cleaning-01.jpeg',
  },
  'events-food': {
    catering: '/images/services/cleaning-01.jpeg',
    'small-chops': '/images/services/cleaning-01.jpeg',
    'cake-baking': '/images/services/cleaning-01.jpeg',
    'event-planning': '/images/services/cleaning-01.jpeg',
    'event-decoration': '/images/services/cleaning-01.jpeg',
    dj: '/images/services/cleaning-01.jpeg',
    'mc-compere': '/images/services/cleaning-01.jpeg',
    'sound-lighting': '/images/services/cleaning-01.jpeg',
    'event-photography': '/images/services/cleaning-01.jpeg',
    'event-videography': '/images/services/cleaning-01.jpeg',
    'equipment-rentals': '/images/services/cleaning-01.jpeg',
  },
  'professional-services': {
    'pet-grooming': '/images/services/cleaning-01.jpeg',
    'pet-sitting': '/images/services/cleaning-01.jpeg',
    'pet-walking': '/images/services/cleaning-01.jpeg',
    'legal-services': '/images/services/cleaning-01.jpeg',
    accounting: '/images/services/cleaning-01.jpeg',
    'tax-services': '/images/services/cleaning-01.jpeg',
    'recruitment-services': '/images/services/cleaning-01.jpeg',
    'travel-tour-services': '/images/services/cleaning-01.jpeg',
    'printing-services': '/images/services/cleaning-01.jpeg',
    translation: '/images/services/cleaning-01.jpeg',
    'professional-consulting': '/images/services/cleaning-01.jpeg',
  },
}

const defaultServiceImage = '/images/services/cleaning-01.jpeg'

const flatServiceImages = {}
for (const group of Object.values(serviceImages)) {
  for (const [k, url] of Object.entries(group)) {
    const normalizedKey = normalizeCategory(k)
    if (normalizedKey && !flatServiceImages[normalizedKey]) {
      flatServiceImages[normalizedKey] = url
    }
  }
}

export const localServiceImages = {
  'accounting': '/images/services/accounting-01.jpeg',
  'ac-repair': '/images/services/ac-repair-01.jpeg',
  'aluminium-glass': '/images/services/aluminium-glass-01.jpeg',
  'auto-electrical': '/images/services/auto-electrical-01.jpeg',
  'auto-mechanic': '/images/services/auto-mechanic-01.jpeg',
  'bag-making': '/images/services/bag-making-01.jpeg',
  'barbering': '/images/services/barbering-01.jpeg',
  'beauty': '/images/services/beauty-01.jpeg',
  'borehole-services': '/images/services/borehole-services-01.jpeg',
  'braiding-locs': '/images/services/braiding-locs-01.jpeg',
  'cake-baking': '/images/services/cake-baking-01.jpeg',
  'car-detailing': '/images/services/car-detailing-01.jpeg',
  'car-painting': '/images/services/car-painting-01.jpeg',
  'carpentry': '/images/services/carpentry-01.jpeg',
  'catering': '/images/services/catering-01.jpeg',
  'cctv-installation': '/images/services/cctv-installation-01.jpeg',
  'cleaning': '/images/services/cleaning-01.jpeg',
  'clothing-alteration': '/images/services/clothing-alteration-01.jpeg',
  'digital-marketing': '/images/services/digital-marketing-01.jpeg',
  'dispatch-riders': '/images/services/dispatch-riders-01.jpeg',
  'dj': '/images/services/dj-01.jpeg',
  'driver-chauffeur': '/images/services/driver-chauffeur-01.jpeg',
  'driving-instructor': '/images/services/driving-instructor-01.jpeg',
  'dry-cleaning': '/images/services/dry-cleaning-01.jpeg',
  'dstv-satellite': '/images/services/dstv-satellite-01.jpeg',
  'elderly-care': '/images/services/elderly-care-01.jpeg',
  'electrical': '/images/services/electrical-01.jpeg',
  'electronics-repair': '/images/services/electronics-repair-01.jpeg',
  'errand-runner': '/images/services/errand-runner-01.jpeg',
  'event-decoration': '/images/services/event-decoration-01.jpeg',
  'event-planning': '/images/services/event-planning-01.jpeg',
  'event-videography': '/images/services/event-videography-01.jpeg',
  'fashion-tailoring': '/images/services/fashion-tailoring-01.jpeg',
  'fitness-trainer': '/images/services/fitness-trainer-01.jpeg',
  'fumigation-pest-control': '/images/services/fumigation-pest-control-01.jpeg',
  'gardening-landscaping': '/images/services/gardening-landscaping-01.jpeg',
  'generator-repair': '/images/services/generator-repair-01.jpeg',
  'graphic-design': '/images/services/graphic-design-01.jpeg',
  'hairdressing': '/images/services/hairdressing-01.jpeg',
  'handyman': '/images/services/handyman-01.jpeg',
  'home-tutor': '/images/services/home-tutor-01.jpeg',
  'house-building': '/images/services/house-building-01.jpeg',
  'interior-decoration': '/images/services/interior-decoration-01.jpeg',
  'jamb-waec-tutor': '/images/services/jamb-waec-tutor-01.jpeg',
  'language-tutor': '/images/services/language-tutor-01.jpeg',
  'laptop-repair': '/images/services/laptop-repair-01.jpeg',
  'laundry': '/images/services/laundry-01.jpeg',
  'legal-services': '/images/services/legal-services-01.jpeg',
  'makeup-artist': '/images/services/makeup-artist-01.jpeg',
  'manicure-pedicure': '/images/services/manicure-pedicure-01.jpeg',
  'massage': '/images/services/massage-01.jpeg',
  'mc-compere': '/images/services/mc-compere-01.jpeg',
  'mobile-app-development': '/images/services/mobile-app-development-01.jpeg',
  'moving-relocation': '/images/services/moving-relocation-01.jpeg',
  'music-teacher': '/images/services/music-teacher-01.jpeg',
  'nail-technician': '/images/services/nail-technician-01.jpeg',
  'nanny-childcare': '/images/services/nanny-childcare-01.jpeg',
  'network-installation': '/images/services/network-installation-01.jpeg',
  'package-delivery': '/images/services/package-delivery-01.jpeg',
  'painting': '/images/services/painting-01.jpeg',
  'panel-beating': '/images/services/panel-beating-01.jpeg',
  'pet-grooming': '/images/services/pet-grooming-01.jpeg',
  'pet-sitting': '/images/services/pet-sitting-01.jpeg',
  'pet-walking': '/images/services/pet-walking-01.jpeg',
  'phone-repair': '/images/services/phone-repair-01.jpeg',
  'photography': '/images/services/photography-01.jpeg',
  'plastering-screeding': '/images/services/plastering-screeding-01.jpeg',
  'plumbing': '/images/services/plumbing-01.jpeg',
  'pop-ceiling': '/images/services/pop-ceiling-01.jpeg',
  'primary-secondary-tutor': '/images/services/primary-secondary-tutor-01.jpeg',
  'printing-services': '/images/services/printing-services-01.jpeg',
  'professional-consulting': '/images/services/professional-consulting-01.jpeg',
  'recruitment-services': '/images/services/recruitment-services-01.jpeg',
  'roofing': '/images/services/roofing-01.jpeg',
  'shoe-making': '/images/services/shoe-making-01.jpeg',
  'shoe-repair': '/images/services/shoe-repair-01.jpeg',
  'small-chops': '/images/services/small-chops-01.jpeg',
  'solar-installation': '/images/services/solar-installation-01.jpeg',
  'sound-lighting': '/images/services/sound-lighting-01.jpeg',
  'tax-services': '/images/services/tax-services-01.jpeg',
  'tiling-flooring': '/images/services/tiling-flooring-01.jpeg',
  'tv-repair': '/images/services/tv-repair-01.jpeg',
  'video-editing': '/images/services/video-editing-01.jpeg',
  'videography': '/images/services/videography-01.jpeg',
  'virtual-assistant': '/images/services/virtual-assistant-01.jpeg',
  'water-pump-repair': '/images/services/water-pump-repair-01.jpeg',
  'web-development': '/images/services/web-development-01.jpeg',
  'welding-fabrication': '/images/services/welding-fabrication-01.jpeg',
  'wifi-internet-setup': '/images/services/wifi-internet-setup-01.jpeg',
}
export function getServiceImage(service) {
  if (!service) return "/images/services/cleaning-01.jpeg"

  const slug = service.slug || service.id
  const normalizedSlug = normalizeCategory(slug)

  if (normalizedSlug && localServiceImages[normalizedSlug]) {
    return localServiceImages[normalizedSlug]
  }

  const category = normalizeCategory(service.category)
  const name = normalizeCategory(service.name)

  if (category && localServiceImages[category]) {
    return localServiceImages[category]
  }

  if (name && localServiceImages[name]) {
    return localServiceImages[name]
  }

  return "/images/services/cleaning-01.jpeg"
}

export function getServiceImageByKey(key) {
  const normalized = normalizeCategory(key)

  if (normalized && localServiceImages[normalized]) {
    return localServiceImages[normalized]
  }

  const match = Object.keys(localServiceImages).find((k) => {
    return normalized.includes(k) || k.includes(normalized)
  })

  if (match) {
    return localServiceImages[match]
  }

  return "/images/services/cleaning-01.jpeg"
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

