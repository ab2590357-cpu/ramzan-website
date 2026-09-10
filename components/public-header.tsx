import Image from 'next/image';
import Link from 'next/link';
import type { SiteData } from '@/lib/domain';
import { buildPublicWhatsAppUrl } from '@/lib/public-whatsapp';

export function PublicHeader({ data }: { data: SiteData }) {
  const whatsappUrl = buildPublicWhatsAppUrl(data.whatsappNumber);

  return (
    <header className="public-header">
      <div className="rafay-container public-header__inner">
        <Link href="/" className="wordmark" aria-label="RAFAY home">
          {data.logoUrl ? (
            <img className="wordmark-custom-logo" src={data.logoUrl} alt={data.logoAlt || 'RAFAY'} />
          ) : (
            <Image src="/rafay-mark.svg" alt="" width={38} height={38} priority />
          )}
          <span className="wordmark-copy"><strong>RAFAY</strong><small>PRIVATE · EXCLUSIVE · 18+</small></span>
        </Link>
        <nav className="public-nav" aria-label="Primary navigation"><a href="#profiles">Profiles</a><a href="#packages">Packages</a><a href="#how">How it works</a></nav>
        <div className="header-actions">
          <span className="header-age">18+</span>
          {whatsappUrl && (
            <a className="header-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="WhatsApp RAFAY">
              <svg className="header-whatsapp__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 0 0-7.24 12.96L3.5 20.5l4.17-1.15A8.5 8.5 0 1 0 12 3.5Zm0 1.7a6.8 6.8 0 0 1 5.84 10.28 6.77 6.77 0 0 1-9.83 2.1l-.31-.2-1.8.5.5-1.75-.21-.33A6.8 6.8 0 0 1 12 5.2Zm-2.58 2.9c-.17 0-.45.06-.69.32-.23.26-.9.88-.9 2.14 0 1.27.92 2.49 1.05 2.66.13.17 1.81 2.77 4.39 3.88.61.27 1.09.43 1.46.55.61.2 1.17.17 1.61.1.49-.07 1.51-.62 1.72-1.21.21-.6.21-1.1.15-1.21-.06-.11-.23-.17-.49-.3-.25-.13-1.5-.74-1.74-.82-.23-.09-.4-.13-.57.13-.17.25-.66.82-.81.99-.15.17-.3.19-.55.06-.26-.13-1.08-.4-2.05-1.27-.76-.67-1.27-1.51-1.42-1.77-.15-.25-.02-.39.11-.52.12-.11.26-.3.39-.45.12-.15.17-.26.25-.43.09-.17.04-.32-.02-.45-.06-.13-.57-1.38-.79-1.89-.2-.5-.42-.43-.57-.44h-.49Z"/></svg>
              <span className="header-whatsapp__label">WhatsApp</span>
            </a>
          )}
          <Link href="/booking" className="rafay-button rafay-button--primary header-cta">Book privately</Link>
        </div>
      </div>
    </header>
  );
}
