'use client';

import { useMemo, useState } from 'react';
import type { Package, PaymentMethod, Profile, SiteData } from '@/lib/domain';
import { AdminShell, type AdminView } from './admin-shell';
import { ProfileEditor } from './profile-editor';
import { PackageEditor } from './package-editor';
import { ContentEditor } from './content-editor';
import { MediaManager } from './media-manager';
import { BookingsManager } from './bookings-manager';
import styles from './admin.module.css';

export function createBlankProfile(displayOrder: number, now = new Date().toISOString(), id = crypto.randomUUID()): Profile {
  return { id, name: '', label: '', bio: '', tags: [], images: [], coverImageUrl: '', active: false, adultConfirmed: true, displayOrder, availabilityNote: '', createdAt: now, updatedAt: now };
}

export function canPublishProfile(profile: Profile): boolean {
  return profile.adultConfirmed && Boolean(profile.name.trim() && profile.label.trim() && profile.bio.trim());
}

export function normalizeOrders<T extends { displayOrder: number }>(items: T[]): T[] {
  return items.map((item, displayOrder) => ({ ...item, displayOrder }));
}

type AdminSavePayload = { error?: string; data?: SiteData; etag?: string };

export async function readAdminJsonResponse(response: Response): Promise<AdminSavePayload> {
  const text = await response.text();
  if (!text.trim()) return { error: `Save failed (${response.status}).` };
  try {
    const payload = JSON.parse(text) as unknown;
    if (!payload || typeof payload !== 'object') {
      return { error: response.ok ? 'Save failed: invalid server response.' : `Save failed (${response.status}).` };
    }
    return payload as AdminSavePayload;
  } catch {
    return { error: response.ok ? 'Save failed: invalid server response.' : `Save failed (${response.status}).` };
  }
}

function newPackage(order: number): Package {
  return { id: crypto.randomUUID(), name: '', description: '', priceLabel: '', durationNote: '', active: false, displayOrder: order };
}

function newPayment(order: number): PaymentMethod {
  return { id: crypto.randomUUID(), name: '', instruction: '', active: false, displayOrder: order };
}

type Props = { secret: string; initialData: SiteData; initialEtag: string };

export function AdminClient({ secret, initialData, initialEtag }: Props) {
  const [view, setView] = useState<AdminView>('overview');
  const [draft, setDraft] = useState<SiteData>(initialData);
  const [etag, setEtag] = useState(initialEtag);
  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'error'|'conflict'>('idle');
  const [message, setMessage] = useState('');

  const activeProfiles = useMemo(() => draft.profiles.filter((p) => p.active && p.adultConfirmed).length, [draft.profiles]);
  const activePackages = useMemo(() => draft.packages.filter((p) => p.active).length, [draft.packages]);

  const patch = (next: Partial<SiteData>) => { setDraft((current) => ({ ...current, ...next })); setSaveState('idle'); setMessage(''); };

  const save = async () => {
    setSaveState('saving'); setMessage('');
    try {
      const response = await fetch(`/api/control/${encodeURIComponent(secret)}/site-data`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: draft, etag }) });
      const payload = await readAdminJsonResponse(response);
      if (response.status === 409) { setSaveState('conflict'); setMessage('This content changed in another tab. Refresh before saving again.'); return; }
      if (!response.ok) throw new Error(payload.error || `Save failed (${response.status}).`);
      if (!payload.data || typeof payload.etag !== 'string' || !payload.etag) throw new Error(payload.error || 'Save failed: invalid server response.');
      setDraft(payload.data); setEtag(payload.etag); setSaveState('saved'); setMessage('Saved. Public RAFAY content is now updated.');
    } catch (error) { setSaveState('error'); setMessage(error instanceof Error ? error.message : 'Save failed.'); }
  };

  const addProfile = () => patch({ profiles: [...draft.profiles, createBlankProfile(draft.profiles.length)] });
  const updateProfile = (id: string, next: Profile) => patch({ profiles: draft.profiles.map((item) => item.id === id ? { ...next, updatedAt: new Date().toISOString() } : item) });
  const removeProfile = (id: string) => patch({ profiles: normalizeOrders(draft.profiles.filter((item) => item.id !== id)) });
  const moveProfile = (id: string, direction: -1|1) => { const items = [...draft.profiles].sort((a,b)=>a.displayOrder-b.displayOrder); const index=items.findIndex((item)=>item.id===id); const target=index+direction; if(index<0||target<0||target>=items.length)return; [items[index],items[target]]=[items[target],items[index]]; patch({profiles:normalizeOrders(items)}); };
  const updatePackage = (id: string, next: Package) => patch({ packages: draft.packages.map((item) => item.id === id ? next : item) });
  const removePackage = (id: string) => patch({ packages: normalizeOrders(draft.packages.filter((item) => item.id !== id)) });
  const movePackage = (id: string, direction: -1|1) => { const items=[...draft.packages].sort((a,b)=>a.displayOrder-b.displayOrder); const i=items.findIndex((item)=>item.id===id); const t=i+direction; if(i<0||t<0||t>=items.length)return; [items[i],items[t]]=[items[t],items[i]]; patch({packages:normalizeOrders(items)}); };
  const updatePayment = (id: string, next: PaymentMethod) => patch({ paymentMethods: draft.paymentMethods.map((item) => item.id===id ? next : item) });
  const removePayment = (id: string) => patch({ paymentMethods: normalizeOrders(draft.paymentMethods.filter((item)=>item.id!==id)) });

  return <AdminShell view={view} onViewChange={setView} saveState={saveState} onSave={save} message={message}>
    {view === 'overview' && <section className={styles.panel}><span className="rafay-kicker">Overview</span><h1 className="rafay-display">RAFAY Control Center</h1><p className={styles.lead}>Everything important on the public booking experience is controlled here. No public admin link is exposed.</p><div className={styles.statGrid}><Stat label="Active profiles" value={String(activeProfiles)} /><Stat label="Active packages" value={String(activePackages)} /><Stat label="Payment methods" value={String(draft.paymentMethods.filter((p)=>p.active).length)} /><Stat label="Config version" value={`v${draft.version}`} /></div><div className={styles.notice}>Profiles, media, website content and booking requests are connected to the shared RAFAY server data.</div></section>}
    {view === 'profiles' && <section className={styles.panel}><Header eyebrow="Talent" title="Profiles" action="Add profile" onAction={addProfile}/><div className={styles.editorList}>{[...draft.profiles].sort((a,b)=>a.displayOrder-b.displayOrder).map((profile)=><ProfileEditor key={profile.id} profile={profile} onChange={(next)=>updateProfile(profile.id,next)} onDelete={()=>{if(confirm(`Delete profile ${profile.name || 'Untitled'}?`)) removeProfile(profile.id);}} onMoveUp={()=>moveProfile(profile.id,-1)} onMoveDown={()=>moveProfile(profile.id,1)} />)}</div></section>}
    {view === 'packages' && <section className={styles.panel}><Header eyebrow="Offers" title="Packages" action="Add package" onAction={()=>patch({packages:[...draft.packages,newPackage(draft.packages.length)]})}/><div className={styles.editorList}>{[...draft.packages].sort((a,b)=>a.displayOrder-b.displayOrder).map((item)=><PackageEditor key={item.id} item={item} onChange={(next)=>updatePackage(item.id,next)} onDelete={()=>{if(confirm(`Delete package ${item.name || 'Untitled'}?`)) removePackage(item.id);}} onMoveUp={()=>movePackage(item.id,-1)} onMoveDown={()=>movePackage(item.id,1)} />)}</div></section>}
    {view === 'booking-options' && <section className={styles.panel}><Header eyebrow="Wizard" title="Booking options"/><OptionEditor label="Venue types" values={draft.bookingOptions.venueTypes} onChange={(venueTypes)=>patch({bookingOptions:{...draft.bookingOptions,venueTypes}})} /><OptionEditor label="Occasions" values={draft.bookingOptions.occasions} onChange={(occasions)=>patch({bookingOptions:{...draft.bookingOptions,occasions}})} /><OptionEditor label="Durations" values={draft.bookingOptions.durations} onChange={(durations)=>patch({bookingOptions:{...draft.bookingOptions,durations}})} /><OptionEditor label="Add-ons" values={draft.bookingOptions.addOns} onChange={(addOns)=>patch({bookingOptions:{...draft.bookingOptions,addOns}})} /><OptionEditor label="Cities" values={draft.bookingOptions.cities} onChange={(cities)=>patch({bookingOptions:{...draft.bookingOptions,cities}})} /><label className={styles.toggle}><input type="checkbox" checked={draft.bookingOptions.allowFreeTextCity} onChange={(e)=>patch({bookingOptions:{...draft.bookingOptions,allowFreeTextCity:e.target.checked}})} /> Allow customer to type a city</label></section>}
    {view === 'payments' && <section className={styles.panel}><Header eyebrow="Preferences" title="Payments" action="Add method" onAction={()=>patch({paymentMethods:[...draft.paymentMethods,newPayment(draft.paymentMethods.length)]})}/><div className={styles.editorList}>{draft.paymentMethods.map((method,index)=><article className={styles.editorCard} key={method.id}><div className={styles.rowBetween}><strong>Method {index+1}</strong><button className={styles.danger} onClick={()=>{if(confirm(`Delete payment method ${method.name || 'Untitled'}?`)) removePayment(method.id);}}>Delete</button></div><div className={styles.fieldGrid}><Field label="Name"><input value={method.name} maxLength={80} onChange={(e)=>updatePayment(method.id,{...method,name:e.target.value})}/></Field><Field label="Public instruction"><input value={method.instruction} maxLength={500} onChange={(e)=>updatePayment(method.id,{...method,instruction:e.target.value})}/></Field></div><label className={styles.toggle}><input type="checkbox" checked={method.active} onChange={(e)=>updatePayment(method.id,{...method,active:e.target.checked})}/> Active</label></article>)}</div></section>}
    {view === 'website-content' && <ContentEditor data={draft} secret={secret} onChange={patch} />}
    {view === 'settings' && <section className={styles.panel}><Header eyebrow="System" title="Settings"/><div className={styles.fieldGrid}><Field label="Brand"><input value="RAFAY" disabled /></Field><Field label="Business WhatsApp"><input value={draft.whatsappNumber} maxLength={30} placeholder="+92..." onChange={(e)=>patch({whatsappNumber:e.target.value})}/></Field><Field label="Public contact"><input value={draft.publicContact} maxLength={160} onChange={(e)=>patch({publicContact:e.target.value})}/></Field><Field label="Payment / deposit note"><textarea value={draft.defaultPaymentNote} maxLength={500} onChange={(e)=>patch({defaultPaymentNote:e.target.value})}/></Field><Field label="Instagram"><input value={draft.socialLinks.instagram} onChange={(e)=>patch({socialLinks:{...draft.socialLinks,instagram:e.target.value}})}/></Field><Field label="Facebook"><input value={draft.socialLinks.facebook} onChange={(e)=>patch({socialLinks:{...draft.socialLinks,facebook:e.target.value}})}/></Field><Field label="TikTok"><input value={draft.socialLinks.tiktok} onChange={(e)=>patch({socialLinks:{...draft.socialLinks,tiktok:e.target.value}})}/></Field></div><div className={styles.notice}>Security: this dashboard has no password screen. Anyone with the full secret control URL can access it, so keep the URL private and rotate RAFAY_ADMIN_KEY if it leaks.</div></section>}
    {view === 'bookings' && <section className={styles.panel}><Header eyebrow="Requests" title="Bookings"/><BookingsManager secret={secret}/></section>}
    {view === 'media' && <section className={styles.panel}><Header eyebrow="Assets" title="Profile media"/><MediaManager secret={secret} profiles={draft.profiles} onProfilesChange={(profiles)=>patch({profiles})}/></section>}
  </AdminShell>;
}

function Stat({label,value}:{label:string;value:string}){return <article className={styles.stat}><span>{label}</span><strong>{value}</strong></article>}
function Header({eyebrow,title,action,onAction}:{eyebrow:string;title:string;action?:string;onAction?:()=>void}){return <div className={styles.sectionHeader}><div><span className="rafay-kicker">{eyebrow}</span><h1 className="rafay-display">{title}</h1></div>{action&&<button className="rafay-button rafay-button--primary" onClick={onAction}>{action}</button>}</div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className={styles.field}><span>{label}</span>{children}</label>}
function OptionEditor({label,values,onChange}:{label:string;values:string[];onChange:(values:string[])=>void}){return <div className={styles.optionGroup}><div className={styles.rowBetween}><strong>{label}</strong><button className={styles.smallButton} onClick={()=>onChange([...values,''])}>Add option</button></div>{values.map((value,index)=><div className={styles.optionRow} key={`${label}-${index}`}><input value={value} maxLength={100} onChange={(e)=>onChange(values.map((item,i)=>i===index?e.target.value:item))}/><button className={styles.smallButton} disabled={index===0} onClick={()=>{const copy=[...values];[copy[index-1],copy[index]]=[copy[index],copy[index-1]];onChange(copy)}}>↑</button><button className={styles.smallButton} disabled={index===values.length-1} onClick={()=>{const copy=[...values];[copy[index+1],copy[index]]=[copy[index],copy[index+1]];onChange(copy)}}>↓</button><button className={styles.danger} onClick={()=>onChange(values.filter((_,i)=>i!==index))}>Remove</button></div>)}</div>}
