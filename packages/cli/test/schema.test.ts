import { describe, it, expect } from 'vitest';
import { validatePassport, validatePassportThrow } from '../src/lib/schema.js';

describe('schema validation', () => {
  const validPassport = {
    version: '0.1',
    artifact: {
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      mime: 'application/pdf',
      created_at: '2024-01-15T14:30:00.000Z',
      hash_binding: 'bytes',
      byte_size: 123456
    },
    signature: {
      algo: 'ed25519',
      public_key: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
      signature: '1a2b3c4d5e6f78901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012',
      key_id: 'ppk_8f2c91a3d4e5f678'
    }
  };

  describe('validatePassport', () => {
    it('should validate correct passport', () => {
      const result = validatePassport(validPassport);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject passport with missing version', () => {
      const invalid = { ...validPassport };
      delete (invalid as any).version;
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('version');
    });

    it('should reject passport with wrong version', () => {
      const invalid = { ...validPassport, version: '0.2' };
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject passport with missing artifact', () => {
      const invalid = { ...validPassport };
      delete (invalid as any).artifact;
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('artifact');
    });

    it('should reject passport with invalid SHA256', () => {
      const invalid = {
        ...validPassport,
        artifact: {
          ...validPassport.artifact,
          sha256: 'invalid_hash'
        }
      };
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject passport with invalid MIME type', () => {
      const invalid = {
        ...validPassport,
        artifact: {
          ...validPassport.artifact,
          mime: 'INVALID/TYPE'
        }
      };
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject passport with invalid date format', () => {
      const invalid = {
        ...validPassport,
        artifact: {
          ...validPassport.artifact,
          created_at: 'not-a-date'
        }
      };
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject passport with missing signature', () => {
      const invalid = { ...validPassport };
      delete (invalid as any).signature;
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('signature');
    });

    it('should reject passport with invalid signature algorithm', () => {
      const invalid = {
        ...validPassport,
        signature: {
          ...validPassport.signature,
          algo: 'rsa' as any
        }
      };
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject passport with invalid public key format', () => {
      const invalid = {
        ...validPassport,
        signature: {
          ...validPassport.signature,
          public_key: 'invalid_key'
        }
      };
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject passport with invalid signature format', () => {
      const invalid = {
        ...validPassport,
        signature: {
          ...validPassport.signature,
          signature: 'invalid_signature'
        }
      };
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should accept passport with valid optional fields', () => {
      const withOptional = {
        ...validPassport,
        inputs: [
          {
            type: 'source',
            sha256: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
            name: 'input.txt',
            role: 'template'
          }
        ],
        steps: [
          {
            action: 'convert',
            tool: 'pandoc',
            started_at: '2024-01-15T14:27:45.000Z',
            ended_at: '2024-01-15T14:28:00.000Z'
          }
        ],
        policy_checks: [
          {
            policy: 'pii-scan',
            result: 'pass',
            timestamp: '2024-01-15T14:30:00.000Z'
          }
        ]
      };
      
      const result = validatePassport(withOptional);
      expect(result.valid).toBe(true);
    });

    it('should reject passport with invalid hash_binding', () => {
      const invalid = {
        ...validPassport,
        artifact: {
          ...validPassport.artifact,
          hash_binding: 'invalid' as any
        }
      };
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject passport with negative byte_size', () => {
      const invalid = {
        ...validPassport,
        artifact: {
          ...validPassport.artifact,
          byte_size: -1
        }
      };
      
      const result = validatePassport(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validatePassportThrow', () => {
    it('should not throw for valid passport', () => {
      expect(() => validatePassportThrow(validPassport)).not.toThrow();
    });

    it('should throw for invalid passport', () => {
      const invalid = { ...validPassport };
      delete (invalid as any).version;
      
      expect(() => validatePassportThrow(invalid)).toThrow('Passport validation failed');
    });
  });
});