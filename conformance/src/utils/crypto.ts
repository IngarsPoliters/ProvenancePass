import * as ed25519 from '@noble/ed25519';

/**
 * JSON Canonicalization Scheme (JCS) implementation
 * Based on RFC 8785
 */
export function canonicalizeJSON(obj: any): string {
  if (obj === null) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') {
    if (!isFinite(obj)) throw new Error('Invalid number for canonicalization');
    // Use minimal representation without trailing zeros
    return obj.toString();
  }
  if (typeof obj === 'string') {
    // Escape special characters
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalizeJSON(item)).join(',') + ']';
  }
  if (typeof obj === 'object') {
    // Sort object keys
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map(key => {
      const value = canonicalizeJSON(obj[key]);
      return JSON.stringify(key) + ':' + value;
    });
    return '{' + pairs.join(',') + '}';
  }
  throw new Error(`Cannot canonicalize type: ${typeof obj}`);
}

/**
 * Create a passport signature payload for signing
 * Removes the signature field and canonicalizes the rest
 */
export function createSignaturePayload(passport: any): string {
  // Create copy without signature field
  const { signature, ...unsignedPassport } = passport;
  
  // Canonicalize the unsigned passport
  return canonicalizeJSON(unsignedPassport);
}

/**
 * Generate Ed25519 key pair for testing
 */
export async function generateTestKeyPair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  const privateKeyBytes = ed25519.utils.randomPrivateKey();
  const publicKeyBytes = await ed25519.getPublicKey(privateKeyBytes);
  
  return {
    privateKey: Buffer.from(privateKeyBytes).toString('hex'),
    publicKey: Buffer.from(publicKeyBytes).toString('hex')
  };
}

/**
 * Sign a passport with Ed25519
 */
export async function signPassport(passport: any, privateKeyHex: string): Promise<any> {
  // Create unsigned payload
  const payload = createSignaturePayload(passport);
  const messageBytes = Buffer.from(payload, 'utf-8');
  
  // Sign with Ed25519
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  const signatureBytes = await ed25519.sign(messageBytes, privateKeyBytes);
  const publicKeyBytes = await ed25519.getPublicKey(privateKeyBytes);
  
  // Add signature to passport
  return {
    ...passport,
    signature: {
      algo: 'ed25519',
      public_key: Buffer.from(publicKeyBytes).toString('hex'),
      signature: Buffer.from(signatureBytes).toString('hex')
    }
  };
}

/**
 * Verify a passport signature
 */
export async function verifyPassportSignature(passport: any): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // Validate signature structure
    if (!passport.signature) {
      return { valid: false, error: 'Missing signature field' };
    }
    
    const { algo, public_key, signature } = passport.signature;
    
    if (algo !== 'ed25519') {
      return { valid: false, error: `Unsupported algorithm: ${algo}` };
    }
    
    if (!public_key || !signature) {
      return { valid: false, error: 'Missing public_key or signature' };
    }
    
    // Parse hex strings
    let publicKeyBytes: Uint8Array;
    let signatureBytes: Uint8Array;
    
    try {
      publicKeyBytes = Buffer.from(public_key, 'hex');
      signatureBytes = Buffer.from(signature, 'hex');
    } catch (e) {
      return { valid: false, error: 'Invalid hex encoding in public_key or signature' };
    }
    
    // Validate key and signature lengths
    if (publicKeyBytes.length !== 32) {
      return { valid: false, error: 'Public key must be 32 bytes (64 hex characters)' };
    }
    
    if (signatureBytes.length !== 64) {
      return { valid: false, error: 'Signature must be 64 bytes (128 hex characters)' };
    }
    
    // Create unsigned payload
    const payload = createSignaturePayload(passport);
    const messageBytes = Buffer.from(payload, 'utf-8');
    
    // Verify signature
    const isValid = await ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
    
    return { valid: isValid };
    
  } catch (error) {
    return { 
      valid: false, 
      error: `Verification error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Create SHA-256 hash of content
 */
export async function createSHA256Hash(content: string | Buffer): Promise<string> {
  const crypto = await import('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

/**
 * Test vectors for known-good signatures
 */
export const TEST_VECTORS = {
  // Test vector 1: Minimal passport
  MINIMAL: {
    privateKey: 'a123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234',
    passport: {
      version: '0.1',
      artifact: {
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        mime: 'text/plain',
        created_at: '2024-08-19T15:30:00Z'
      }
    }
  },
  
  // Test vector 2: Complete passport with all fields
  COMPLETE: {
    privateKey: 'b234567890abcdef234567890abcdef234567890abcdef234567890abcdef2345',
    passport: {
      version: '0.1',
      artifact: {
        sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
        mime: 'text/plain',
        name: 'hello.txt',
        size: 5,
        created_at: '2024-08-19T15:30:00Z'
      },
      inputs: [
        {
          sha256: 'previous-file-hash-here',
          name: 'input.txt'
        }
      ],
      steps: [
        {
          command: 'echo hello > hello.txt',
          exit_code: 0,
          duration_ms: 10
        }
      ],
      review: {
        reviewer: 'test-reviewer',
        approved: true,
        comments: 'Automated test review'
      },
      policy_checks: [
        {
          policy: 'file-size-limit',
          passed: true,
          details: 'File size within limits'
        }
      ]
    }
  }
};