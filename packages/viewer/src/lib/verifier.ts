import { extractPassportFromC2pa, extractPassportFromDocx, isC2paSupported } from './c2pa'
import { verifyPassportSignature, calculateFileHash } from './crypto'
import { checkKeyRevocation } from './revocations'
import type { VerificationData, ProvenancePassport } from '../types'

/**
 * Find sidecar passport files for a given file
 */
function findSidecarPassport(files: File[], targetFile: File): File | null {
  const baseName = targetFile.name.replace(/\.[^/.]+$/, '')
  
  // Look for .passport.json or .pp files
  const sidecarCandidates = files.filter(file => {
    const fileName = file.name
    return (
      fileName === `${targetFile.name}.passport.json` ||
      fileName === `${baseName}.passport.json` ||
      fileName === `${targetFile.name}.pp` ||
      fileName === `${baseName}.pp`
    )
  })

  return sidecarCandidates[0] || null
}

/**
 * Parse passport from JSON file
 */
async function parsePassportFile(file: File): Promise<ProvenancePassport | null> {
  try {
    const text = await file.text()
    const passport = JSON.parse(text) as ProvenancePassport
    
    // Basic validation
    if (!passport.artifact || !passport.signature) {
      throw new Error('Invalid passport format: missing required fields')
    }

    return passport
  } catch (error) {
    console.warn('Failed to parse passport file:', error)
    return null
  }
}

/**
 * Verify a single file with its passport
 */
async function verifySingleFile(file: File, passport: ProvenancePassport, source: string): Promise<VerificationData> {
  const result: VerificationData = {
    status: 'fail',
    file: file.name,
    source: source as any,
    passport_found: true,
    artifact_hash: await calculateFileHash(file)
  }

  try {
    // Verify signature
    const signatureValid = await verifyPassportSignature(passport)
    result.signature_valid = signatureValid

    if (!signatureValid) {
      result.error = 'Passport signature verification failed'
      return result
    }

    // Check artifact hash (only for 'bytes' binding)
    if (passport.artifact.hash_binding === 'bytes') {
      if (passport.artifact.sha256 !== result.artifact_hash) {
        result.error = 'Content hash mismatch - file may have been modified'
        result.details = `Expected: ${passport.artifact.sha256}, Got: ${result.artifact_hash}`
        return result
      }
    }

    // Check key revocation
    result.key_id = passport.signature.key_id
    result.key_status = await checkKeyRevocation(passport.signature.key_id)

    if (result.key_status === 'revoked') {
      result.error = 'Signing key has been revoked'
      return result
    }

    // Extract metadata
    result.created_at = passport.artifact.created_at
    result.steps = passport.steps || []
    result.policy_checks = passport.policy_checks || []

    // All checks passed
    result.status = 'pass'
    
  } catch (error) {
    result.error = `Verification failed: ${error instanceof Error ? error.message : String(error)}`
  }

  return result
}

/**
 * Main verification function for dropped files
 */
export async function verifyFiles(files: File[]): Promise<VerificationData> {
  if (files.length === 0) {
    throw new Error('No files provided')
  }

  // If only one file and it's a JSON passport, reject
  if (files.length === 1 && files[0].name.endsWith('.json')) {
    throw new Error('Please drop both the file and its passport, or a file with embedded passport')
  }

  // Find the main file to verify (non-JSON file)
  const mainFile = files.find(file => !file.name.endsWith('.json')) || files[0]
  
  let passport: ProvenancePassport | null = null
  let source = 'none'

  // Strategy 1: Try C2PA extraction
  if (isC2paSupported(mainFile)) {
    try {
      passport = await extractPassportFromC2pa(mainFile)
      if (passport) {
        source = 'c2pa'
      }
    } catch (error) {
      console.warn('C2PA extraction failed:', error)
    }
  }

  // Strategy 2: Try DOCX custom parts
  if (!passport && mainFile.name.toLowerCase().endsWith('.docx')) {
    try {
      passport = await extractPassportFromDocx(mainFile)
      if (passport) {
        source = 'docx-custom'
      }
    } catch (error) {
      console.warn('DOCX extraction failed:', error)
    }
  }

  // Strategy 3: Look for sidecar files
  if (!passport && files.length > 1) {
    const sidecarFile = findSidecarPassport(files, mainFile)
    if (sidecarFile) {
      passport = await parsePassportFile(sidecarFile)
      if (passport) {
        source = 'sidecar'
      }
    }
  }

  // Strategy 4: Check if any file is a standalone passport
  if (!passport) {
    const passportFile = files.find(file => 
      file.name.endsWith('.passport.json') || file.name.endsWith('.pp')
    )
    if (passportFile) {
      passport = await parsePassportFile(passportFile)
      if (passport) {
        source = 'sidecar'
      }
    }
  }

  // No passport found
  if (!passport) {
    return {
      status: 'warning',
      file: mainFile.name,
      source: 'none' as any,
      passport_found: false,
      error: 'No passport found (neither C2PA embedded, DOCX custom parts, nor sidecar file)',
      artifact_hash: await calculateFileHash(mainFile)
    }
  }

  // Verify the file with its passport
  return verifySingleFile(mainFile, passport, source)
}