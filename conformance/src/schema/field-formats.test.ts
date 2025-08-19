import { describe, it, expect } from 'vitest';
import { validatePassportStrict, createMinimalPassport } from '../utils/validation';

describe('Field Format Validation', () => {
  describe('SHA-256 hash format', () => {
    it('should accept valid 64-character hex hash', () => {
      const passport = createMinimalPassport({
        artifact: {
          sha256: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(true);
    });

    it('should reject hash that is too short', () => {
      const passport = createMinimalPassport({
        artifact: {
          sha256: 'a1b2c3d4e5f67890'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('artifact.sha256 must be exactly 64 hexadecimal characters');
    });

    it('should reject hash that is too long', () => {
      const passport = createMinimalPassport({
        artifact: {
          sha256: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('artifact.sha256 must be exactly 64 hexadecimal characters');
    });

    it('should reject non-hex characters', () => {
      const passport = createMinimalPassport({
        artifact: {
          sha256: 'g1h2i3j4k5l67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('artifact.sha256 must be exactly 64 hexadecimal characters');
    });

    it('should accept uppercase hex characters', () => {
      const passport = createMinimalPassport({
        artifact: {
          sha256: 'A1B2C3D4E5F67890A1B2C3D4E5F67890A1B2C3D4E5F67890A1B2C3D4E5F67890'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(true);
    });
  });

  describe('Ed25519 public key format', () => {
    it('should accept valid 64-character hex public key', () => {
      const passport = createMinimalPassport({
        signature: {
          public_key: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(true);
    });

    it('should reject public key that is too short', () => {
      const passport = createMinimalPassport({
        signature: {
          public_key: '1234567890abcdef'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('signature.public_key must be exactly 64 hexadecimal characters');
    });

    it('should reject non-hex characters in public key', () => {
      const passport = createMinimalPassport({
        signature: {
          public_key: 'gggggggg90abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('signature.public_key must be exactly 64 hexadecimal characters');
    });
  });

  describe('Ed25519 signature format', () => {
    it('should accept valid 128-character hex signature', () => {
      const passport = createMinimalPassport({
        signature: {
          signature: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(true);
    });

    it('should reject signature that is too short', () => {
      const passport = createMinimalPassport({
        signature: {
          signature: 'abcdef1234567890abcdef1234567890'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('signature.signature must be exactly 128 hexadecimal characters');
    });

    it('should reject signature with non-hex characters', () => {
      const passport = createMinimalPassport({
        signature: {
          signature: 'xxxxxxx1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('signature.signature must be exactly 128 hexadecimal characters');
    });
  });

  describe('ISO8601 timestamp format', () => {
    it('should accept valid UTC timestamp', () => {
      const passport = createMinimalPassport({
        artifact: {
          created_at: '2024-08-19T15:30:45.123Z'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(true);
    });

    it('should accept timestamp without milliseconds', () => {
      const passport = createMinimalPassport({
        artifact: {
          created_at: '2024-08-19T15:30:45Z'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(true);
    });

    it('should reject non-UTC timestamp', () => {
      const passport = createMinimalPassport({
        artifact: {
          created_at: '2024-08-19T15:30:45+02:00'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('artifact.created_at must be in UTC (end with Z)');
    });

    it('should reject invalid timestamp format', () => {
      const passport = createMinimalPassport({
        artifact: {
          created_at: '2024-13-45T25:70:90Z'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('artifact.created_at must be a valid ISO8601 timestamp');
    });

    it('should reject completely invalid timestamp', () => {
      const passport = createMinimalPassport({
        artifact: {
          created_at: 'not-a-timestamp'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('artifact.created_at must be a valid ISO8601 timestamp');
    });
  });

  describe('MIME type validation', () => {
    it('should accept valid MIME types', () => {
      const validMimeTypes = [
        'text/plain',
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/json',
        'video/mp4',
        'audio/mpeg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      for (const mime of validMimeTypes) {
        const passport = createMinimalPassport({
          artifact: { mime }
        });
        
        const result = validatePassportStrict(passport);
        expect(result.valid).toBe(true, `Failed for MIME type: ${mime}`);
      }
    });

    it('should accept custom MIME types', () => {
      const passport = createMinimalPassport({
        artifact: {
          mime: 'application/x-custom-type'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(true);
    });
  });

  describe('Algorithm validation', () => {
    it('should accept ed25519 algorithm', () => {
      const passport = createMinimalPassport({
        signature: {
          algo: 'ed25519'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(true);
    });

    it('should reject other algorithms', () => {
      const passport = createMinimalPassport({
        signature: {
          algo: 'rsa'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('signature.algo must be exactly "ed25519"');
    });

    it('should reject uppercase algorithm', () => {
      const passport = createMinimalPassport({
        signature: {
          algo: 'Ed25519'
        }
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('signature.algo must be exactly "ed25519"');
    });
  });

  describe('Version validation', () => {
    it('should accept version 0.1', () => {
      const passport = createMinimalPassport({
        version: '0.1'
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(true);
    });

    it('should reject other versions', () => {
      const passport = createMinimalPassport({
        version: '1.0'
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('version must be exactly "0.1"');
    });

    it('should reject numeric version', () => {
      const passport = createMinimalPassport({
        version: 0.1
      });
      
      const result = validatePassportStrict(passport);
      expect(result.valid).toBe(false);
    });
  });
});