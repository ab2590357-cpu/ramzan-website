import Image from 'next/image';
import type { SiteData } from '@/lib/domain';

export function PublicFooter({ data }: { data: SiteData }) {
  return (
    <footer className="public-footer">
      <div className="rafay-container footer-grid">
        <div>
          <div className="wordmark"><Image src="/rafay-mark.svg" alt="" width={46} height={46} /><span>RAFAY</span></div>
          <p className="rafay-muted footer-copy">{data.footer}</p>
        </div>
        <div className="footer-legal"><span>18+ · Private booking</span><p>{data.legalNotice}</p></div>
      </div>
    </footer>
  );
}
