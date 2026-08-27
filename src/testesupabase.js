import { supabase } from './supabase.js'

async function testSupabase() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Supabase connection failed:', error)
  } else {
    console.log('Supabase connection successful:', data)
  }
}

testSupabase()