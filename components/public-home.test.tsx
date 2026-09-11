import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { getVisiblePublicData, HeroSection, selectHeroImage } from './sections';
import { DEFAULT_SITE_DATA } from '@/lib/defaults';

it('shows only active adult-confirmed profiles and active packages', () => {
  const data = {
    ...DEFAULT_SITE_DATA,
    profiles: [
      { ...DEFAULT_SITE_DATA.profiles[0], id: 'visible', name: 'Visible', active: true, adultConfirmed: true, displayOrder: 2 },
      { ...DEFAULT_SITE_DATA.profiles[1], id: 'inactive', name: 'Inactive', active: false, adultConfirmed: true, displayOrder: 0 },
      { ...DEFAULT_SITE_DATA.profiles[2], id: 'not-confirmed', name: 'Not Confirmed', active: true, adultConfirmed: false, displayOrder: 1 }
    ],
    packages: [
      { ...DEFAULT_SITE_DATA.packages[0], id: 'visible-package', active: true, displayOrder: 1 },
      { ...DEFAULT_SITE_DATA.packages[1], id: 'hidden-package', active: false, displayOrder: 0 }
    ]
  };

  const visible = getVisiblePublicData(data);
  expect(visible.profiles.map((item) => item.id)).toEqual(['visible']);
  expect(visible.packages.map((item) => item.id)).toEqual(['visible-package']);
});

it('selects desktop hero only for desktop', () => {
  const hero = { ...DEFAULT_SITE_DATA.hero, desktopImageUrl: 'https://example.com/desktop.webp', mobileImageUrl: 'https://example.com/mobile.webp' };
  expect(selectHeroImage(hero, 'desktop')).toBe('https://example.com/desktop.webp');
});

it('prefers mobile hero and falls back to desktop on mobile', () => {
  expect(selectHeroImage({ ...DEFAULT_SITE_DATA.hero, desktopImageUrl: 'https://example.com/desktop.webp', mobileImageUrl: 'https://example.com/mobile.webp' }, 'mobile')).toBe('https://example.com/mobile.webp');
  expect(selectHeroImage({ ...DEFAULT_SITE_DATA.hero, desktopImageUrl: 'https://example.com/desktop.webp', mobileImageUrl: '' }, 'mobile')).toBe('https://example.com/desktop.webp');
});

it('does not use a mobile-only image as the desktop custom hero', () => {
  expect(selectHeroImage({ ...DEFAULT_SITE_DATA.hero, desktopImageUrl: '', mobileImageUrl: 'https://example.com/mobile.webp' }, 'desktop')).toBe('');
});

it('keeps the built-in RAFAY hero visual as fallback when custom media is empty', () => {
  const html = renderToStaticMarkup(<HeroSection data={DEFAULT_SITE_DATA} />);
  expect(html).toContain('RAFAY AFTER DARK');
  expect(html).toContain('rafay-hero.jpg');
  expect(html).toContain('hero-photo');
});

it('hides direct hero WhatsApp when no business number is configured', () => {
  const html = renderToStaticMarkup(<HeroSection data={{ ...DEFAULT_SITE_DATA, whatsappNumber: '' }} />);
  expect(html).not.toContain('wa.me/');
});

it('renders hero WhatsApp using the configured number and CTA label', () => {
  const data = {
    ...DEFAULT_SITE_DATA,
    whatsappNumber: '+92 300 1234567',
    hero: { ...DEFAULT_SITE_DATA.hero, whatsappCta: 'Chat privately' }
  };
  const html = renderToStaticMarkup(<HeroSection data={data} />);
  expect(html).toContain('wa.me/923001234567');
  expect(html).toContain('Chat privately');
});
