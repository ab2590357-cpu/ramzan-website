'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BookingRequest, BookingStatus } from '@/lib/domain';
import styles from './admin.module.css';

export const BOOKING_STATUS_OPTIONS: BookingStatus[] = ['Pending','Contacted','Confirmed','Completed','Cancelled'];

export function filterBookings(bookings: BookingRequest[], status: string, query: string): BookingRequest[] {
  const normalizedStatus = status.toLowerCase();
  const needle = query.trim().toLowerCase();
  return bookings.filter((booking) => {
    const statusMatches = normalizedStatus === 'all' || booking.status.toLowerCase() === normalizedStatus;
    if (!statusMatches) return false;
    if (!needle) return true;
    return [booking.reference, booking.customerName, booking.customerPhone, booking.profileNameSnapshot, booking.packageNameSnapshot, booking.city]
      .some((value) => value.toLowerCase().includes(needle));
  });
}

export function BookingsManager({ secret }: { secret: string }) {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'loading'|'ready'|'error'>('loading');
  const [message, setMessage] = useState('');
  const visible = useMemo(() => filterBookings(bookings, status, query), [bookings, status, query]);

  const endpoint = `/api/control/${encodeURIComponent(secret)}/bookings`;
  const load = async () => {
    setState('loading'); setMessage('');
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not load bookings.');
      setBookings(payload.bookings);
      setState('ready');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Could not load bookings.');
    }
  };

  useEffect(() => { void load(); }, []);

  const changeStatus = async (booking: BookingRequest, nextStatus: BookingStatus) => {
    setMessage('');
    try {
      const response = await fetch(endpoint, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: booking.id, status: nextStatus }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Status update failed.');
      setBookings((items) => items.map((item) => item.id === booking.id ? payload.booking : item));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Status update failed.'); }
  };

  const remove = async (booking: BookingRequest) => {
    if (!confirm(`Delete booking ${booking.reference}?`)) return;
    setMessage('');
    try {
      const response = await fetch(endpoint, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: booking.id }) });
      if (!response.ok) { const payload = await response.json(); throw new Error(payload.error || 'Delete failed.'); }
      setBookings((items) => items.filter((item) => item.id !== booking.id));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Delete failed.'); }
  };

  return <div className={styles.bookingsManager}>
    <div className={styles.bookingToolbar}>
      <input aria-label="Search bookings" placeholder="Search reference, customer, profile, city…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Booking status filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{BOOKING_STATUS_OPTIONS.map((item) => <option key={item} value={item.toLowerCase()}>{item}</option>)}</select>
      <button className={styles.smallButton} onClick={() => void load()}>Refresh</button>
    </div>
    <div className={styles.bookingCount}>{visible.length} of {bookings.length} booking request(s)</div>
    {message && <div className={styles.notice}>{message}</div>}
    {state === 'loading' && <div className={styles.emptyModule}>Loading booking requests…</div>}
    {state === 'error' && <div className={styles.emptyModule}>Booking requests could not be loaded.</div>}
    {state === 'ready' && visible.length === 0 && <div className={styles.emptyModule}>No booking requests match this view.</div>}
    {state === 'ready' && visible.length > 0 && <div className={styles.bookingList}>{visible.map((booking) => <article key={booking.id} className={styles.bookingCard}>
      <div className={styles.bookingHead}><div><span className="rafay-kicker">{booking.reference}</span><h3>{booking.customerName}</h3><p>{booking.profileNameSnapshot} · {booking.packageNameSnapshot}</p></div><select aria-label={`Status for ${booking.reference}`} value={booking.status} onChange={(event) => void changeStatus(booking, event.target.value as BookingStatus)}>{BOOKING_STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className={styles.bookingDetails}><Detail label="Schedule" value={`${booking.date} · ${booking.time}`} /><Detail label="Location" value={`${booking.city} · ${booking.venueType}`} /><Detail label="Occasion" value={booking.occasion} /><Detail label="Duration" value={booking.duration} /><Detail label="Payment" value={booking.paymentPreference} /><Detail label="Phone" value={booking.customerPhone} />{booking.addOn && <Detail label="Add-on" value={booking.addOn} />}{booking.notes && <Detail label="Notes" value={booking.notes} />}</div>
      <div className={styles.bookingActions}><a className={styles.smallButton} href={`https://wa.me/${booking.customerPhone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">WhatsApp customer ↗</a><button className={styles.danger} onClick={() => void remove(booking)}>Delete request</button></div>
    </article>)}</div>}
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className={styles.bookingDetail}><span>{label}</span><strong>{value}</strong></div>; }
