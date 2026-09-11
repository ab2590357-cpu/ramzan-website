import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { DEFAULT_SITE_DATA } from '@/lib/defaults';
import { PublicHeader } from './public-header';

it('uses bundled RAFAY logo when no custom logo exists', () => {
  const { container } = render(<PublicHeader data={{ ...DEFAULT_SITE_DATA, logoUrl: '' }} />);
  expect(container.querySelector('img')?.getAttribute('src')).toContain('rafay-mark.svg');
});

it('uses admin custom logo and alt text when configured', () => {
  render(<PublicHeader data={{ ...DEFAULT_SITE_DATA, logoUrl: 'https://example.com/logo.webp', logoAlt: 'Custom RAFAY' }} />);
  expect(screen.getByAltText('Custom RAFAY')).toHaveAttribute('src', expect.stringContaining('logo.webp'));
});

it('hides WhatsApp when the configured number is empty', () => {
  render(<PublicHeader data={{ ...DEFAULT_SITE_DATA, whatsappNumber: '' }} />);
  expect(screen.queryByRole('link', { name: /whatsapp/i })).toBeNull();
});

it('links header WhatsApp to the configured admin number', () => {
  render(<PublicHeader data={{ ...DEFAULT_SITE_DATA, whatsappNumber: '+92 300 1234567' }} />);
  const link = screen.getByRole('link', { name: /whatsapp/i });
  expect(link).toHaveAttribute('href', expect.stringContaining('wa.me/923001234567'));
});
