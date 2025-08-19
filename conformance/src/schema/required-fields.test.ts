import { describe, it, expect } from 'vitest';
import { validatePassport, createMinimalPassport } from '../utils/validation';

describe('Required Fields Validation', () => {
  it('should accept minimal valid passport', () => {
    const passport = createMinimalPassport();
    const result = validatePassport(passport);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  describe('version field', () => {
    it('should require version field', () => {
      const passport = createMinimalPassport();
      delete passport.version;
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '',
            schemaPath: '#/required',
            message: "must have required property 'version'"
          })
        ])
      );
    });

    it('should require version to be string', () => {
      const passport = createMinimalPassport({ version: 1.0 });
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/version',
            message: 'must be string'
          })
        ])
      );
    });

    it('should accept version "0.1"', () => {
      const passport = createMinimalPassport({ version: "0.1" });
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(true);
    });
  });

  describe('artifact field', () => {
    it('should require artifact field', () => {
      const passport = createMinimalPassport();
      delete passport.artifact;
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '',
            message: "must have required property 'artifact'"
          })
        ])
      );
    });

    it('should require artifact.sha256', () => {
      const passport = createMinimalPassport();
      delete passport.artifact.sha256;
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/artifact',
            message: "must have required property 'sha256'"
          })
        ])
      );
    });

    it('should require artifact.mime', () => {
      const passport = createMinimalPassport();
      delete passport.artifact.mime;
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/artifact',
            message: "must have required property 'mime'"
          })
        ])
      );
    });

    it('should require artifact.created_at', () => {
      const passport = createMinimalPassport();
      delete passport.artifact.created_at;
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/artifact',
            message: "must have required property 'created_at'"
          })
        ])
      );
    });
  });

  describe('signature field', () => {
    it('should require signature field', () => {
      const passport = createMinimalPassport();
      delete passport.signature;
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '',
            message: "must have required property 'signature'"
          })
        ])
      );
    });

    it('should require signature.algo', () => {
      const passport = createMinimalPassport();
      delete passport.signature.algo;
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/signature',
            message: "must have required property 'algo'"
          })
        ])
      );
    });

    it('should require signature.public_key', () => {
      const passport = createMinimalPassport();
      delete passport.signature.public_key;
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/signature',
            message: "must have required property 'public_key'"
          })
        ])
      );
    });

    it('should require signature.signature', () => {
      const passport = createMinimalPassport();
      delete passport.signature.signature;
      
      const result = validatePassport(passport);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/signature',
            message: "must have required property 'signature'"
          })
        ])
      );
    });
  });
});