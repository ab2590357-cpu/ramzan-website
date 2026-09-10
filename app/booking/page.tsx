import { BookingWizard } from '@/components/booking-wizard';
import { loadSiteData } from '@/lib/blob-store';

export const dynamic = 'force-dynamic';

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ profile?: string; package?: string }> }) {
  const [{ data }, query] = await Promise.all([loadSiteData(), searchParams]);
  return <BookingWizard data={data} initialProfileId={query.profile || ''} initialPackageId={query.package || ''} />;
}
