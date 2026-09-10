import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidAdminSecret } from '@/lib/admin-auth';
import { loadSiteData } from '@/lib/blob-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Control Center',
  robots: { index: false, follow: false, noarchive: true, noimageindex: true }
};

export default async function ControlPage({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  if (!isValidAdminSecret(secret)) notFound();
  const { data } = await loadSiteData();

  return (
    <main className="rafay-container" style={{ paddingBlock: 48 }}>
      <section className="rafay-panel" style={{ padding: 28 }}>
        <span className="rafay-kicker">Private control center</span>
        <h1 className="rafay-display" style={{ fontSize: 'clamp(2.5rem,7vw,5.2rem)', margin: '12px 0' }}>RAFAY Admin</h1>
        <p className="rafay-muted">Secure route verified. Full profile, booking, media and website editors are added in the admin dashboard task.</p>
        <p>{data.profiles.filter((profile) => profile.active).length} active profiles · {data.packages.filter((item) => item.active).length} active packages</p>
      </section>
    </main>
  );
}
