export function parseContentDispositionFilename(header?: string, fallback = 'deaddrop_file'): string {
  if (!header) {
    return fallback;
  }

  const rfc5987 = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (rfc5987?.[1]) {
    try {
      return decodeURIComponent(rfc5987[1].replace(/['"]/g, '').trim());
    } catch {
      return rfc5987[1].replace(/['"]/g, '').trim();
    }
  }

  const basic = /filename="?([^";]+)"?/i.exec(header);
  if (basic?.[1]) {
    return basic[1].trim();
  }

  return fallback;
}
