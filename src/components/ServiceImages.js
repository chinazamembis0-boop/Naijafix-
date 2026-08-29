const serviceImages = {
  plumbing: '/images/services/plumbing.jpg',
  electrical: '/images/services/electrical.jpg',
  cleaning: '/images/services/cleaning.jpg',
  'ac repair': '/images/services/ac-repair.jpg',
  'generator repair': '/images/services/generator-repair.jpg',
  'phone repair': '/images/services/phone-repair.jpg',
  'computer repair': '/images/services/computer-repair.jpg',
  carpentry: '/images/services/carpentry.jpg',
  painting: '/images/services/painting.jpg',
  'fashion and tailoring': '/images/services/fashion-tailoring.jpg',
  barbering: '/images/services/barbering.jpg',
  beauty: '/images/services/beauty.jpg',
}

const defaultServiceImage = '/images/services/plumbing.jpg'

function normalizeCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
}

export function getServiceImage(service) {
  if (!service) return defaultServiceImage

  const category = normalizeCategory(service.category)
  const name = normalizeCategory(service.name)

  if (serviceImages[category]) return serviceImages[category]
  if (serviceImages[name]) return serviceImages[name]

  for (const key of Object.keys(serviceImages)) {
    if (category.includes(key) || key.includes(category)) return serviceImages[key]
    if (name.includes(key) || key.includes(name)) return serviceImages[key]
  }

  return defaultServiceImage
}

export function getServiceImageByKey(key) {
  const normalized = normalizeCategory(key)
  return serviceImages[normalized] || defaultServiceImage
}

export default serviceImages
