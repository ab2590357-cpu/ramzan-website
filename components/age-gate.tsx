'use client';

import { useEffect, useState } from 'react';

const KEY = 'rafay_age_confirmed';

export function AgeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.localStorage.getItem(KEY) !== 'yes');
  }, []);

  if (!open) return null;

  return (
    <div className="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-title">
      <div className="age-card">
        <span className="rafay-kicker">Adults only · 18+</span>
        <h2 id="age-title" className="rafay-display">Private. Polished. Respectful.</h2>
        <p>RAFAY is for lawful adult social events, hosting and creator appearances only. No sexual services are offered or facilitated. By entering, you confirm you are 18+ and will respect consent, boundaries and local law.</p>
        <div className="age-actions">
          <button className="rafay-button rafay-button--primary" onClick={() => { window.localStorage.setItem(KEY, 'yes'); setOpen(false); }}>I am 18+ — Enter</button>
          <button className="rafay-button" onClick={() => { window.location.href = 'https://www.google.com'; }}>Exit</button>
        </div>
      </div>
    </div>
  );
}
