import api from './api'

export async function getSubscriptionStatus(): Promise<{ subscribed: boolean; status: string }> {
  const { data } = await api.get('/stripe/subscription-status')
  return data
}

export async function createCheckoutSession(): Promise<string | null> {
  const { data } = await api.post('/stripe/create-checkout-session')
  return data.url
}

export async function createPortalSession(): Promise<string> {
  const { data } = await api.post('/stripe/create-portal-session')
  return data.url
}
