import type { ReactElement } from 'react';
import { expect, it } from 'vitest';
import RootLayout, { metadata } from './layout';

it('returns an html/body RAFAY application shell', () => {
  const layout = RootLayout({ children: <main>RAFAY shell content</main> }) as ReactElement<{ children: ReactElement }>;
  expect(layout.type).toBe('html');
  expect(layout.props.children.type).toBe('body');
});

it('publishes the corrected RAFAY metadata title', () => {
  expect(metadata.title).toBe('RAFAY — Private Event & Creator Booking');
});
