import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  username: string
}

export async function loginWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) throw error
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return {
    id: data.user.id,
    email: data.user.email || '',
    username: data.user.user_metadata?.username || data.user.email?.split('@')[0] || '',
  }
}

export async function registerWithEmail(email: string, username: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  })
  if (error) throw error
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
  window.location.href = '/'
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function getStoredUser(): AuthUser | null {
  // Synchronous check from localStorage (supabase stores session there)
  const storageKey = `sb-awmvrbkqpadohwbddabn-auth-token`
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const user = parsed?.user
    if (!user) return null
    return {
      id: user.id,
      email: user.email || '',
      username: user.user_metadata?.username || user.email?.split('@')[0] || '',
    }
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!getStoredUser()
}

export function getToken(): string | null {
  const storageKey = `sb-awmvrbkqpadohwbddabn-auth-token`
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.access_token || null
  } catch {
    return null
  }
}
