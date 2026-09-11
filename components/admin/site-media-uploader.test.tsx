import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SiteMediaUploader } from './site-media-uploader';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

it('uploads site media and returns the new URL', async () => {
  const onChange = vi.fn();
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ url: 'https://assets.public.blob.vercel-storage.com/rafay/media/site/hero.webp' }), {
    status: 201,
    headers: { 'content-type': 'application/json' }
  }));
  global.fetch = fetchMock as typeof fetch;

  render(<SiteMediaUploader secret="secret-key" label="Desktop hero" currentUrl="" previewAlt="Hero" onChange={onChange} />);
  const input = screen.getByLabelText(/desktop hero/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(['image'], 'hero.webp', { type: 'image/webp' })] } });

  await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://assets.public.blob.vercel-storage.com/rafay/media/site/hero.webp'));
  const requestInit = fetchMock.mock.calls[0]?.[1];
  expect((requestInit?.body as FormData).get('scope')).toBe('site');
});

it('keeps the previous preview after a failed upload', async () => {
  const onChange = vi.fn();
  global.fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'Image upload failed.' }), {
    status: 400,
    headers: { 'content-type': 'application/json' }
  })) as typeof fetch;

  render(<SiteMediaUploader secret="secret-key" label="RAFAY logo" currentUrl="https://example.com/logo.webp" previewAlt="RAFAY logo" onChange={onChange} />);
  expect(screen.getByRole('img', { name: 'RAFAY logo' })).toHaveAttribute('src', 'https://example.com/logo.webp');
  const input = screen.getByLabelText(/rafay logo/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(['image'], 'bad.webp', { type: 'image/webp' })] } });

  expect(await screen.findByText('Image upload failed.')).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('img', { name: 'RAFAY logo' })).toHaveAttribute('src', 'https://example.com/logo.webp');
});

it('shows a stable HTTP error instead of a JSON parse error when Vercel returns an empty response', async () => {
  const onChange = vi.fn();
  global.fetch = vi.fn(async () => new Response('', { status: 503 })) as typeof fetch;

  render(<SiteMediaUploader secret="secret-key" label="Desktop hero" currentUrl="" previewAlt="Hero" onChange={onChange} />);
  const input = screen.getByLabelText(/desktop hero/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(['image'], 'hero.webp', { type: 'image/webp' })] } });

  expect(await screen.findByText('Upload failed (503).')).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByText(/unexpected end of json/i)).not.toBeInTheDocument();
});
