import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getUploadDir } from '../../backend/database/sqlite-setup.js';
import { validateFileMagicBytes } from '../utils/fileValidation.js';

const testDir = path.join(getUploadDir(), 'fixtures-validation');

describe('Magic-Byte & File Validation Security', () => {
  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch {
        // Ignore cleanup error if Windows locks dir
      }
    }
  });

  it('should validate legitimate JPEG file header', () => {
    const filePath = path.join(testDir, 'test.jpg');
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    fs.writeFileSync(filePath, jpegBuffer);

    const result = validateFileMagicBytes(filePath, 'image/jpeg');
    expect(result.valid).toBe(true);
  });

  it('should validate legitimate PNG file header', () => {
    const filePath = path.join(testDir, 'test.png');
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    fs.writeFileSync(filePath, pngBuffer);

    const result = validateFileMagicBytes(filePath, 'image/png');
    expect(result.valid).toBe(true);
  });

  it('should validate legitimate PDF header', () => {
    const filePath = path.join(testDir, 'test.pdf');
    fs.writeFileSync(filePath, '%PDF-1.5 test document content');

    const result = validateFileMagicBytes(filePath, 'application/pdf');
    expect(result.valid).toBe(true);
  });

  it('should reject spoofed MIME type (text file uploaded as JPEG)', () => {
    const filePath = path.join(testDir, 'spoofed.jpg');
    fs.writeFileSync(filePath, 'Hello world text content');

    const result = validateFileMagicBytes(filePath, 'image/jpeg');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('JPEG format');
  });

  it('should reject Windows PE executable binaries (.exe renamed as .pdf)', () => {
    const filePath = path.join(testDir, 'malicious.pdf');
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    fs.writeFileSync(filePath, exeBuffer);

    const result = validateFileMagicBytes(filePath, 'application/pdf');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Executable binary content rejected');
  });

  it('should reject PHP script payloads disguised as plain text', () => {
    const filePath = path.join(testDir, 'shell.txt');
    fs.writeFileSync(filePath, '<?php system($_GET["cmd"]); ?>');

    const result = validateFileMagicBytes(filePath, 'text/plain');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Script payload rejected');
  });

  it('should reject binary null bytes in plain text files', () => {
    const filePath = path.join(testDir, 'binary.txt');
    const binaryBuffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x57, 0x6f, 0x72, 0x6c, 0x64]);
    fs.writeFileSync(filePath, binaryBuffer);

    const result = validateFileMagicBytes(filePath, 'text/plain');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Binary content detected');
  });

  it('should accept valid short plain text files', () => {
    const filePath = path.join(testDir, 'short.txt');
    fs.writeFileSync(filePath, 'Hi');

    const result = validateFileMagicBytes(filePath, 'text/plain');
    expect(result.valid).toBe(true);
  });
});
