import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Auth helpers
export const signInWithEmail = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password })
}

export const signUpWithEmail = async (email: string, password: string, userData: any) => {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  })
}

export const signOut = async () => {
  return await supabase.auth.signOut()
}

// Real-time subscriptions
export const subscribeToOrders = (restaurantId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`orders:${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`
      },
      callback
    )
    .subscribe()
}

export const subscribeToTables = (restaurantId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`tables:${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tables',
        filter: `restaurant_id=eq.${restaurantId}`
      },
      callback
    )
    .subscribe()
}

// Offline storage helpers
export const saveToLocal = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data))
  }
}

export const getFromLocal = (key: string) => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  }
  return null
}

export const removeFromLocal = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key)
  }
}