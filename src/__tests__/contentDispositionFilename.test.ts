import { describe, it, expect } from 'vitest';
import { parseContentDispositionFilename } from '../../frontend/src/utils/contentDisposition.ts';

describe('parseContentDispositionFilename', () => {
  it('reads a basic filename parameter', () => {
    expect(parseContentDispositionFilename('attachment; filename="report.pdf"')).toBe('report.pdf');
  });

  it('prefers RFC 5987 filename*', () => {
    expect(parseContentDispositionFilename("attachment; filename=\"fallback.txt\"; filename*=UTF-8''R%C3%A9sum%C3%A9.txt")).toBe('Résumé.txt');
  });

  it('returns the fallback when the header is missing', () => {
    expect(parseContentDispositionFilename(undefined, 'deaddrop_file')).toBe('deaddrop_file');
  });
});
