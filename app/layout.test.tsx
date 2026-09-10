import { render, screen } from '@testing-library/react';
import RootLayout, { metadata } from './layout';

it('renders the RAFAY application shell', () => {
  render(<RootLayout><main>RAFAY shell content</main></RootLayout>);
  expect(screen.getByText('RAFAY shell content')).toBeInTheDocument();
});

it('publishes the corrected RAFAY metadata title', () => {
  expect(metadata.title).toBe('RAFAY — Private Event & Creator Booking');
});
