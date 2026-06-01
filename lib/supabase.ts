import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Auth helpers
export const signUp = async (email: string, password: string) => {
  return await supabase.auth.signUp({ email, password })
}

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password })
}

export const signOut = async () => {
  return await supabase.auth.signOut()
}

export const getSession = async () => {
  return await supabase.auth.getSession()
}

export const getUser = async () => {
  return await supabase.auth.getUser()
}