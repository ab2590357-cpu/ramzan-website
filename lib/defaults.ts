import type { Package, Profile, SiteData } from './domain';

const stamp = '2026-09-10T00:00:00.000Z';

const profile = (id: string, name: string, label: string, tags: string[], displayOrder: number): Profile => ({
  id,
  name,
  label,
  bio: 'Polished adult event presence for lawful social occasions and creator appearances.',
  tags,
  images: [],
  coverImageUrl: '',
  active: true,
  adultConfirmed: true,
  displayOrder,
  availabilityNote: 'Availability confirmed after request.',
  createdAt: stamp,
  updatedAt: stamp
});

const packageItem = (id: string, name: string, description: string, priceLabel: string, displayOrder: number): Package => ({
  id,
  name,
  description,
  priceLabel,
  durationNote: 'Duration selected during booking',
  active: true,
  displayOrder
});

export const DEFAULT_SITE_DATA: SiteData = {
  brandName: 'RAFAY',
  whatsappNumber: '',
  publicContact: 'Private booking requests are reviewed before confirmation.',
  defaultPaymentNote: 'Payment details are shared only after booking review and confirmation.',
  hero: {
    eyebrow: 'PRIVATE APPEARANCES · 18+',
    heading: 'Choose the presence. Own the moment.',
    body: 'A discreet premium booking experience for lawful adult social events, hosting and creator appearances.',
    primaryCta: 'Start private booking',
    secondaryCta: 'Explore profiles'
  },
  trustCards: [
    { id: 'discreet', title: 'Discreet by design', text: 'Requests are handled privately with clear expectations before confirmation.' },
    { id: 'adult', title: 'Adults only', text: 'All listed talent is confirmed 18+ and every booking is for lawful adult social use.' },
    { id: 'boundaries', title: 'Respect first', text: 'Consent, boundaries and local law apply to every appearance.' }
  ],
  howItWorks: [
    { id: 'choose', title: 'Choose', text: 'Pick a profile and appearance package that fits your event.' },
    { id: 'shape', title: 'Shape the request', text: 'Set the date, place, occasion, duration and preferences.' },
    { id: 'confirm', title: 'Confirm privately', text: 'Review the request and continue to WhatsApp for final coordination.' }
  ],
  footer: 'RAFAY — premium adult event companionship, hosting and creator appearances.',
  legalNotice: '18+ only. RAFAY facilitates lawful social event companionship, event hosting and creator appearances. No sexual services are offered or facilitated.',
  bookingOptions: {
    venueTypes: ['Restaurant / dinner', 'Private event venue', 'Public event', 'Brand / creator set', 'Other lawful venue'],
    occasions: ['Dinner / social', 'Birthday / celebration', 'Wedding guest', 'Brand event', 'Photo / content', 'Other lawful event'],
    durations: ['1 hour', '2 hours', '3 hours', 'Half day', 'Full day', 'Custom'],
    addOns: ['Style coordination', 'Arrival planning', 'Photo-ready look', 'Priority slot', 'No add-on'],
    cities: [],
    allowFreeTextCity: true
  },
  paymentMethods: [
    { id: 'bank', name: 'Bank transfer', instruction: 'Details shared after confirmation.', active: true, displayOrder: 0 },
    { id: 'wallet', name: 'EasyPaisa / JazzCash', instruction: 'Details shared after confirmation.', active: true, displayOrder: 1 },
    { id: 'after-confirmation', name: 'Pay after confirmation', instruction: 'Coordinate payment after the request is approved.', active: true, displayOrder: 2 }
  ],
  socialLinks: { instagram: '', facebook: '', tiktok: '' },
  profiles: [
    profile('rafay', 'Rafay', 'Confident · fashion-forward', ['social', 'fashion'], 0),
    profile('amir', 'Amir', 'Calm · elegant', ['dinner', 'events'], 1),
    profile('zayn', 'Zayn', 'Creative · camera-ready', ['creator', 'energy'], 2),
    profile('ray', 'Ray', 'Minimal · polished', ['professional', 'events'], 3),
    profile('leo', 'Leo', 'Friendly · celebration-ready', ['social', 'celebration'], 4),
    profile('noah', 'Noah', 'Smart · relaxed', ['conversation', 'social'], 5)
  ],
  packages: [
    packageItem('social', 'Social Appearance', 'Dinners, celebrations and public social events.', 'From PKR 15,000', 0),
    packageItem('creator', 'Creator Appearance', 'Shoots, branded content and creator collaborations.', 'From PKR 25,000', 1),
    packageItem('vip-host', 'VIP Event Host', 'Premium event presence with priority scheduling.', 'From PKR 40,000', 2)
  ],
  updatedAt: stamp,
  version: 1
};
