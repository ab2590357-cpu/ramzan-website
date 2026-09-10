const DEFAULT_PUBLIC_MESSAGE = 'Hi RAFAY, I would like to make a private booking inquiry.';

export function buildPublicWhatsAppUrl(number: string, message = DEFAULT_PUBLIC_MESSAGE): string | null {
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
