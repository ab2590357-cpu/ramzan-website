'use client';

import { useMemo, useState } from 'react';
import type { BookingInput, BookingRequest, SiteData } from '@/lib/domain';
import { readJsonResponse } from '@/lib/http-response';
import styles from './booking-wizard.module.css';

export const BOOKING_STEP_TITLES = ['Profile','Package','Date & time','City & venue','Occasion','Duration','Add-ons','Payment','Contact','Review'] as const;

export type BookingDraft = Omit<BookingInput, 'lawfulUseConfirmed'> & { lawfulUseConfirmed: boolean };

type BookingSubmitPayload = { booking?: BookingRequest; whatsappUrl?: string; error?: string };

export function initialBookingDraft(data: SiteData, initialProfileId = '', initialPackageId = ''): BookingDraft {
  return {
    profileId: data.profiles.some((p) => p.id === initialProfileId && p.active && p.adultConfirmed) ? initialProfileId : '',
    packageId: data.packages.some((p) => p.id === initialPackageId && p.active) ? initialPackageId : '',
    date: '', time: '', city: '', venueType: '', occasion: '', duration: '', addOn: '', paymentPreference: '',
    customerName: '', customerPhone: '', notes: '', lawfulUseConfirmed: false
  };
}

export function validateBookingStep(step: number, draft: BookingDraft, data: SiteData): boolean {
  switch (step) {
    case 1: return data.profiles.some((p) => p.id === draft.profileId && p.active && p.adultConfirmed);
    case 2: return data.packages.some((p) => p.id === draft.packageId && p.active);
    case 3: return /^\d{4}-\d{2}-\d{2}$/.test(draft.date) && /^\d{2}:\d{2}$/.test(draft.time);
    case 4: return draft.city.trim().length > 1 && draft.venueType.trim().length > 0;
    case 5: return draft.occasion.trim().length > 0;
    case 6: return draft.duration.trim().length > 0;
    case 7: return true;
    case 8: return data.paymentMethods.some((p) => p.name === draft.paymentPreference && p.active);
    case 9: return draft.customerName.trim().length > 1 && draft.customerPhone.replace(/\D/g, '').length >= 7;
    case 10: return draft.lawfulUseConfirmed;
    default: return false;
  }
}

type Props = { data: SiteData; initialProfileId?: string; initialPackageId?: string };

export function BookingWizard({ data, initialProfileId = '', initialPackageId = '' }: Props) {
  const [draft, setDraft] = useState<BookingDraft>(() => initialBookingDraft(data, initialProfileId, initialPackageId));
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const visibleProfiles = useMemo(() => data.profiles.filter((p) => p.active && p.adultConfirmed).sort((a,b) => a.displayOrder-b.displayOrder), [data.profiles]);
  const visiblePackages = useMemo(() => data.packages.filter((p) => p.active).sort((a,b) => a.displayOrder-b.displayOrder), [data.packages]);
  const payments = data.paymentMethods.filter((p) => p.active).sort((a,b) => a.displayOrder-b.displayOrder);

  const choose = (key: keyof BookingDraft, value: string | boolean) => { setDraft((current) => ({ ...current, [key]: value })); setError(''); };
  const next = () => { if (!validateBookingStep(step, draft, data)) { setError('Complete this step before continuing.'); return; } setError(''); setStep((s) => Math.min(10, s + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const back = () => { setError(''); setStep((s) => Math.max(1, s - 1)); };

  const submit = async () => {
    if (!validateBookingStep(10, draft, data)) { setError('Confirm the 18+ lawful-use agreement before submitting.'); return; }
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) });
      const payload = await readJsonResponse<BookingSubmitPayload>(response, 'Booking request');
      if (!response.ok) throw new Error(payload.error || `Booking could not be saved (${response.status}).`);
      if (!payload.booking) throw new Error(payload.error || 'Booking could not be saved: invalid server response.');
      if (payload.whatsappUrl) window.location.assign(payload.whatsappUrl);
      else setError(`Request ${payload.booking.reference} was saved, but the business WhatsApp number is not configured yet.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Booking could not be saved. Please retry.'); }
    finally { setSubmitting(false); }
  };

  const cardButton = (label: string, selected: boolean, onClick: () => void, detail?: string) => <button type="button" className={`${styles.choice} ${selected ? styles.selected : ''}`} onClick={onClick}><strong>{label}</strong>{detail && <span>{detail}</span>}</button>;

  return <div className={styles.shell}>
    <aside className={styles.sidebar}><a href="/" className={styles.brand}>RAFAY</a><span className="rafay-kicker">Private booking · 18+</span><h1 className="rafay-display">Build the request.</h1><p>Ten focused steps. Your selections stay editable until the final review.</p><div className={styles.progress}><i style={{ width: `${step * 10}%` }} /></div><small>Step {step} of 10 · {BOOKING_STEP_TITLES[step-1]}</small><div className={styles.legal}>Lawful adult social events, hosting and creator appearances only. Consent and boundaries always apply.</div></aside>
    <main className={styles.main}>
      <div className={styles.topline}><span>{String(step).padStart(2,'0')}</span><span>{BOOKING_STEP_TITLES[step-1]}</span></div>
      {step === 1 && <Step title="Choose the profile" copy="Select an available adult RAFAY profile."><div className={styles.choiceGrid}>{visibleProfiles.map((p) => cardButton(p.name, draft.profileId===p.id, () => choose('profileId',p.id), p.label))}</div></Step>}
      {step === 2 && <Step title="Choose the appearance" copy="Pick the package that fits the occasion."><div className={styles.choiceGrid}>{visiblePackages.map((p) => cardButton(p.name, draft.packageId===p.id, () => choose('packageId',p.id), `${p.priceLabel} · ${p.description}`))}</div></Step>}
      {step === 3 && <Step title="Set date & time" copy="Choose your preferred arrival date and time."><div className={styles.fields}><Field label="Date"><input type="date" value={draft.date} onChange={(e)=>choose('date',e.target.value)} /></Field><Field label="Time"><input type="time" value={draft.time} onChange={(e)=>choose('time',e.target.value)} /></Field></div></Step>}
      {step === 4 && <Step title="City & venue" copy="Tell us where the appearance is planned."><div className={styles.fields}><Field label="City"><input value={draft.city} maxLength={100} placeholder="e.g. Lahore" onChange={(e)=>choose('city',e.target.value)} /></Field><Field label="Venue type"><select value={draft.venueType} onChange={(e)=>choose('venueType',e.target.value)}><option value="">Select venue</option>{data.bookingOptions.venueTypes.map((v)=><option key={v}>{v}</option>)}</select></Field></div></Step>}
      {step === 5 && <Step title="What is the occasion?" copy="Select the closest fit."><div className={styles.choiceGrid}>{data.bookingOptions.occasions.map((v)=>cardButton(v,draft.occasion===v,()=>choose('occasion',v)))}</div></Step>}
      {step === 6 && <Step title="Choose duration" copy="Select the expected appearance window."><div className={styles.choiceGrid}>{data.bookingOptions.durations.map((v)=>cardButton(v,draft.duration===v,()=>choose('duration',v)))}</div></Step>}
      {step === 7 && <Step title="Add the finishing touch" copy="Optional coordination preferences."><div className={styles.choiceGrid}>{data.bookingOptions.addOns.map((v)=>cardButton(v,draft.addOn===v,()=>choose('addOn',v)))}</div><button type="button" className={styles.skip} onClick={()=>choose('addOn','')}>No add-on</button></Step>}
      {step === 8 && <Step title="Payment preference" copy="This is a preference only; no card is charged here."><div className={styles.choiceGrid}>{payments.map((p)=>cardButton(p.name,draft.paymentPreference===p.name,()=>choose('paymentPreference',p.name),p.instruction))}</div></Step>}
      {step === 9 && <Step title="Your contact" copy="Used only to coordinate this booking request."><div className={styles.fields}><Field label="Name"><input value={draft.customerName} maxLength={100} onChange={(e)=>choose('customerName',e.target.value)} /></Field><Field label="Phone / WhatsApp"><input value={draft.customerPhone} maxLength={30} placeholder="+92..." onChange={(e)=>choose('customerPhone',e.target.value)} /></Field><Field label="Notes" full><textarea value={draft.notes} maxLength={1000} onChange={(e)=>choose('notes',e.target.value)} placeholder="Arrival notes, dress direction, venue details…" /></Field></div></Step>}
      {step === 10 && <Step title="Review the request" copy="Nothing is charged here. Submission saves the request before opening WhatsApp."><Review draft={draft} data={data} /><label className={styles.consent}><input type="checkbox" checked={draft.lawfulUseConfirmed} onChange={(e)=>choose('lawfulUseConfirmed',e.target.checked)} /><span>I confirm I am 18+ and this request is for a lawful social/event companionship, hosting or creator appearance. No sexual services are requested.</span></label></Step>}
      {error && <div className={styles.error} role="alert">{error}</div>}
      <div className={styles.actions}>{step > 1 ? <button type="button" className="rafay-button" onClick={back}>Back</button> : <a className="rafay-button" href="/">Home</a>} {step < 10 ? <button type="button" className="rafay-button rafay-button--primary" onClick={next}>Continue</button> : <button type="button" className="rafay-button rafay-button--primary" disabled={submitting} onClick={submit}>{submitting ? 'Saving request…' : 'Save & continue to WhatsApp'}</button>}</div>
    </main>
  </div>;
}

function Step({ title, copy, children }: { title:string; copy:string; children:React.ReactNode }) { return <section className={styles.step}><span className="rafay-kicker">RAFAY private request</span><h2 className="rafay-display">{title}</h2><p>{copy}</p>{children}</section>; }
function Field({ label, children, full=false }: { label:string; children:React.ReactNode; full?:boolean }) { return <label className={`${styles.field} ${full ? styles.full : ''}`}><span>{label}</span>{children}</label>; }
function Review({ draft, data }: { draft:BookingDraft; data:SiteData }) { const profile=data.profiles.find(p=>p.id===draft.profileId); const pkg=data.packages.find(p=>p.id===draft.packageId); const rows=[['Profile',profile?.name],['Package',pkg?.name],['Date / time',`${draft.date} · ${draft.time}`],['City / venue',`${draft.city} · ${draft.venueType}`],['Occasion',draft.occasion],['Duration',draft.duration],['Add-on',draft.addOn||'None'],['Payment',draft.paymentPreference],['Contact',`${draft.customerName} · ${draft.customerPhone}`]]; return <div className={styles.review}>{rows.map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>; }
