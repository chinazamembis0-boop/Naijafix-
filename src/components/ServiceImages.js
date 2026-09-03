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

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[-\s/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
}

function getServiceIcon(service) {
  const category = normalizeCategory(service?.category)
  const name = normalizeCategory(service?.name)

  return serviceIcons[category] || serviceIcons[name] || 'ðŸ› ï¸'
}

const serviceImages = {}
const defaultServiceImage = null

const flatServiceImages = {}
export const localServiceImages = {}

export function getServiceImage(service) {
  return null
}

export function getServiceImageByKey(key) {
  return null
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

