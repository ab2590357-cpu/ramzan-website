import { head, put } from '@vercel/blob';

const pathname = 'rafay/config/site-data.json';
const force = process.argv.includes('--force');

let exists = false;
try {
  await head(pathname);
  exists = true;
} catch (error) {
  const status = Number(error?.status);
  if (status !== 404) throw error;
}

if (exists && !force) {
  console.error(`${pathname} already exists. Re-run with --force to overwrite it.`);
  process.exit(1);
}

const now = new Date().toISOString();
const seed = {
  brandName: 'RAFAY', whatsappNumber: '', publicContact: 'Private booking requests are reviewed before confirmation.',
  defaultPaymentNote: 'Payment details are shared only after booking review and confirmation.',
  hero: { eyebrow: 'PRIVATE APPEARANCES · 18+', heading: 'Choose the presence. Own the moment.', body: 'A discreet premium booking experience for lawful adult social events, hosting and creator appearances.', primaryCta: 'Start private booking', secondaryCta: 'Explore profiles' },
  trustCards: [], howItWorks: [], footer: 'RAFAY',
  legalNotice: '18+ only. No sexual services are offered or facilitated.',
  bookingOptions: { venueTypes: [], occasions: [], durations: [], addOns: [], cities: [], allowFreeTextCity: true },
  paymentMethods: [], socialLinks: { instagram: '', facebook: '', tiktok: '' }, profiles: [], packages: [], updatedAt: now, version: 1
};

await put(pathname, JSON.stringify(seed), {
  access: 'public', addRandomSuffix: false, allowOverwrite: force, contentType: 'application/json'
});
console.log(`Seeded ${pathname}.`);
