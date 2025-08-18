import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { sha256File, sha256String, sha256Buffer, getFileSize } from '../src/lib/hash.js';

const testDir = resolve(__dirname, 'temp');
const testFile = resolve(testDir, 'test.txt');

describe('hash utilities', () => {
  beforeEach(() => {
    try {
      mkdirSync(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('sha256String', () => {
    it('should hash strings correctly', () => {
      const input = 'hello world';
      const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      expect(sha256String(input)).toBe(expected);
    });

    it('should handle empty strings', () => {
      const input = '';
      const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      expect(sha256String(input)).toBe(expected);
    });

    it('should handle unicode characters', () => {
      const input = 'hello 世界';
      expect(sha256String(input)).toHaveLength(64);
      expect(sha256String(input)).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('sha256Buffer', () => {
    it('should hash buffers correctly', () => {
      const input = Buffer.from('hello world', 'utf8');
      const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      expect(sha256Buffer(input)).toBe(expected);
    });

    it('should handle empty buffers', () => {
      const input = Buffer.alloc(0);
      const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      expect(sha256Buffer(input)).toBe(expected);
    });
  });

  describe('sha256File', () => {
    it('should hash files correctly', async () => {
      const content = 'hello world';
      writeFileSync(testFile, content);
      
      const hash = await sha256File(testFile);
      const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      expect(hash).toBe(expected);
    });

    it('should handle empty files', async () => {
      writeFileSync(testFile, '');
      
      const hash = await sha256File(testFile);
      const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      expect(hash).toBe(expected);
    });

    it('should handle large files', async () => {
      const content = 'a'.repeat(10000);
      writeFileSync(testFile, content);
      
      const hash = await sha256File(testFile);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should throw error for non-existent files', async () => {
      await expect(sha256File('/nonexistent/file.txt')).rejects.toThrow();
    });
  });

  describe('getFileSize', () => {
    it('should return correct file size', async () => {
      const content = 'hello world';
      writeFileSync(testFile, content);
      
      const size = await getFileSize(testFile);
      expect(size).toBe(11); // "hello world" is 11 bytes
    });

    it('should return 0 for empty files', async () => {
      writeFileSync(testFile, '');
      
      const size = await getFileSize(testFile);
      expect(size).toBe(0);
    });

    it('should throw error for non-existent files', async () => {
      await expect(getFileSize('/nonexistent/file.txt')).rejects.toThrow();
    });
  });
});