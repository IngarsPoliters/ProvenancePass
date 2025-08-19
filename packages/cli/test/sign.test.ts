import { describe, it, expect } from 'vitest';
import { 
  generateKeyPair, 
  canonicalizeJSON, 
  generateKeyId, 
  signPassport, 
  verifyPassport,
  privateKeyFromPEM 
} from '../src/lib/sign.js';
import { jcsCanonicalize, validateJCS, RFC8785_TEST_VECTORS } from '../src/lib/jcs.js';

describe('RFC 8785 JCS implementation', () => {
  it('should pass all RFC 8785 test vectors', () => {
    expect(validateJCS()).toBe(true);
  });

  it('should match specific RFC 8785 test cases', () => {
    for (const testVector of RFC8785_TEST_VECTORS) {
      const result = jcsCanonicalize(testVector.input);
      expect(result).toBe(testVector.expected);
    }
  });
});

describe('signing utilities', () => {
  describe('generateKeyPair', () => {
    it('should generate valid key pairs', () => {
      const keyPair = generateKeyPair();
      expect(keyPair.privateKey).toHaveLength(32);
      expect(keyPair.publicKey).toHaveLength(32);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
    });

    it('should generate different keys each time', () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey);
      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
    });
  });

  describe('canonicalizeJSON', () => {
    it('should handle primitives correctly', () => {
      expect(canonicalizeJSON(null)).toBe('null');
      expect(canonicalizeJSON(true)).toBe('true');
      expect(canonicalizeJSON(false)).toBe('false');
      expect(canonicalizeJSON(42)).toBe('42');
      expect(canonicalizeJSON('hello')).toBe('"hello"');
    });

    it('should handle arrays correctly', () => {
      expect(canonicalizeJSON([])).toBe('[]');
      expect(canonicalizeJSON([1, 2, 3])).toBe('[1,2,3]');
      expect(canonicalizeJSON(['a', 'b', 'c'])).toBe('["a","b","c"]');
    });

    it('should handle objects with sorted keys', () => {
      const obj = { b: 2, a: 1, c: 3 };
      expect(canonicalizeJSON(obj)).toBe('{"a":1,"b":2,"c":3}');
    });

    it('should handle nested structures', () => {
      const obj = {
        z: [3, 1, 2],
        a: { y: 'hello', x: 'world' },
        b: null
      };
      expect(canonicalizeJSON(obj)).toBe('{"a":{"x":"world","y":"hello"},"b":null,"z":[3,1,2]}');
    });

    it('should handle unicode strings', () => {
      const obj = { message: 'hello 世界' };
      expect(canonicalizeJSON(obj)).toBe('{"message":"hello 世界"}');
    });

    it('should produce identical output for same object with different key orders (RFC 8785 JCS)', () => {
      // Same data in different key orders
      const obj1 = { z: 3, a: 1, m: 2, b: 4 };
      const obj2 = { a: 1, b: 4, m: 2, z: 3 };
      const obj3 = { m: 2, z: 3, b: 4, a: 1 };
      
      const canonical1 = canonicalizeJSON(obj1);
      const canonical2 = canonicalizeJSON(obj2);
      const canonical3 = canonicalizeJSON(obj3);
      
      expect(canonical1).toBe(canonical2);
      expect(canonical2).toBe(canonical3);
      expect(canonical1).toBe('{"a":1,"b":4,"m":2,"z":3}');
    });
  });

  describe('generateKeyId', () => {
    it('should generate correct key ID format', () => {
      const keyPair = generateKeyPair();
      const keyId = generateKeyId(keyPair.publicKey);
      
      expect(keyId).toMatch(/^ppk_[a-f0-9]{16}$/);
      expect(keyId).toHaveLength(20); // "ppk_" + 16 hex chars
    });

    it('should be deterministic for same public key', () => {
      const keyPair = generateKeyPair();
      const keyId1 = generateKeyId(keyPair.publicKey);
      const keyId2 = generateKeyId(keyPair.publicKey);
      
      expect(keyId1).toBe(keyId2);
    });

    it('should be different for different public keys', () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      const keyId1 = generateKeyId(keyPair1.publicKey);
      const keyId2 = generateKeyId(keyPair2.publicKey);
      
      expect(keyId1).not.toBe(keyId2);
    });
  });

  describe('privateKeyFromPEM', () => {
    it('should parse raw 32-byte keys', () => {
      const mockPrivateKey = new Uint8Array(32).fill(1);
      const base64 = Buffer.from(mockPrivateKey).toString('base64');
      const pem = `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
      
      const parsed = privateKeyFromPEM(pem);
      expect(parsed).toEqual(mockPrivateKey);
    });

    it('should handle keys with extra padding', () => {
      const mockPrivateKey = new Uint8Array(32).fill(1);
      const paddedKey = new Uint8Array(64);
      paddedKey.set(mockPrivateKey, 32); // Put the key at the end
      
      const base64 = Buffer.from(paddedKey).toString('base64');
      const pem = `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
      
      const parsed = privateKeyFromPEM(pem);
      expect(parsed).toEqual(mockPrivateKey);
    });

    it('should throw error for invalid key size', () => {
      const invalidKey = new Uint8Array(16).fill(1); // Too short
      const base64 = Buffer.from(invalidKey).toString('base64');
      const pem = `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
      
      expect(() => privateKeyFromPEM(pem)).toThrow('Invalid private key format');
    });
  });

  describe('sign and verify integration', () => {
    it('should sign and verify passports correctly', async () => {
      const keyPair = generateKeyPair();
      const passport = {
        version: '0.1',
        artifact: {
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          mime: 'text/plain',
          created_at: '2024-01-15T14:30:00.000Z',
          hash_binding: 'bytes',
          byte_size: 0
        }
      };

      const signature = await signPassport(passport, keyPair.privateKey);
      
      expect(signature.algo).toBe('ed25519');
      expect(signature.public_key).toHaveLength(64);
      expect(signature.signature).toHaveLength(128);
      expect(signature.key_id).toMatch(/^ppk_[a-f0-9]{16}$/);

      const signedPassport = { ...passport, signature };
      const isValid = await verifyPassport(signedPassport);
      expect(isValid).toBe(true);
    });

    it('should fail verification for modified content', async () => {
      const keyPair = generateKeyPair();
      const passport = {
        version: '0.1',
        artifact: {
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          mime: 'text/plain',
          created_at: '2024-01-15T14:30:00.000Z'
        }
      };

      const signature = await signPassport(passport, keyPair.privateKey);
      const signedPassport = { ...passport, signature };
      
      // Modify the content after signing
      signedPassport.artifact.sha256 = 'different_hash';
      
      const isValid = await verifyPassport(signedPassport);
      expect(isValid).toBe(false);
    });

    it('should fail verification for wrong key', async () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      
      const passport = {
        version: '0.1',
        artifact: {
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          mime: 'text/plain',
          created_at: '2024-01-15T14:30:00.000Z'
        }
      };

      const signature = await signPassport(passport, keyPair1.privateKey);
      
      // Replace public key with different one
      signature.public_key = Buffer.from(keyPair2.publicKey).toString('hex');
      
      const signedPassport = { ...passport, signature };
      
      await expect(verifyPassport(signedPassport)).rejects.toThrow('Key ID does not match public key');
    });

    it('should throw error when no signature present', async () => {
      const passport = {
        version: '0.1',
        artifact: {
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          mime: 'text/plain',
          created_at: '2024-01-15T14:30:00.000Z'
        }
      };

      await expect(verifyPassport(passport)).rejects.toThrow('No signature found in passport');
    });

    it('should produce identical signatures for same passport with different key orders (RFC 8785 JCS)', async () => {
      const keyPair = generateKeyPair();
      
      // Same passport data in different key orders
      const passport1 = {
        version: '0.1',
        artifact: {
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          mime: 'text/plain',
          created_at: '2024-01-15T14:30:00.000Z',
          hash_binding: 'bytes',
          byte_size: 0
        }
      };
      
      const passport2 = {
        artifact: {
          created_at: '2024-01-15T14:30:00.000Z',
          mime: 'text/plain',
          hash_binding: 'bytes',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          byte_size: 0
        },
        version: '0.1'
      };
      
      const passport3 = {
        version: '0.1',
        artifact: {
          byte_size: 0,
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          created_at: '2024-01-15T14:30:00.000Z',
          mime: 'text/plain',
          hash_binding: 'bytes'
        }
      };

      const signature1 = await signPassport(passport1, keyPair.privateKey);
      const signature2 = await signPassport(passport2, keyPair.privateKey);
      const signature3 = await signPassport(passport3, keyPair.privateKey);
      
      // All signatures should be identical due to JCS canonicalization
      expect(signature1.signature).toBe(signature2.signature);
      expect(signature2.signature).toBe(signature3.signature);
      expect(signature1.public_key).toBe(signature2.public_key);
      expect(signature1.key_id).toBe(signature2.key_id);
      
      // All signed passports should verify successfully
      const signedPassport1 = { ...passport1, signature: signature1 };
      const signedPassport2 = { ...passport2, signature: signature2 };
      const signedPassport3 = { ...passport3, signature: signature3 };
      
      expect(await verifyPassport(signedPassport1)).toBe(true);
      expect(await verifyPassport(signedPassport2)).toBe(true);
      expect(await verifyPassport(signedPassport3)).toBe(true);
    });
  });
});