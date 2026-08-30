import fs from 'fs';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export const validateFileMagicBytes = (filePath: string, claimedMimeType: string): ValidationResult => {
  if (!fs.existsSync(filePath)) {
    return { valid: false, message: 'File not found on disk' };
  }

  const fileStats = fs.statSync(filePath);
  if (fileStats.size === 0) {
    return { valid: true };
  }

  const bufferSize = Math.min(4096, fileStats.size);
  const buffer = Buffer.alloc(bufferSize);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, bufferSize, 0);
  fs.closeSync(fd);

  // Check 1: Reject Windows PE executables (MZ header)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { valid: false, message: 'Executable binary content rejected' };
  }

  // Check 2: Reject Linux ELF binaries (.ELF)
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { valid: false, message: 'ELF binary content rejected' };
  }

  // Check 3: Check for embedded script execution headers (PHP / shell scripts)
  const sampleString = buffer.toString('utf-8');
  if (sampleString.includes('<?php') || sampleString.startsWith('#!/bin/') || sampleString.startsWith('#!/usr/bin/')) {
    return { valid: false, message: 'Script payload rejected' };
  }

  // Check 4: Enforce claimed MIME type signatures
  const normalizedMime = claimedMimeType.toLowerCase().trim();

  if (normalizedMime === 'image/jpeg' || normalizedMime === 'image/jpg') {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { valid: false, message: 'File magic bytes do not match JPEG format' };
    }
  } else if (normalizedMime === 'image/png') {
    if (
      buffer.length < 8 ||
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47 ||
      buffer[4] !== 0x0d ||
      buffer[5] !== 0x0a ||
      buffer[6] !== 0x1a ||
      buffer[7] !== 0x0a
    ) {
      return { valid: false, message: 'File magic bytes do not match PNG format' };
    }
  } else if (normalizedMime === 'application/pdf') {
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x25 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x44 ||
      buffer[3] !== 0x46
    ) {
      return { valid: false, message: 'File magic bytes do not match PDF format' };
    }
  } else if (normalizedMime === 'application/zip') {
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      (buffer[2] !== 0x03 && buffer[2] !== 0x05 && buffer[2] !== 0x07)
    ) {
      return { valid: false, message: 'File magic bytes do not match ZIP format' };
    }
  } else if (normalizedMime === 'text/plain') {
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      if (byte === 0x00) {
        return { valid: false, message: 'Binary content detected in text file' };
      }
    }
  }

  return { valid: true };
};
