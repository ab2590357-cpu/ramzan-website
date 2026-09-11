'use client';

import { useMemo, useState } from 'react';
import type { Profile } from '@/lib/domain';
import { readJsonResponse } from '@/lib/http-response';
import styles from './admin.module.css';

export function attachProfileImage(profile: Profile, url: string): Profile {
  if (profile.images.includes(url) || profile.images.length >= 12) return profile;
  const images = [...profile.images, url];
  return { ...profile, images, coverImageUrl: profile.coverImageUrl || url };
}

export function setProfileCover(profile: Profile, url: string): Profile {
  if (!profile.images.includes(url)) return profile;
  return { ...profile, coverImageUrl: url };
}

export function removeProfileImage(profile: Profile, url: string): Profile {
  const images = profile.images.filter((image) => image !== url);
  const coverImageUrl = profile.coverImageUrl === url ? (images[0] || '') : profile.coverImageUrl;
  return { ...profile, images, coverImageUrl };
}

export function moveProfileImage(profile: Profile, url: string, direction: -1 | 1): Profile {
  const index = profile.images.indexOf(url);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= profile.images.length) return profile;
  const images = [...profile.images];
  [images[index], images[target]] = [images[target], images[index]];
  return { ...profile, images };
}

type Props = {
  secret: string;
  profiles: Profile[];
  onProfilesChange: (profiles: Profile[]) => void;
};

type MediaPayload = { url?: string; error?: string };

export function MediaManager({ secret, profiles, onProfilesChange }: Props) {
  const orderedProfiles = useMemo(() => [...profiles].sort((a, b) => a.displayOrder - b.displayOrder), [profiles]);
  const [profileId, setProfileId] = useState(orderedProfiles[0]?.id || '');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const profile = profiles.find((item) => item.id === profileId) || orderedProfiles[0];

  const replaceProfile = (next: Profile) => {
    onProfilesChange(profiles.map((item) => item.id === next.id ? { ...next, updatedAt: new Date().toISOString() } : item));
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!profile || !files?.length) return;
    setUploading(true);
    setMessage('');
    try {
      let next = profile;
      for (const file of Array.from(files)) {
        if (next.images.length >= 12) throw new Error('A profile can have up to 12 images.');
        const form = new FormData();
        form.set('scope', 'profile');
        form.set('profileId', profile.id);
        form.set('file', file);
        const response = await fetch(`/api/control/${encodeURIComponent(secret)}/media`, { method: 'POST', body: form });
        const payload = await readJsonResponse<MediaPayload>(response, 'Image upload');
        if (!response.ok) throw new Error(payload.error || `Image upload failed (${response.status}).`);
        if (!payload.url) throw new Error(payload.error || 'Image upload completed without a media URL.');
        next = attachProfileImage(next, payload.url);
      }
      replaceProfile(next);
      setMessage('Image uploaded. Press Save changes to publish the updated gallery.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (url: string) => {
    if (!profile) return;
    if (!confirm('Remove this image from the profile?')) return;
    const next = removeProfileImage(profile, url);
    replaceProfile(next);
    try {
      const response = await fetch(`/api/control/${encodeURIComponent(secret)}/media`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!response.ok) {
        const payload = await readJsonResponse<{ error?: string }>(response, 'Media cleanup');
        setMessage(payload.error || `Media cleanup failed (${response.status}). The profile change can still be saved.`);
      }
    } catch {
      setMessage('Media cleanup failed. The profile change can still be saved.');
    }
  };

  if (!profile) {
    return <div className={styles.emptyModule}>Add a profile first, then upload its images here.</div>;
  }

  return <div className={styles.mediaManager}>
    <div className={styles.mediaToolbar}>
      <label className={styles.field}>
        <span>Profile</span>
        <select value={profile.id} onChange={(event) => setProfileId(event.target.value)}>
          {orderedProfiles.map((item) => <option value={item.id} key={item.id}>{item.name || 'Untitled profile'}</option>)}
        </select>
      </label>
      <label className={`${styles.uploadButton} rafay-button rafay-button--primary`}>
        {uploading ? 'Uploading…' : 'Upload images'}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={(event) => uploadFiles(event.target.files)} />
      </label>
    </div>
    <p className={styles.mediaHelp}>JPEG, PNG or WebP · maximum 5 MB each · up to 12 images per profile. Select a cover image and reorder the gallery below.</p>
    {message && <div className={styles.notice}>{message}</div>}
    {profile.images.length === 0 ? <div className={styles.emptyModule}>No images uploaded for this profile yet.</div> :
      <div className={styles.mediaGrid}>{profile.images.map((url, index) => <article className={styles.mediaCard} key={url}>
        <div className={styles.mediaPreview}><img src={url} alt={`${profile.name || 'RAFAY profile'} image ${index + 1}`} /></div>
        <div className={styles.mediaMeta}><span>Image {index + 1}</span>{profile.coverImageUrl === url && <strong>Cover</strong>}</div>
        <div className={styles.mediaActions}>
          <button className={styles.smallButton} disabled={index === 0} onClick={() => replaceProfile(moveProfileImage(profile, url, -1))}>↑</button>
          <button className={styles.smallButton} disabled={index === profile.images.length - 1} onClick={() => replaceProfile(moveProfileImage(profile, url, 1))}>↓</button>
          <button className={styles.smallButton} disabled={profile.coverImageUrl === url} onClick={() => replaceProfile(setProfileCover(profile, url))}>Set cover</button>
          <button className={styles.danger} onClick={() => removeImage(url)}>Remove</button>
        </div>
      </article>)}</div>}
  </div>;
}
