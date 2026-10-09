import type {Book} from './model'
import {loadChapter} from './db'
import {loadTr} from './translate'
export interface Hit{ci:number;id:string;snip:string}
export function find(t:string,q:string){
 const i=t.toLowerCase().indexOf(q.toLowerCase());if(i<0)return null
 const a=Math.max(0,i-30),e=i+q.length+50
 return (a>0?'…':'')+t.slice(a,e)+(e<t.length?'…':'')
}
// provId=null: cari di teks asli; selain itu cari di terjemahan penyedia tersebut.
export async function searchBook(b:Book,q:string,provId:string|null,max=100){
 const out:Hit[]=[];if(q.trim().length<2)return out
 for(let ci=0;ci<b.toc.length&&out.length<max;ci++){
  const ch=await loadChapter(b.id,ci);if(!ch||ch.ocr)continue
  const tr=provId?await loadTr(b.id,ch,provId):null
  for(const k of ch.blocks){if(k.kind==='image')continue;const s=find(tr?(tr[k.id]??''):k.text,q.trim());if(s){out.push({ci,id:k.id,snip:s});if(out.length>=max)break}}
 }
 return out
}
