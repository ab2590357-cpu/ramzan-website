import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminClient } from '@/components/admin/admin-client';
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
  const { data, etag } = await loadSiteData();
  return <AdminClient secret={secret} initialData={data} initialEtag={etag} />;
}
