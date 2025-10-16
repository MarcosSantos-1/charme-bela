// Gerenciamento de contas salvas no localStorage

export interface SavedAccount {
  uid: string
  email: string
  name: string
  photoURL?: string
  lastLogin: number
}

const STORAGE_KEY = 'charme_bela_saved_accounts'

export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === 'undefined') return []
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function saveAccount(account: SavedAccount) {
  if (typeof window === 'undefined') return
  
  try {
    const accounts = getSavedAccounts()
    const filtered = accounts.filter(a => a.uid !== account.uid)
    const updated = [account, ...filtered].slice(0, 5) // Máximo 5 contas
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Erro ao salvar conta:', error)
  }
}

export function removeAccount(uid: string) {
  if (typeof window === 'undefined') return
  
  try {
    const accounts = getSavedAccounts()
    const filtered = accounts.filter(a => a.uid !== uid)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Erro ao remover conta:', error)
  }
}

export function getLastAccount(): SavedAccount | null {
  const accounts = getSavedAccounts()
  return accounts.length > 0 ? accounts[0] : null
}


