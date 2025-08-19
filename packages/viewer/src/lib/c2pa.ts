import { createC2pa } from 'c2pa'
import type { ProvenancePassport } from '../types'

let c2paInstance: any = null

/**
 * Initialize C2PA library
 */
async function initC2pa() {
  if (!c2paInstance) {
    try {
      c2paInstance = await createC2pa({
        wasmSrc: '/c2pa.wasm',
        workerSrc: '/c2pa.worker.js'
      })
    } catch (error) {
      console.warn('Failed to initialize C2PA:', error)
      c2paInstance = null
    }
  }
  return c2paInstance
}

/**
 * Extract Provenance Passport from C2PA manifest
 */
export async function extractPassportFromC2pa(file: File): Promise<ProvenancePassport | null> {
  try {
    const c2pa = await initC2pa()
    if (!c2pa) return null

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    const result = await c2pa.read(uint8Array, file.type)
    
    if (!result || !result.manifests || result.manifests.length === 0) {
      return null
    }

    // Look for Provenance Passport assertions in any manifest
    for (const manifest of result.manifests) {
      if (manifest.assertions) {
        const passportAssertion = manifest.assertions['com.provenancepassport.receipt']
        if (passportAssertion) {
          return passportAssertion as ProvenancePassport
        }
      }
    }

    return null
  } catch (error) {
    console.warn('C2PA extraction failed:', error)
    return null
  }
}

/**
 * Check if C2PA library supports this file type
 */
export function isC2paSupported(file: File): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/avif',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav'
  ]
  
  return supportedTypes.includes(file.type) || 
         file.name.toLowerCase().endsWith('.jpg') ||
         file.name.toLowerCase().endsWith('.jpeg') ||
         file.name.toLowerCase().endsWith('.png') ||
         file.name.toLowerCase().endsWith('.pdf') ||
         file.name.toLowerCase().endsWith('.mp4') ||
         file.name.toLowerCase().endsWith('.mov')
}

/**
 * Extract passport from DOCX custom XML parts
 */
export async function extractPassportFromDocx(file: File): Promise<ProvenancePassport | null> {
  try {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return null
    }

    // For now, we'll fall back to sidecar detection for DOCX
    // Full DOCX parsing would require unzipping and XML parsing
    console.log('DOCX custom parts extraction not yet implemented in browser')
    return null
  } catch (error) {
    console.warn('DOCX extraction failed:', error)
    return null
  }
}