import api from './api'

const TOKEN_KEY = 'tradervue_token'
const USER_KEY = 'tradervue_user'

export interface AuthUser {
  id: number
  email: string
  username: string
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await api.post('/auth/login', {
    email,
    username: email,
    password,
  })
  localStorage.setItem(TOKEN_KEY, data.access_token)

  // Fetch user info
  const user = await getMe()
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

export async function register(email: string, username: string, password: string): Promise<void> {
  await api.post('/auth/register', { email, username, password })
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get('/auth/me')
  return data
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.location.href = '/'
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
