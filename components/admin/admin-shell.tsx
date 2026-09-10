'use client';

import { useState } from 'react';
import styles from './admin.module.css';

export type AdminView = 'overview'|'profiles'|'packages'|'booking-options'|'payments'|'bookings'|'website-content'|'media'|'settings';

const nav: {id:AdminView;label:string}[] = [
  {id:'overview',label:'Overview'},{id:'profiles',label:'Profiles'},{id:'packages',label:'Packages'},{id:'booking-options',label:'Booking Options'},{id:'payments',label:'Payments'},{id:'bookings',label:'Bookings'},{id:'website-content',label:'Website Content'},{id:'media',label:'Media'},{id:'settings',label:'Settings'}
];

export function AdminShell({view,onViewChange,children,onSave,saveState,message}:{view:AdminView;onViewChange:(view:AdminView)=>void;children:React.ReactNode;onSave:()=>void;saveState:string;message:string}){
  const [open,setOpen]=useState(false);
  const go=(id:AdminView)=>{onViewChange(id);setOpen(false)};
  return <div className={styles.shell}>
    <aside className={`${styles.sidebar} ${open?styles.sidebarOpen:''}`}><button className={styles.mobileClose} onClick={()=>setOpen(false)}>×</button><div className={styles.brand}>RAFAY <small>CONTROL</small></div><nav>{nav.map((item)=><button key={item.id} className={view===item.id?styles.active:''} onClick={()=>go(item.id)}>{item.label}</button>)}</nav><div className={styles.security}>Hidden URL · no login screen<br/>Keep this control link private.</div></aside>
    <div className={styles.workspace}><header className={styles.topbar}><button className={styles.mobileMenu} onClick={()=>setOpen(true)}>☰</button><div><strong>RAFAY</strong><span>{nav.find((item)=>item.id===view)?.label}</span></div><div className={styles.saveWrap}>{message&&<span className={`${styles.saveMessage} ${saveState==='error'||saveState==='conflict'?styles.saveError:''}`}>{message}</span>}<button className="rafay-button rafay-button--primary" disabled={saveState==='saving'} onClick={onSave}>{saveState==='saving'?'Saving…':'Save changes'}</button></div></header><main className={styles.content}>{children}</main></div>
  </div>;
}
