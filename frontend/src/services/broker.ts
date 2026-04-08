import api from './api'

export async function getBrokerStatus(): Promise<{ connected: boolean; status: string }> {
  const { data } = await api.get('/broker/status')
  return data
}

export async function connectBroker(): Promise<string> {
  const { data } = await api.post('/broker/connect')
  return data.url
}

export async function listBrokerAccounts(): Promise<{ accounts: any[]; connected: boolean }> {
  const { data } = await api.get('/broker/accounts')
  return data
}

export async function importBrokerTrades(params: {
  account_id?: string
  start_date?: string
  end_date?: string
}): Promise<{ imported: number; skipped: number; total: number }> {
  const { data } = await api.post('/broker/import', params)
  return data
}
