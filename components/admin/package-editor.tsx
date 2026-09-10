'use client';

import type { Package } from '@/lib/domain';
import styles from './admin.module.css';

export function PackageEditor({item,onChange,onDelete,onMoveUp,onMoveDown}:{item:Package;onChange:(item:Package)=>void;onDelete:()=>void;onMoveUp:()=>void;onMoveDown:()=>void}){
  return <article className={styles.editorCard}><div className={styles.rowBetween}><div><span className="rafay-kicker">Package {item.displayOrder+1}</span><h3>{item.name||'Untitled package'}</h3></div><div className={styles.miniActions}><button className={styles.smallButton} onClick={onMoveUp}>↑</button><button className={styles.smallButton} onClick={onMoveDown}>↓</button><button className={styles.danger} onClick={onDelete}>Delete</button></div></div><div className={styles.fieldGrid}><Field label="Name"><input value={item.name} maxLength={100} onChange={(e)=>onChange({...item,name:e.target.value})}/></Field><Field label="Price label"><input value={item.priceLabel} maxLength={100} onChange={(e)=>onChange({...item,priceLabel:e.target.value})}/></Field><Field label="Description"><textarea value={item.description} maxLength={800} onChange={(e)=>onChange({...item,description:e.target.value})}/></Field><Field label="Duration note"><input value={item.durationNote} maxLength={160} onChange={(e)=>onChange({...item,durationNote:e.target.value})}/></Field></div><label className={styles.toggle}><input type="checkbox" checked={item.active} onChange={(e)=>onChange({...item,active:e.target.checked})}/> Active</label></article>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className={styles.field}><span>{label}</span>{children}</label>}
