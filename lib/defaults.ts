import type { Package, Profile, SiteData } from './domain';

const stamp = '2026-09-10T00:00:00.000Z';

const profile = (id: string, name: string, label: string, tags: string[], displayOrder: number): Profile => ({ id, name, label, bio: 'Glamorous adult event presence for dinners, nightlife events, celebrations and creator appearances.', tags, images: [], coverImageUrl: '', active: true, adultConfirmed: true, displayOrder, availabilityNote: 'Availability confirmed after request.', createdAt: stamp, updatedAt: stamp });
const packageItem = (id: string, name: string, description: string, priceLabel: string, displayOrder: number): Package => ({ id, name, description, priceLabel, durationNote: 'Duration selected during booking', active: true, displayOrder });

export const DEFAULT_SITE_DATA: SiteData = {
  brandName: 'RAFAY',
  whatsappNumber: '',
  publicContact: 'Private booking requests are reviewed before confirmation.',
  defaultPaymentNote: 'Payment details are shared only after booking review and confirmation.',
  hero: {
    eyebrow: 'RAFAY AFTER DARK · 18+',
    heading: 'Private nights. Polished presence.',
    body: 'A dark-luxury booking experience for lawful adult social events, nightlife appearances, celebrations and creator bookings.',
    primaryCta: 'Start private booking',
    secondaryCta: 'Explore profiles'
  },
  trustCards: [
    { id: 'discreet', title: 'Discreet by design', text: 'Requests are handled privately with clear expectations before confirmation.' },
    { id: 'adult', title: 'Adults only', text: 'Every listed profile is confirmed 18+ and every booking is for lawful adult social use.' },
    { id: 'boundaries', title: 'Respect first', text: 'Consent, boundaries and local law apply to every appearance.' }
  ],
  howItWorks: [
    { id: 'choose', title: 'Choose the profile', text: 'Pick the adult profile and appearance format that fits your event.' },
    { id: 'shape', title: 'Shape the request', text: 'Set the date, venue, occasion, duration and preferences privately.' },
    { id: 'confirm', title: 'Continue to WhatsApp', text: 'Review the request and move to WhatsApp for final coordination.' }
  ],
  footer: 'RAFAY — dark-luxury adult event appearances, nightlife hosting and creator bookings.',
  legalNotice: '18+ only. RAFAY facilitates lawful social event appearances, nightlife hosting and creator bookings. No sexual services are offered or facilitated.',
  bookingOptions: {
    venueTypes: ['Restaurant / dinner', 'Nightlife / lounge event', 'Private event venue', 'Public event', 'Brand / creator set', 'Other lawful venue'],
    occasions: ['Dinner / social', 'Birthday / celebration', 'Nightlife event', 'Wedding guest', 'Brand event', 'Photo / content', 'Other lawful event'],
    durations: ['1 hour', '2 hours', '3 hours', 'Half day', 'Full day', 'Custom'],
    addOns: ['Style coordination', 'Arrival planning', 'Photo-ready look', 'Priority slot', 'No add-on'],
    cities: [], allowFreeTextCity: true
  },
  paymentMethods: [
    { id: 'bank', name: 'Bank transfer', instruction: 'Details shared after confirmation.', active: true, displayOrder: 0 },
    { id: 'wallet', name: 'EasyPaisa / JazzCash', instruction: 'Details shared after confirmation.', active: true, displayOrder: 1 },
    { id: 'after-confirmation', name: 'Pay after confirmation', instruction: 'Coordinate payment after the request is approved.', active: true, displayOrder: 2 }
  ],
  socialLinks: { instagram: '', facebook: '', tiktok: '' },
  profiles: [
    profile('ariana', 'Ariana', 'Bold · nightlife-ready', ['nightlife', 'social', 'fashion'], 0),
    profile('sophie', 'Sophie', 'Elegant · celebration-ready', ['dinner', 'events', 'style'], 1),
    profile('luna', 'Luna', 'Creative · camera-ready', ['creator', 'fashion', 'energy'], 2),
    profile('maya', 'Maya', 'Polished · premium presence', ['events', 'dinner', 'social'], 3),
    profile('zara', 'Zara', 'Confident · after-dark', ['nightlife', 'celebration', 'social'], 4),
    profile('noor', 'Noor', 'Refined · social-ready', ['events', 'style', 'conversation'], 5)
  ],
  packages: [
    packageItem('social', 'Social Appearance', 'Dinners, celebrations and premium social events.', 'From PKR 15,000', 0),
    packageItem('nightlife', 'Nightlife Appearance', 'Lounges, launches and evening events with polished adult presence.', 'From PKR 20,000', 1),
    packageItem('creator', 'Creator Appearance', 'Shoots, branded content and creator collaborations.', 'From PKR 25,000', 2)
  ],
  updatedAt: stamp,
  version: 1
};
