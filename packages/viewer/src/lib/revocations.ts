import type { RevocationData } from '../types'

const REVOCATIONS_URL = import.meta.env.VITE_REVOCATIONS_URL
  || 'https://data.provenancepass.com/revocations.json'

let revocationCache: {
  data: RevocationData | null
  timestamp: number
} = {
  data: null,
  timestamp: 0
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch revocation data with caching
 */
export async function fetchRevocations(): Promise<RevocationData | null> {
  const now = Date.now()
  
  // Return cached data if still fresh
  if (revocationCache.data && (now - revocationCache.timestamp) < CACHE_DURATION) {
    return revocationCache.data
  }

  try {
    const response = await fetch(REVOCATIONS_URL)
    
    if (!response.ok) {
      console.warn(`Failed to fetch revocations: HTTP ${response.status}`)
      return null
    }

    const data = await response.json() as RevocationData
    
    // Validate the response structure
    if (!data.revoked_keys || !Array.isArray(data.revoked_keys)) {
      console.warn('Invalid revocation data structure')
      return null
    }

    // Update cache
    revocationCache = {
      data,
      timestamp: now
    }

    return data
  } catch (error) {
    console.warn('Failed to fetch revocation data:', error)
    return null
  }
}

/**
 * Check if a key ID is revoked
 */
export async function checkKeyRevocation(keyId: string): Promise<'active' | 'revoked' | 'unknown'> {
  try {
    const revocations = await fetchRevocations()
    
    if (!revocations) {
      return 'unknown'
    }

    const isRevoked = revocations.revoked_keys.some(entry => entry.key_id === keyId)
    return isRevoked ? 'revoked' : 'active'
    
  } catch (error) {
    console.warn('Revocation check failed:', error)
    return 'unknown'
  }
}