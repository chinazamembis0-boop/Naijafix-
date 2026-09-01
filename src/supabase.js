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