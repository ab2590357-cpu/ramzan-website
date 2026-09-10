export function safeFileName(value: string): string {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return cleaned || 'file';
}

export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, '');
}
