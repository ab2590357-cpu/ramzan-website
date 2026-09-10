import { expect, it } from 'vitest';
import { getVisiblePublicData } from './sections';
import { DEFAULT_SITE_DATA } from '@/lib/defaults';

it('shows only active adult-confirmed profiles and active packages', () => {
  const data = {
    ...DEFAULT_SITE_DATA,
    profiles: [
      { ...DEFAULT_SITE_DATA.profiles[0], id: 'visible', name: 'Visible', active: true, adultConfirmed: true, displayOrder: 2 },
      { ...DEFAULT_SITE_DATA.profiles[1], id: 'inactive', name: 'Inactive', active: false, adultConfirmed: true, displayOrder: 0 },
      { ...DEFAULT_SITE_DATA.profiles[2], id: 'not-confirmed', name: 'Not Confirmed', active: true, adultConfirmed: false, displayOrder: 1 }
    ],
    packages: [
      { ...DEFAULT_SITE_DATA.packages[0], id: 'visible-package', active: true, displayOrder: 1 },
      { ...DEFAULT_SITE_DATA.packages[1], id: 'hidden-package', active: false, displayOrder: 0 }
    ]
  };

  const visible = getVisiblePublicData(data);
  expect(visible.profiles.map((item) => item.id)).toEqual(['visible']);
  expect(visible.packages.map((item) => item.id)).toEqual(['visible-package']);
});
