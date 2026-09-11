'use client';

import { useState } from 'react';
import styles from './admin.module.css';

type Props = {
  secret: string;
  label: string;
  currentUrl: string;
  previewAlt: string;
  onChange: (url: string) => void;
};

type UploadPayload = { url?: string; error?: string };

async function readUploadPayload(response: Response): Promise<UploadPayload> {
  const raw = await response.text();
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as UploadPayload : {};
  } catch {
    return {};
  }
}

export function SiteMediaUploader({ secret, label, currentUrl, previewAlt, onChange }: Props) {
  const [state, setState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [error, setError] = useState('');

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setState('uploading');
    setError('');
    try {
      const form = new FormData();
      form.set('scope', 'site');
      form.set('file', file);
      const response = await fetch(`/api/control/${encodeURIComponent(secret)}/media`, {
        method: 'POST',
        body: form
      });
      const payload = await readUploadPayload(response);
      if (!response.ok) {
        setState('error');
        setError(payload.error || `Upload failed (${response.status}).`);
        return;
      }
      if (!payload.url) {
        setState('error');
        setError('Upload completed without a media URL.');
        return;
      }
      onChange(payload.url);
      setState('idle');
    } catch (uploadError) {
      setState('error');
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
    }
  };

  return (
    <article className={styles.siteMediaCard}>
      <div className={styles.siteMediaPreview}>
        {currentUrl ? (
          <img src={currentUrl} alt={previewAlt || label} />
        ) : (
          <div className={styles.siteMediaEmpty}>No custom image</div>
        )}
      </div>
      <div className={styles.siteMediaBody}>
        <strong>{label}</strong>
        <span>JPEG, PNG or WebP · maximum 5 MB</span>
        {error && <p className={styles.siteMediaError}>{error}</p>}
        <div className={styles.siteMediaActions}>
          <label className={`${styles.siteMediaUploadButton} rafay-button rafay-button--primary`}>
            {state === 'uploading' ? 'Uploading…' : currentUrl ? 'Replace image' : 'Upload image'}
            <input
              aria-label={label}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={state === 'uploading'}
              onChange={(event) => upload(event.target.files?.[0])}
            />
          </label>
          {currentUrl && (
            <button type="button" className={styles.danger} onClick={() => onChange('')} disabled={state === 'uploading'}>
              Remove
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
