export const categoryIllustrationPaths = {
  'home-construction': '/images/categories/home-construction.svg',
  'power-security': '/images/categories/power-security.svg',
  'auto-transport': '/images/categories/auto-transport.svg',
  'delivery-errands': '/images/categories/delivery-errands.svg',
  'technology-digital': '/images/categories/technology-digital.svg',
  'beauty-personal-care': '/images/categories/beauty-personal-care.svg',
  'family-education': '/images/categories/family-education.svg',
  'fashion-laundry': '/images/categories/fashion-laundry.svg',
}

export function getCategoryIllustration(categoryId) {
  const id = String(categoryId || '').toLowerCase()
  return categoryIllustrationPaths[id] || null
}
