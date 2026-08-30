import * as contentDispositionModule from 'content-disposition';

const cd = (contentDispositionModule as unknown as { default?: typeof contentDispositionModule }).default || contentDispositionModule;

export const formatContentDisposition = (filename: string): string => {
  // Sanitize control characters to prevent header injection
  const cleanFilename = filename.replace(/[\r\n]/g, '_');

  if (typeof cd === 'function') {
    return (cd as (fn: string, opts?: { type?: string }) => string)(cleanFilename, { type: 'attachment' });
  }

  if (cd && typeof cd.format === 'function') {
    return cd.format({
      type: 'attachment',
      parameters: { filename: cleanFilename },
    });
  }

  const sanitized = cleanFilename.replace(/"/g, '\\"');
  const encoded = encodeURIComponent(cleanFilename);
  return `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`;
};
