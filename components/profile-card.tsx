import Image from 'next/image';
import Link from 'next/link';
import type { Profile } from '@/lib/domain';

const fallbackImages = [
  'https://images.unsplash.com/photo-1774543221526-b2152eca0ab1?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1774542817337-f3b5c9d43ae0?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1765229278564-6775d6aec567?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1772615071604-f06863d231fd?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1774543281352-c3027a8225fe?auto=format&fit=crop&w=1000&q=80'
];

export function ProfileCard({ profile, index }: { profile: Profile; index: number }) {
  const image = profile.coverImageUrl || profile.images[0] || fallbackImages[index % fallbackImages.length];
  return (
    <article className="profile-card">
      <div className="profile-media">
        <Image src={image} alt={`${profile.name} — adult RAFAY event profile`} fill sizes="(max-width: 760px) 92vw, (max-width: 1100px) 45vw, 31vw" className="profile-image" />
        <div className="profile-vignette" />
        <span className="profile-number">0{index + 1}</span>
        <span className="profile-adult">18+ verified</span>
      </div>
      <div className="profile-body">
        <div><span className="rafay-kicker">{profile.label}</span><h3 className="rafay-display">{profile.name}</h3></div>
        <p>{profile.bio}</p>
        <div className="tag-row">{profile.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <Link href={`/booking?profile=${encodeURIComponent(profile.id)}`} className="profile-link">Request this profile <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  );
}
