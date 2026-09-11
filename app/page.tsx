import { AgeGate } from '@/components/age-gate';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';
import { getVisiblePublicData, HeroSection, HowSection, PackagesSection, ProfilesSection, TrustSection } from '@/components/sections';
import { loadSiteData } from '@/lib/blob-store';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { data } = await loadSiteData();
  const visible = getVisiblePublicData(data);
  return <><AgeGate /><PublicHeader data={data} /><main><HeroSection data={data} /><ProfilesSection profiles={visible.profiles} /><PackagesSection packages={visible.packages} /><TrustSection data={data} /><HowSection data={data} /></main><PublicFooter data={data} /></>;
}
