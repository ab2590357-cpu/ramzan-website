import { render, screen } from '@testing-library/react';
import RootLayout from './layout';

it('renders the RAFAY application shell', () => {
  render(<RootLayout><main>RAFAY shell content</main></RootLayout>);
  expect(screen.getByText('RAFAY shell content')).toBeInTheDocument();
});
