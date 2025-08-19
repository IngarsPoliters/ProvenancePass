import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validatePassport, validatePassportStrict } from '../utils/validation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testVectorsDir = join(__dirname, '../../test-vectors');

function loadTestVector(category: string, filename: string): any {
  const path = join(testVectorsDir, category, filename);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

function getTestVectorFiles(category: string): string[] {
  const categoryPath = join(testVectorsDir, category);
  try {
    return readdirSync(categoryPath).filter(file => file.endsWith('.json'));
  } catch (e) {
    return [];
  }
}

describe('Test Vector Validation', () => {
  describe('Valid passports', () => {
    const validFiles = getTestVectorFiles('valid');
    
    if (validFiles.length === 0) {
      it('should have valid test vectors', () => {
        expect(validFiles.length).toBeGreaterThan(0);
      });
    }

    validFiles.forEach(filename => {
      it(`should validate ${filename} as valid`, () => {
        const passport = loadTestVector('valid', filename);
        const result = validatePassport(passport);
        
        expect(result.valid).toBe(true, `${filename} should be valid according to JSON Schema`);
        expect(result.errors).toEqual([]);
      });

      it(`should pass strict validation for ${filename}`, () => {
        const passport = loadTestVector('valid', filename);
        const result = validatePassportStrict(passport);
        
        if (!result.valid) {
          console.error(`Strict validation failed for ${filename}:`, result.errors);
        }
        
        expect(result.valid).toBe(true, `${filename} should pass strict validation`);
        expect(result.errors).toBeUndefined();
      });
    });

    it('should validate minimal.json specifically', () => {
      if (validFiles.includes('minimal.json')) {
        const passport = loadTestVector('valid', 'minimal.json');
        
        // Check required fields are present
        expect(passport.version).toBe('0.1');
        expect(passport.artifact).toBeDefined();
        expect(passport.artifact.sha256).toBeDefined();
        expect(passport.artifact.mime).toBeDefined();
        expect(passport.artifact.created_at).toBeDefined();
        expect(passport.signature).toBeDefined();
        expect(passport.signature.algo).toBe('ed25519');
        expect(passport.signature.public_key).toBeDefined();
        expect(passport.signature.signature).toBeDefined();
        
        // Validate formats
        expect(passport.artifact.sha256).toMatch(/^[a-fA-F0-9]{64}$/);
        expect(passport.signature.public_key).toMatch(/^[a-fA-F0-9]{64}$/);
        expect(passport.signature.signature).toMatch(/^[a-fA-F0-9]{128}$/);
        expect(passport.artifact.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
      }
    });

    it('should validate complete.json with all optional fields', () => {
      if (validFiles.includes('complete.json')) {
        const passport = loadTestVector('valid', 'complete.json');
        
        // Check optional fields are properly structured
        expect(passport.artifact.name).toBeDefined();
        expect(passport.artifact.size).toBeTypeOf('number');
        expect(Array.isArray(passport.inputs)).toBe(true);
        expect(Array.isArray(passport.steps)).toBe(true);
        expect(passport.review).toBeDefined();
        expect(Array.isArray(passport.policy_checks)).toBe(true);
        
        // Validate input structure
        if (passport.inputs && passport.inputs.length > 0) {
          const input = passport.inputs[0];
          expect(input.sha256).toMatch(/^[a-fA-F0-9]{64}$/);
          expect(input.name).toBeTypeOf('string');
        }
        
        // Validate step structure
        if (passport.steps && passport.steps.length > 0) {
          const step = passport.steps[0];
          expect(step.command).toBeTypeOf('string');
          expect(step.exit_code).toBeTypeOf('number');
        }
      }
    });
  });

  describe('Invalid passports', () => {
    const invalidFiles = getTestVectorFiles('invalid');
    
    invalidFiles.forEach(filename => {
      it(`should reject ${filename} as invalid`, () => {
        const passport = loadTestVector('invalid', filename);
        const result = validatePassport(passport);
        
        expect(result.valid).toBe(false, `${filename} should be invalid`);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject missing-version.json for missing version field', () => {
      if (invalidFiles.includes('missing-version.json')) {
        const passport = loadTestVector('invalid', 'missing-version.json');
        const result = validatePassport(passport);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: "must have required property 'version'"
            })
          ])
        );
      }
    });

    it('should reject invalid-sha256.json for malformed hash', () => {
      if (invalidFiles.includes('invalid-sha256.json')) {
        const passport = loadTestVector('invalid', 'invalid-sha256.json');
        const result = validatePassportStrict(passport);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('artifact.sha256 must be exactly 64 hexadecimal characters');
      }
    });

    it('should reject wrong-algorithm.json for unsupported algorithm', () => {
      if (invalidFiles.includes('wrong-algorithm.json')) {
        const passport = loadTestVector('invalid', 'wrong-algorithm.json');
        const result = validatePassportStrict(passport);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('signature.algo must be exactly "ed25519"');
      }
    });
  });

  describe('Edge cases', () => {
    const edgeCaseFiles = getTestVectorFiles('edge-cases');
    
    edgeCaseFiles.forEach(filename => {
      it(`should handle edge case ${filename}`, () => {
        const passport = loadTestVector('edge-cases', filename);
        const result = validatePassport(passport);
        
        // Edge cases should still be valid according to schema
        expect(result.valid).toBe(true, `Edge case ${filename} should be valid`);
      });
    });

    it('should handle empty-inputs.json with empty arrays', () => {
      if (edgeCaseFiles.includes('empty-inputs.json')) {
        const passport = loadTestVector('edge-cases', 'empty-inputs.json');
        
        expect(Array.isArray(passport.inputs)).toBe(true);
        expect(passport.inputs.length).toBe(0);
        expect(Array.isArray(passport.steps)).toBe(true);
        expect(passport.steps.length).toBe(0);
        expect(Array.isArray(passport.policy_checks)).toBe(true);
        expect(passport.policy_checks.length).toBe(0);
      }
    });
  });

  describe('Test vector completeness', () => {
    it('should have test vectors for all categories', () => {
      const validFiles = getTestVectorFiles('valid');
      const invalidFiles = getTestVectorFiles('invalid');
      const edgeCaseFiles = getTestVectorFiles('edge-cases');
      
      expect(validFiles.length).toBeGreaterThan(0, 'Should have valid test vectors');
      expect(invalidFiles.length).toBeGreaterThan(0, 'Should have invalid test vectors');
      expect(edgeCaseFiles.length).toBeGreaterThan(0, 'Should have edge case test vectors');
    });

    it('should cover all required field omissions', () => {
      const invalidFiles = getTestVectorFiles('invalid');
      const expectedMissingFields = [
        'missing-version.json',
        // Could add more: 'missing-artifact.json', 'missing-signature.json', etc.
      ];
      
      expectedMissingFields.forEach(expectedFile => {
        if (!invalidFiles.includes(expectedFile)) {
          console.warn(`Missing test vector: ${expectedFile}`);
        }
      });
    });

    it('should cover format validation cases', () => {
      const invalidFiles = getTestVectorFiles('invalid');
      const expectedFormatTests = [
        'invalid-sha256.json',
        'wrong-algorithm.json'
      ];
      
      expectedFormatTests.forEach(expectedFile => {
        expect(invalidFiles).toContain(expectedFile, 
          `Should have format validation test: ${expectedFile}`);
      });
    });

    it('should have comprehensive valid examples', () => {
      const validFiles = getTestVectorFiles('valid');
      const expectedValidTests = [
        'minimal.json',
        'complete.json'
      ];
      
      expectedValidTests.forEach(expectedFile => {
        expect(validFiles).toContain(expectedFile,
          `Should have valid example: ${expectedFile}`);
      });
    });
  });

  describe('Test vector structure validation', () => {
    it('should have properly formatted JSON in all test vectors', () => {
      const categories = ['valid', 'invalid', 'edge-cases'];
      
      categories.forEach(category => {
        const files = getTestVectorFiles(category);
        files.forEach(filename => {
          expect(() => {
            loadTestVector(category, filename);
          }).not.toThrow(`Test vector ${category}/${filename} should be valid JSON`);
        });
      });
    });

    it('should have consistent field naming in test vectors', () => {
      const validFiles = getTestVectorFiles('valid');
      
      validFiles.forEach(filename => {
        const passport = loadTestVector('valid', filename);
        
        // Check for consistent field naming (no camelCase/snake_case mixing)
        if (passport.artifact) {
          expect(passport.artifact).toHaveProperty('created_at'); // snake_case
          if (passport.artifact.name) {
            expect(typeof passport.artifact.name).toBe('string');
          }
        }
        
        if (passport.signature) {
          expect(passport.signature).toHaveProperty('public_key'); // snake_case
        }
      });
    });
  });
});