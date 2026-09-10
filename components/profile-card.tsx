import Image from 'next/image';
import Link from 'next/link';
import type { Profile } from '@/lib/domain';

export function ProfileCard({ profile, index }: { profile: Profile; index: number }) {
  const image = profile.coverImageUrl || profile.images[0] || '/rafay-placeholder.svg';
  return (
    <article className="profile-card">
      <div className="profile-media">
        <Image src={image} alt={`${profile.name} — adult RAFAY profile`} fill sizes="(max-width: 760px) 92vw, (max-width: 1100px) 45vw, 31vw" className="profile-image" />
        <span className="profile-number">0{index + 1}</span>
        <span className="profile-adult">18+ verified listing</span>
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
