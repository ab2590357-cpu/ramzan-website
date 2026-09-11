'use client';

import type { SiteData } from '@/lib/domain';
import { SiteMediaUploader } from './site-media-uploader';
import styles from './admin.module.css';

export function logoMediaPatch(url: string): Partial<SiteData> {
  return { logoUrl: url };
}

export function heroMediaPatch(data: SiteData, key: 'desktopImageUrl' | 'mobileImageUrl', url: string): Partial<SiteData> {
  return { hero: { ...data.hero, [key]: url } };
}

export function ContentEditor({ data, secret, onChange }: {
  data: SiteData;
  secret: string;
  onChange: (next: Partial<SiteData>) => void;
}) {
  const hero = (key: keyof SiteData['hero'], value: string) => onChange({ hero: { ...data.hero, [key]: value } });

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div><span className="rafay-kicker">Public experience</span><h1 className="rafay-display">Website Content</h1></div>
      </div>

      <h3 className={styles.subhead}>Branding</h3>
      <p className={styles.mediaHelp}>Upload the logo used in the public header. If removed, RAFAY's built-in mark is used automatically.</p>
      <div className={styles.siteMediaGrid}>
        <SiteMediaUploader
          secret={secret}
          label="RAFAY logo"
          currentUrl={data.logoUrl}
          previewAlt={data.logoAlt || 'RAFAY logo'}
          onChange={(logoUrl) => onChange(logoMediaPatch(logoUrl))}
        />
      </div>
      <div className={styles.fieldGrid}>
        <Field label="Logo alt text"><input value={data.logoAlt} maxLength={120} onChange={(e) => onChange({ logoAlt: e.target.value })} /></Field>
      </div>

      <h3 className={styles.subhead}>Hero Media</h3>
      <p className={styles.mediaHelp}>Use a wide image for desktop and a separate portrait/mobile crop. Mobile falls back to the desktop image when its own image is empty.</p>
      <div className={styles.siteMediaGrid}>
        <SiteMediaUploader
          secret={secret}
          label="Desktop hero"
          currentUrl={data.hero.desktopImageUrl}
          previewAlt={data.hero.imageAlt || 'RAFAY hero desktop'}
          onChange={(desktopImageUrl) => onChange(heroMediaPatch(data, 'desktopImageUrl', desktopImageUrl))}
        />
        <SiteMediaUploader
          secret={secret}
          label="Mobile hero"
          currentUrl={data.hero.mobileImageUrl}
          previewAlt={data.hero.imageAlt || 'RAFAY hero mobile'}
          onChange={(mobileImageUrl) => onChange(heroMediaPatch(data, 'mobileImageUrl', mobileImageUrl))}
        />
      </div>

      <h3 className={styles.subhead}>Hero Copy</h3>
      <div className={styles.fieldGrid}>
        <Field label="Eyebrow"><input value={data.hero.eyebrow} maxLength={100} onChange={(e) => hero('eyebrow', e.target.value)} /></Field>
        <Field label="Heading"><input value={data.hero.heading} maxLength={180} onChange={(e) => hero('heading', e.target.value)} /></Field>
        <Field label="Body"><textarea value={data.hero.body} maxLength={900} onChange={(e) => hero('body', e.target.value)} /></Field>
        <Field label="Image alt text"><input value={data.hero.imageAlt} maxLength={180} onChange={(e) => hero('imageAlt', e.target.value)} /></Field>
        <Field label="Primary CTA"><input value={data.hero.primaryCta} maxLength={60} onChange={(e) => hero('primaryCta', e.target.value)} /></Field>
        <Field label="WhatsApp CTA"><input value={data.hero.whatsappCta} maxLength={60} onChange={(e) => hero('whatsappCta', e.target.value)} /></Field>
      </div>

      <h3 className={styles.subhead}>Trust cards</h3>
      {data.trustCards.map((card, index) => <div className={styles.inlineCard} key={card.id}><input value={card.title} onChange={(e) => onChange({ trustCards: data.trustCards.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} /><textarea value={card.text} onChange={(e) => onChange({ trustCards: data.trustCards.map((item, i) => i === index ? { ...item, text: e.target.value } : item) })} /></div>)}

      <h3 className={styles.subhead}>How it works</h3>
      {data.howItWorks.map((card, index) => <div className={styles.inlineCard} key={card.id}><input value={card.title} onChange={(e) => onChange({ howItWorks: data.howItWorks.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} /><textarea value={card.text} onChange={(e) => onChange({ howItWorks: data.howItWorks.map((item, i) => i === index ? { ...item, text: e.target.value } : item) })} /></div>)}

      <div className={styles.fieldGrid}>
        <Field label="Footer"><textarea value={data.footer} onChange={(e) => onChange({ footer: e.target.value })} /></Field>
        <Field label="Legal / consent notice"><textarea value={data.legalNotice} onChange={(e) => onChange({ legalNotice: e.target.value })} /></Field>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>;
}
