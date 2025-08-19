import * as ed25519 from '@noble/ed25519'
import type { ProvenancePassport } from '../types'

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

    // Create passport without signature for verification
    const passportWithoutSignature = { ...passport }
    delete (passportWithoutSignature as any).signature

    // Canonicalize the passport
    const canonicalJson = canonicalizeJSON(passportWithoutSignature)
    const message = new TextEncoder().encode(canonicalJson)

    // Extract public key from signature
    if (!signature.public_key) {
      console.warn('No public key found in signature')
      return false
    }

    // Verify key_id matches public key
    if (!signature.key_id.startsWith('ppk_')) {
      console.warn('Invalid key ID format:', signature.key_id)
      return false
    }

    // Convert hex strings to bytes
    const publicKeyBytes = new Uint8Array(signature.public_key.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)))
    const signatureBytes = new Uint8Array(signature.signature.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)))

    // Verify the signature
    return await ed25519.verify(signatureBytes, message, publicKeyBytes)
    
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