import Link from 'next/link';
import type { Package, Profile, SiteData } from '@/lib/domain';
import { buildPublicWhatsAppUrl } from '@/lib/public-whatsapp';
import { ProfileCard } from './profile-card';

export function getVisiblePublicData(data: SiteData): { profiles: Profile[]; packages: Package[] } {
  return {
    profiles: data.profiles.filter((profile) => profile.active && profile.adultConfirmed).sort((a, b) => a.displayOrder - b.displayOrder),
    packages: data.packages.filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder)
  };
}

export function selectHeroImage(hero: SiteData['hero'], viewport: 'desktop' | 'mobile'): string {
  if (viewport === 'desktop') return hero.desktopImageUrl.trim();
  return hero.mobileImageUrl.trim() || hero.desktopImageUrl.trim();
}

export function HeroSection({ data }: { data: SiteData }) {
  const desktopCustomImage = selectHeroImage(data.hero, 'desktop');
  const mobileCustomImage = selectHeroImage(data.hero, 'mobile');
  const desktopImage = desktopCustomImage || '/rafay-hero.jpg';
  const mobileImage = mobileCustomImage || desktopImage;
  const whatsappUrl = buildPublicWhatsAppUrl(data.whatsappNumber);
  const heroAlt = data.hero.imageAlt.trim() || 'Glamorous adult RAFAY nightlife profile';

  return (
    <section className="hero-public">
      <div className="hero-glow hero-glow--one" /><div className="hero-glow hero-glow--two" />
      <div className="rafay-container hero-grid">
        <div className="hero-copy">
          <div className="hero-brand-line"><span className="rafay-kicker">RAFAY AFTER DARK</span><span className="adult-pill">18+ ADULTS ONLY</span></div>
          <h1 className="rafay-display hero-title">{data.hero.heading}</h1>
          <p>{data.hero.body}</p>
          <div className="hero-actions">
            <Link href="/booking" className="rafay-button rafay-button--primary">{data.hero.primaryCta}</Link>
            {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rafay-button rafay-button--whatsapp">{data.hero.whatsappCta || 'WhatsApp'}</a>}
          </div>
          <div className="hero-proof"><span>Verified adult profiles</span><span>Private requests</span><span>Discreet coordination</span><span>Event ready</span></div>
        </div>
        <div className="hero-art hero-art--media">
          <picture className="hero-picture">
            <source media="(max-width: 700px)" srcSet={mobileImage} />
            <img src={desktopImage} alt={heroAlt} className="hero-photo hero-photo--responsive" />
          </picture>
          <div className="hero-art-shade" />
          <div className="hero-monogram" aria-hidden="true">R</div>
          <div className="hero-floating-card"><span>RAFAY EXCLUSIVE</span><strong>Private event presence</strong><small>Social nights · launches · celebrations</small></div>
        </div>
      </div>
      <div className="brand-rail"><div><strong>18+</strong><span>Adult profiles only</span></div><div><strong>PRIVATE</strong><span>Discreet requests</span></div><div><strong>CURATED</strong><span>Premium event presence</span></div><div><strong>AFTER DARK</strong><span>Nightlife-ready styling</span></div></div>
    </section>
  );
}

export function ProfilesSection({ profiles }: { profiles: Profile[] }) {
  return (
    <section id="profiles" className="public-section"><div className="rafay-container"><div className="section-heading"><div><span className="rafay-kicker">Selected 18+ profiles</span><h2 className="rafay-display">Choose the vibe.</h2></div><p>Curated adult profiles for dinners, nightlife events, launches, celebrations and creator appearances.</p></div>{profiles.length ? <div className="profile-grid">{profiles.map((profile, index) => <ProfileCard key={profile.id} profile={profile} index={index} />)}</div> : <div className="empty-state">No profiles are currently available. Check back soon.</div>}</div></section>
  );
}

export function PackagesSection({ packages }: { packages: Package[] }) {
  return (
    <section id="packages" className="public-section section-tinted"><div className="rafay-container"><div className="section-heading"><div><span className="rafay-kicker">Private appearance formats</span><h2 className="rafay-display">Shape the night.</h2></div><p>Pick an appearance format, then set the date, venue, occasion and duration through the private booking flow.</p></div><div className="package-grid">{packages.map((item, index) => <article className="package-card" key={item.id}><span className="package-index">0{index + 1}</span><h3 className="rafay-display">{item.name}</h3><p>{item.description}</p><strong>{item.priceLabel}</strong><span>{item.durationNote}</span><Link href={`/booking?package=${encodeURIComponent(item.id)}`} className="profile-link">Configure request <span aria-hidden="true">↗</span></Link></article>)}</div></div></section>
  );
}

export function TrustSection({ data }: { data: SiteData }) {
  return <section className="public-section trust-section"><div className="rafay-container"><div className="section-heading compact-heading"><div><span className="rafay-kicker">The RAFAY standard</span><h2 className="rafay-display">Private by design.</h2></div><p>Premium presentation with clear adult-only boundaries and discreet request handling.</p></div><div className="trust-grid">{data.trustCards.map((card, index) => <article key={card.id} className="trust-card"><span className="trust-number">0{index + 1}</span><h3>{card.title}</h3><p>{card.text}</p></article>)}</div></div></section>;
}

export function HowSection({ data }: { data: SiteData }) {
  return <section id="how" className="public-section how-section"><div className="rafay-container"><span className="rafay-kicker">Private booking, simplified</span><h2 className="rafay-display how-title">From profile to WhatsApp without the noise.</h2><div className="how-grid">{data.howItWorks.map((item, index) => <article key={item.id}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div><div className="final-cta"><div><span className="rafay-kicker">RAFAY AFTER DARK</span><h2 className="rafay-display">Set the brief. Make the request.</h2><p>18+ lawful social events, nightlife appearances and creator bookings only.</p></div><Link href="/booking" className="rafay-button rafay-button--primary">Start private booking</Link></div></div></section>;
}
