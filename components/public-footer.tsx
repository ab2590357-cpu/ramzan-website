import Image from 'next/image';
import Link from 'next/link';
import type { SiteData } from '@/lib/domain';

export function PublicFooter({ data }: { data: SiteData }) {
  return (
    <footer className="public-footer"><div className="rafay-container footer-top"><div><div className="wordmark footer-wordmark"><Image src="/rafay-mark.svg" alt="" width={42} height={42} /><span className="wordmark-copy"><strong>RAFAY</strong><small>PRIVATE · EXCLUSIVE · 18+</small></span></div><p className="rafay-muted footer-copy">{data.footer}</p></div><div className="footer-links"><a href="#profiles">Profiles</a><a href="#packages">Packages</a><a href="#how">How it works</a><Link href="/booking">Start booking</Link></div></div><div className="rafay-container footer-bottom"><div className="footer-legal"><span>18+ · PRIVATE BOOKING</span><p>{data.legalNotice}</p></div><small>© 2026 RAFAY. Private adult event booking.</small></div></footer>
  );
}
