import { z } from 'zod';

const shortText = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const BookingStatusSchema = z.enum(['Pending', 'Contacted', 'Confirmed', 'Completed', 'Cancelled']);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const ProfileSchema = z.object({
  id: requiredText(120),
  name: requiredText(80),
  label: shortText(80),
  bio: shortText(1200),
  tags: z.array(shortText(40)).max(12),
  images: z.array(z.string().url()).max(12),
  coverImageUrl: z.string().url().or(z.literal('')),
  active: z.boolean(),
  adultConfirmed: z.boolean(),
  displayOrder: z.number().int().min(0),
  availabilityNote: shortText(300),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Profile = z.infer<typeof ProfileSchema>;

export const PackageSchema = z.object({
  id: requiredText(120),
  name: requiredText(100),
  description: shortText(800),
  priceLabel: shortText(100),
  durationNote: shortText(160),
  active: z.boolean(),
  displayOrder: z.number().int().min(0)
});
export type Package = z.infer<typeof PackageSchema>;

export const PaymentMethodSchema = z.object({
  id: requiredText(120),
  name: requiredText(80),
  instruction: shortText(500),
  active: z.boolean(),
  displayOrder: z.number().int().min(0)
});
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const BookingOptionsSchema = z.object({
  venueTypes: z.array(requiredText(80)).max(40),
  occasions: z.array(requiredText(80)).max(40),
  durations: z.array(requiredText(80)).max(40),
  addOns: z.array(requiredText(100)).max(40),
  cities: z.array(requiredText(100)).max(100),
  allowFreeTextCity: z.boolean()
});
export type BookingOptions = z.infer<typeof BookingOptionsSchema>;

export const HeroContentSchema = z.object({
  eyebrow: shortText(100),
  heading: requiredText(180),
  body: shortText(900),
  primaryCta: requiredText(60),
  secondaryCta: shortText(60)
});

const InfoCardSchema = z.object({
  id: requiredText(120),
  title: requiredText(100),
  text: shortText(500)
});

export const SiteDataSchema = z.object({
  brandName: z.literal('RAFAY'),
  whatsappNumber: shortText(30),
  publicContact: shortText(160),
  defaultPaymentNote: shortText(500),
  hero: HeroContentSchema,
  trustCards: z.array(InfoCardSchema).max(8),
  howItWorks: z.array(InfoCardSchema).max(8),
  footer: shortText(600),
  legalNotice: shortText(1200),
  bookingOptions: BookingOptionsSchema,
  paymentMethods: z.array(PaymentMethodSchema).max(20),
  socialLinks: z.object({
    instagram: z.string().url().or(z.literal('')),
    facebook: z.string().url().or(z.literal('')),
    tiktok: z.string().url().or(z.literal(''))
  }),
  profiles: z.array(ProfileSchema).max(200),
  packages: z.array(PackageSchema).max(100),
  updatedAt: z.string().datetime(),
  version: z.number().int().min(1)
});
export type SiteData = z.infer<typeof SiteDataSchema>;

export const BookingInputSchema = z.object({
  profileId: requiredText(120),
  packageId: requiredText(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  city: requiredText(100),
  venueType: requiredText(100),
  occasion: requiredText(100),
  duration: requiredText(100),
  addOn: shortText(120),
  paymentPreference: requiredText(100),
  customerName: requiredText(100),
  customerPhone: z.string().trim().min(7).max(30).regex(/^[+\d][\d\s()+-]+$/),
  notes: shortText(1000),
  lawfulUseConfirmed: z.literal(true)
});
export type BookingInput = z.infer<typeof BookingInputSchema>;

export const BookingRequestSchema = BookingInputSchema.extend({
  id: requiredText(120),
  reference: requiredText(80),
  profileNameSnapshot: requiredText(100),
  packageNameSnapshot: requiredText(120),
  status: BookingStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type BookingRequest = z.infer<typeof BookingRequestSchema>;
