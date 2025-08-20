import type { VerificationData } from '../types'

/**
 * Lazy-loaded verification engine
 * Splits the heavy verification logic into a separate chunk
 */
export async function verifyFilesLazy(files: File[]): Promise<VerificationData> {
  // Dynamic import to create a separate chunk
  const { verifyFiles } = await import('./verifier')
  return verifyFiles(files)
}

/**
 * Preload verification engine on user interaction
 * This allows us to start loading while user is thinking/clicking
 */
export function preloadVerifier(): Promise<any> {
  return import('./verifier')
}