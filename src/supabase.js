import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function extractStorageObjectPath(url, bucket) {
  if (!url) return ''

  let path = String(url).trim()

  if (path.startsWith('http')) {
    try {
      const urlObj = new URL(path)
      const pathname = urlObj.pathname

      const signMatch = pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+\/.+)$/)
      if (signMatch) {
        return signMatch[1]
      }

      const objectMatch = pathname.match(/\/storage\/v1\/object\/([^/]+\/.+)$/)
      if (objectMatch) {
        return objectMatch[1]
      }

      const bucketIndex = pathname.indexOf(`/${bucket}/`)
      if (bucketIndex !== -1) {
        return pathname.slice(bucketIndex + 1)
      }
    } catch {
      // not a valid URL, fall through to raw path handling
    }
  }

  if (path.startsWith('/')) {
    path = path.slice(1)
  }

  return path
}

export async function getSignedStorageUrl(bucket, path) {
  if (!bucket || !path) {
    throw new Error('Missing bucket or path for signed URL')
  }

  const normalizedPath = extractStorageObjectPath(path, bucket)

  if (!normalizedPath) {
    throw new Error('Empty object path after normalizing: ' + String(path))
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(normalizedPath, 3600)

  if (error) {
    throw error
  }

  if (!data?.signedUrl) {
    throw new Error('Supabase returned no signed URL')
  }

  return data.signedUrl
}

export async function uploadPrivateFile(bucket, userId, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${userId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false })

  if (error) {
    throw error
  }

  return path
}

/**
 * Haversine straight-line distance between two coordinates, in kilometres.
 * Returns null when either coordinate is missing or invalid.
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const parse = (value) => {
    if (value === null || value === undefined) return NaN
    const num = Number(value)
    return Number.isFinite(num) ? num : NaN
  }
  const a = parse(lat1)
  const b = parse(lon1)
  const c = parse(lat2)
  const d = parse(lon2)
  if ([a, b, c, d].some((n) => Number.isNaN(n))) return null
  const R = 6371
  const dLat = ((c - a) * Math.PI) / 180
  const dLon = ((d - b) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a * Math.PI) / 180) *
      Math.cos((c * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const arc = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * arc
}

/**
 * Format a distance in kilometres for display.
 * Sub-kilometre distances are shown in metres.
 */
export function formatDistanceKm(distance) {
  if (distance === null || distance === undefined || Number.isNaN(distance)) return null
  if (distance < 1) return Math.round(distance * 1000) + ' m away'
  return distance.toFixed(1) + ' km away'
}