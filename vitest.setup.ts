import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Cormorant_Garamond: () => ({ variable: '--font-display' }),
  Inter: () => ({ variable: '--font-ui' })
}));
