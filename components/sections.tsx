import Link from 'next/link';
import type { Package, Profile, SiteData } from '@/lib/domain';
import { ProfileCard } from './profile-card';

export function getVisiblePublicData(data: SiteData): { profiles: Profile[]; packages: Package[] } {
  return {
    profiles: data.profiles.filter((profile) => profile.active && profile.adultConfirmed).sort((a, b) => a.displayOrder - b.displayOrder),
    packages: data.packages.filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder)
  };
}

export function HeroSection({ data }: { data: SiteData }) {
  return (
    <section className="hero-public">
      <div className="hero-glow hero-glow--one" /><div className="hero-glow hero-glow--two" />
      <div className="rafay-container hero-grid">
        <div className="hero-copy">
          <span className="rafay-kicker">{data.hero.eyebrow}</span>
          <h1 className="rafay-display">{data.hero.heading}</h1>
          <p>{data.hero.body}</p>
          <div className="hero-actions"><Link href="/booking" className="rafay-button rafay-button--primary">{data.hero.primaryCta}</Link><a href="#profiles" className="rafay-button">{data.hero.secondaryCta}</a></div>
          <div className="hero-proof"><span>18+ only</span><span>Private requests</span><span>Consent & boundaries</span></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="hero-orbit" /><div className="hero-silhouette"><span>R</span></div><p>PRIVATE APPEARANCE CONCIERGE</p></div>
      </div>
    </section>
  );
}

export function ProfilesSection({ profiles }: { profiles: Profile[] }) {
  return (
    <section id="profiles" className="public-section"><div className="rafay-container"><div className="section-heading"><div><span className="rafay-kicker">The private edit</span><h2 className="rafay-display">Choose your presence.</h2></div><p>Adult profiles selected for polished lawful social events and creator appearances.</p></div>{profiles.length ? <div className="profile-grid">{profiles.map((profile, index) => <ProfileCard key={profile.id} profile={profile} index={index} />)}</div> : <div className="empty-state">No profiles are currently available. Check back soon.</div>}</div></section>
  );
}

export function PackagesSection({ packages }: { packages: Package[] }) {
  return (
    <section id="packages" className="public-section section-tinted"><div className="rafay-container"><div className="section-heading"><div><span className="rafay-kicker">Curated appearances</span><h2 className="rafay-display">Set the tone.</h2></div><p>Choose an appearance format, then shape the date, occasion, duration and details privately.</p></div><div className="package-grid">{packages.map((item, index) => <article className="package-card" key={item.id}><span className="package-index">0{index + 1}</span><h3 className="rafay-display">{item.name}</h3><p>{item.description}</p><strong>{item.priceLabel}</strong><span>{item.durationNote}</span><Link href={`/booking?package=${encodeURIComponent(item.id)}`} className="profile-link">Configure request ↗</Link></article>)}</div></div></section>
  );
}

export function TrustSection({ data }: { data: SiteData }) {
  return <section className="public-section"><div className="rafay-container trust-grid">{data.trustCards.map((card) => <article key={card.id} className="trust-card"><span className="trust-dot" /><h3>{card.title}</h3><p>{card.text}</p></article>)}</div></section>;
}

export function HowSection({ data }: { data: SiteData }) {
  return <section id="how" className="public-section how-section"><div className="rafay-container"><span className="rafay-kicker">Simple by design</span><h2 className="rafay-display how-title">Three moves. One private request.</h2><div className="how-grid">{data.howItWorks.map((item, index) => <article key={item.id}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div><div className="final-cta"><div><span className="rafay-kicker">Your night, your brief</span><h2 className="rafay-display">Make the request feel effortless.</h2></div><Link href="/booking" className="rafay-button rafay-button--primary">Start booking</Link></div></div></section>;
}
