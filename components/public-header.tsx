import Image from 'next/image';
import Link from 'next/link';

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="rafay-container public-header__inner">
        <Link href="/" className="wordmark" aria-label="RAFAY home"><Image src="/rafay-mark.svg" alt="" width={38} height={38} priority /><span className="wordmark-copy"><strong>RAFAY</strong><small>PRIVATE · EXCLUSIVE · 18+</small></span></Link>
        <nav className="public-nav" aria-label="Primary navigation"><a href="#profiles">Profiles</a><a href="#packages">Packages</a><a href="#how">How it works</a></nav>
        <div className="header-actions"><span className="header-age">18+</span><Link href="/booking" className="rafay-button rafay-button--primary header-cta">Book privately</Link></div>
      </div>
    </header>
  );
}
