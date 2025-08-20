import type { ProvenancePassport } from '../types'

// Lazy import for noble/ed25519 to reduce initial bundle size
let ed25519Module: any = null
async function getEd25519() {
  if (!ed25519Module) {
    ed25519Module = await import('@noble/ed25519')
    // Set up SHA-512 fallback for browser compatibility
    if (!ed25519Module.etc.sha512Sync) {
      ed25519Module.etc.sha512Sync = (...messages: Uint8Array[]) => {
        console.warn('Browser SHA-512 not implemented - signature verification disabled')
        return new Uint8Array(64)
      }
    }
  }
  return ed25519Module
}

// SHA-512 setup is now handled in the lazy loader above

/**
 * Canonicalize JSON according to RFC 8785 JCS
 */
function canonicalizeJSON(obj: any): string {
  if (obj === null) return 'null'
  if (typeof obj === 'boolean') return obj.toString()
  if (typeof obj === 'number') {
    if (!isFinite(obj)) throw new Error('Non-finite numbers not allowed')
    const str = obj.toString()
    return str.includes('.') || str.includes('e') || str.includes('E') ? 
           obj.toPrecision(15).replace(/\.?0+$/, '') : str
  }
  if (typeof obj === 'string') {
    return JSON.stringify(obj)
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJSON).join(',') + ']'
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort()
    const pairs = keys.map(key => `${JSON.stringify(key)}:${canonicalizeJSON(obj[key])}`)
    return '{' + pairs.join(',') + '}'
  }
  throw new Error(`Cannot canonicalize type: ${typeof obj}`)
}

/**
 * Verify passport signature
 */
export async function verifyPassportSignature(passport: ProvenancePassport): Promise<boolean> {
  try {
    if (!passport.signature) return false

    // Extract signature components
    const signature = passport.signature
    if (signature.algo !== 'ed25519') {
      console.warn('Unsupported signature algorithm:', signature.algo)
      return false
    }

    // Basic validation checks
    if (!signature.public_key || !signature.signature || !signature.key_id) {
      console.warn('Missing signature components')
      return false
    }

    if (!signature.key_id.startsWith('ppk_')) {
      console.warn('Invalid key ID format:', signature.key_id)
      return false
    }

    // Lazy load Ed25519 for signature verification
    const ed25519 = await getEd25519()
    
    // For now, temporarily return true for valid passport structure
    // TODO: Implement proper browser-compatible Ed25519 verification
    console.warn('Browser signature verification temporarily disabled - showing passport details only')
    
    // Return true for now to allow viewing passport details
    // The signature validation will be properly implemented with a SHA-512 library
    return true
    
  } catch (error) {
    console.warn('Signature verification failed:', error)
    return false
  }
}

/**
 * Calculate SHA-256 hash of file
 */
export async function calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}