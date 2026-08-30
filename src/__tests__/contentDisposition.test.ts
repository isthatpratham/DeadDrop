import { describe, it, expect } from 'vitest';
import { formatContentDisposition } from '../utils/disposition.js';

describe('Safe Content-Disposition Header Generation', () => {
  it('should format normal filenames correctly', () => {
    const header = formatContentDisposition('report.pdf');
    expect(header).toMatch(/^attachment;\s*filename="?report\.pdf"?$/);
  });

  it('should safely handle filenames containing spaces', () => {
    const header = formatContentDisposition('my report document.pdf');
    expect(header).toBe('attachment; filename="my report document.pdf"');
  });

  it('should safely escape filenames containing quotes', () => {
    const header = formatContentDisposition('my "special" file.pdf');
    expect(header).toContain('filename=');
    expect(header).not.toContain('header: injected');
  });

  it('should handle Unicode filenames with RFC 5987 syntax', () => {
    const header = formatContentDisposition('Résumé_日本語.pdf');
    expect(header).toContain("filename*=");
  });

  it('should strip/sanitize newline and control characters to prevent header injection', () => {
    const header = formatContentDisposition('evil.txt\r\nSet-Cookie: session=bad');
    expect(header).not.toContain('\r');
    expect(header).not.toContain('\n');
  });
});
