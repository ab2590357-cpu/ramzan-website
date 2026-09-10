import type { ReactElement } from 'react';
import { expect, it } from 'vitest';
import RootLayout, { metadata } from './layout';

it('returns an html/body RAFAY application shell', () => {
  const layout = RootLayout({ children: <main>RAFAY shell content</main> }) as ReactElement;
  expect(layout.type).toBe('html');
  const body = layout.props.children as ReactElement;
  expect(body.type).toBe('body');
});

it('publishes the corrected RAFAY metadata title', () => {
  expect(metadata.title).toBe('RAFAY — Private Event & Creator Booking');
});
