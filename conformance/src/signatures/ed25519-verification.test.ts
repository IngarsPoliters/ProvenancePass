import { describe, it, expect } from 'vitest';
import { 
  signPassport, 
  verifyPassportSignature, 
  generateTestKeyPair,
  createSignaturePayload,
  canonicalizeJSON,
  TEST_VECTORS
} from '../utils/crypto';
import { createMinimalPassport } from '../utils/validation';

describe('Ed25519 Signature Verification', () => {
  describe('Signature creation and verification', () => {
    it('should create and verify a valid signature', async () => {
      const keyPair = await generateTestKeyPair();
      const unsignedPassport = createMinimalPassport();
      
      // Remove signature field for signing
      delete unsignedPassport.signature;
      
      const signedPassport = await signPassport(unsignedPassport, keyPair.privateKey);
      const verification = await verifyPassportSignature(signedPassport);
      
      expect(verification.valid).toBe(true);
      expect(verification.error).toBeUndefined();
      expect(signedPassport.signature.public_key).toBe(keyPair.publicKey);
    });

    it('should fail verification with wrong signature', async () => {
      const keyPair1 = await generateTestKeyPair();
      const keyPair2 = await generateTestKeyPair();
      const unsignedPassport = createMinimalPassport();
      
      delete unsignedPassport.signature;
      
      const signedPassport = await signPassport(unsignedPassport, keyPair1.privateKey);
      
      // Tamper with signature - replace with signature from different key
      const tamperedPassport = await signPassport(unsignedPassport, keyPair2.privateKey);
      signedPassport.signature.signature = tamperedPassport.signature.signature;
      
      const verification = await verifyPassportSignature(signedPassport);
      expect(verification.valid).toBe(false);
    });

    it('should fail verification with tampered content', async () => {
      const keyPair = await generateTestKeyPair();
      const unsignedPassport = createMinimalPassport();
      
      delete unsignedPassport.signature;
      
      const signedPassport = await signPassport(unsignedPassport, keyPair.privateKey);
      
      // Tamper with content after signing
      signedPassport.artifact.sha256 = 'tampered-hash-value-here';
      
      const verification = await verifyPassportSignature(signedPassport);
      expect(verification.valid).toBe(false);
    });
  });

  describe('Signature format validation', () => {
    it('should reject missing signature field', async () => {
      const passport = createMinimalPassport();
      delete passport.signature;
      
      const verification = await verifyPassportSignature(passport);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Missing signature field');
    });

    it('should reject unsupported algorithm', async () => {
      const passport = createMinimalPassport({
        signature: {
          algo: 'rsa',
          public_key: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          signature: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        }
      });
      
      const verification = await verifyPassportSignature(passport);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Unsupported algorithm: rsa');
    });

    it('should reject missing public key', async () => {
      const passport = createMinimalPassport({
        signature: {
          algo: 'ed25519',
          signature: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        }
      });
      
      const verification = await verifyPassportSignature(passport);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Missing public_key or signature');
    });

    it('should reject invalid hex in public key', async () => {
      const passport = createMinimalPassport({
        signature: {
          algo: 'ed25519',
          public_key: 'invalid-hex-characters-here-xyz',
          signature: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        }
      });
      
      const verification = await verifyPassportSignature(passport);
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('Invalid hex encoding');
    });

    it('should reject wrong public key length', async () => {
      const passport = createMinimalPassport({
        signature: {
          algo: 'ed25519',
          public_key: '1234567890abcdef',  // Too short
          signature: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        }
      });
      
      const verification = await verifyPassportSignature(passport);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Public key must be 32 bytes (64 hex characters)');
    });

    it('should reject wrong signature length', async () => {
      const passport = createMinimalPassport({
        signature: {
          algo: 'ed25519',
          public_key: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          signature: 'abcdef1234567890'  // Too short
        }
      });
      
      const verification = await verifyPassportSignature(passport);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Signature must be 64 bytes (128 hex characters)');
    });
  });

  describe('JSON Canonicalization (JCS)', () => {
    it('should canonicalize simple objects correctly', () => {
      const obj = { b: 2, a: 1 };
      const canonical = canonicalizeJSON(obj);
      expect(canonical).toBe('{"a":1,"b":2}');
    });

    it('should canonicalize arrays correctly', () => {
      const obj = { items: [3, 1, 2], name: 'test' };
      const canonical = canonicalizeJSON(obj);
      expect(canonical).toBe('{"items":[3,1,2],"name":"test"}');
    });

    it('should canonicalize nested objects correctly', () => {
      const obj = {
        outer: {
          z: 'last',
          a: 'first'
        },
        simple: 'value'
      };
      const canonical = canonicalizeJSON(obj);
      expect(canonical).toBe('{"outer":{"a":"first","z":"last"},"simple":"value"}');
    });

    it('should handle special characters in strings', () => {
      const obj = { text: 'hello\n"world"\t' };
      const canonical = canonicalizeJSON(obj);
      expect(canonical).toBe('{"text":"hello\\n\\"world\\"\\t"}');
    });

    it('should handle null and boolean values', () => {
      const obj = { null_val: null, true_val: true, false_val: false };
      const canonical = canonicalizeJSON(obj);
      expect(canonical).toBe('{"false_val":false,"null_val":null,"true_val":true}');
    });

    it('should create consistent signature payloads', () => {
      const passport1 = {
        version: '0.1',
        artifact: { sha256: 'hash1', mime: 'text/plain', created_at: '2024-01-01T00:00:00Z' },
        signature: { algo: 'ed25519', public_key: 'key1', signature: 'sig1' }
      };
      
      const passport2 = {
        artifact: { created_at: '2024-01-01T00:00:00Z', mime: 'text/plain', sha256: 'hash1' },
        version: '0.1',
        signature: { signature: 'sig1', algo: 'ed25519', public_key: 'key1' }
      };
      
      const payload1 = createSignaturePayload(passport1);
      const payload2 = createSignaturePayload(passport2);
      
      expect(payload1).toBe(payload2);
    });
  });

  describe('Test vectors', () => {
    it('should verify known test vector signatures', async () => {
      // Sign the test vectors and verify them
      for (const [name, vector] of Object.entries(TEST_VECTORS)) {
        const signedPassport = await signPassport(vector.passport, vector.privateKey);
        const verification = await verifyPassportSignature(signedPassport);
        
        expect(verification.valid).toBe(true, `Test vector ${name} should verify correctly`);
        expect(verification.error).toBeUndefined();
      }
    });

    it('should produce consistent signatures for same input', async () => {
      const vector = TEST_VECTORS.MINIMAL;
      
      const signed1 = await signPassport(vector.passport, vector.privateKey);
      const signed2 = await signPassport(vector.passport, vector.privateKey);
      
      // Signatures should be identical for same input and key
      expect(signed1.signature.signature).toBe(signed2.signature.signature);
      expect(signed1.signature.public_key).toBe(signed2.signature.public_key);
    });
  });

  describe('Real-world signature scenarios', () => {
    it('should handle large passport with many fields', async () => {
      const keyPair = await generateTestKeyPair();
      const largePassport = {
        version: '0.1',
        artifact: {
          sha256: 'a'.repeat(64),
          mime: 'application/json',
          name: 'large-file.json',
          size: 1000000,
          created_at: '2024-08-19T15:30:00Z'
        },
        inputs: Array(10).fill(null).map((_, i) => ({
          sha256: `input-${i}-${'b'.repeat(58)}`,
          name: `input-${i}.txt`
        })),
        steps: Array(5).fill(null).map((_, i) => ({
          command: `step-${i} --verbose --output file-${i}.txt`,
          exit_code: 0,
          duration_ms: 1000 + i * 100,
          timestamp: `2024-08-19T15:${30 + i}:00Z`
        })),
        review: {
          reviewer: 'automated-system',
          approved: true,
          comments: 'All automated checks passed successfully',
          timestamp: '2024-08-19T15:40:00Z'
        },
        policy_checks: [
          { policy: 'file-size-limit', passed: true, details: 'Size within 1MB limit' },
          { policy: 'virus-scan', passed: true, details: 'No malware detected' },
          { policy: 'content-policy', passed: true, details: 'Content approved' }
        ]
      };
      
      const signedPassport = await signPassport(largePassport, keyPair.privateKey);
      const verification = await verifyPassportSignature(signedPassport);
      
      expect(verification.valid).toBe(true);
      expect(verification.error).toBeUndefined();
    });

    it('should handle unicode content correctly', async () => {
      const keyPair = await generateTestKeyPair();
      const unicodePassport = {
        version: '0.1',
        artifact: {
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          mime: 'text/plain',
          name: 'файл.txt', // Cyrillic filename
          created_at: '2024-08-19T15:30:00Z'
        },
        review: {
          reviewer: '张三', // Chinese name
          comments: 'すべて良好です', // Japanese comment
          approved: true
        }
      };
      
      const signedPassport = await signPassport(unicodePassport, keyPair.privateKey);
      const verification = await verifyPassportSignature(signedPassport);
      
      expect(verification.valid).toBe(true);
      expect(verification.error).toBeUndefined();
    });
  });
});