import type {Book,Chapter} from './model'
import {trGet,trPut,loadChapter} from './db'
export class Fatal extends Error{}
export interface TranslationProvider{id:string;label:string;maxChars:number;translate(t:string[],s:AbortSignal):Promise<string[]>}
const sleep=(ms:number,s:AbortSignal)=>new Promise<void>((res,rej)=>{if(s.aborted)return rej(new DOMException('batal','AbortError'));const t=setTimeout(res,ms);s.addEventListener('abort',()=>{clearTimeout(t);rej(new DOMException('batal','AbortError'))},{once:true})})
export const mock:TranslationProvider={id:'mock',label:'MOCK (bukan terjemahan sungguhan)',maxChars:1500,async translate(t,s){await sleep(120,s);return t.map(x=>'[MOCK] '+x)}}
export const trKey=(b:string,id:string,h:string,p:string)=>`${b}:${id}:${h}:${p}`
export function split(t:string,max:number){const out:string[]=[];let cur='';for(const s of t.split(/(?<=[.!?])\s+/)){if(cur&&cur.length+s.length+1>max){out.push(cur);cur=''}cur=cur?cur+' '+s:s;while(cur.length>max){out.push(cur.slice(0,max));cur=cur.slice(max)}}if(cur)out.push(cur);return out}
async function retry<T>(f:()=>Promise<T>,s:AbortSignal,n=3):Promise<T>{for(let a=0;;a++){try{return await f()}catch(e){if(s.aborted||e instanceof Fatal||a>=n-1)throw e;await sleep(500*2**a,s)}}}
export async function loadTr(b:string,ch:Chapter,p:string){const r:Record<string,string>={};for(const k of ch.blocks){const v=await trGet(trKey(b,k.id,k.hash,p));if(v)r[k.id]=v}return r}
export const estimate=(ch:Chapter)=>ch.blocks.reduce((a,k)=>a+(k.kind==='image'?0:k.text.length),0)
export async function translateChapter(b:string,ch:Chapter,p:TranslationProvider,onProg:(d:number,t:number)=>void,s:AbortSignal){
 const have=await loadTr(b,ch,p.id);const todo=ch.blocks.filter(k=>k.kind!=='image'&&!have[k.id])
 const total=ch.blocks.filter(k=>k.kind!=='image').length
 let n=total-todo.length;onProg(n,total)
 const units=todo.flatMap(k=>split(k.text,p.maxChars).map((t,i,a)=>({k,t,last:i===a.length-1})))
 const part=new Map<string,string[]>()
 for(let i=0;i<units.length;){
  let j=i,len=0
  while(j<units.length&&j-i<50&&len+units[j].t.length<=p.maxChars){len+=units[j].t.length;j++}
  if(j===i)j++
  const res=await retry(()=>p.translate(units.slice(i,j).map(u=>u.t),s),s)
  if(res.length!==j-i)throw new Error('Jumlah hasil terjemahan tidak sama dengan permintaan.')
  for(let x=0;x<res.length;x++){const u=units[i+x];const a=part.get(u.k.id)??[];a.push(res[x]);part.set(u.k.id,a)
   if(u.last){await trPut(trKey(b,u.k.id,u.k.hash,p.id),a.join(' '));part.delete(u.k.id);onProg(++n,total)}}
  i=j
 }
}
export async function bookTodo(b:Book,p:string){let chars=0,blocks=0
 for(let ci=0;ci<b.toc.length;ci++){const ch=await loadChapter(b.id,ci);if(!ch)continue;const have=await loadTr(b.id,ch,p)
  for(const k of ch.blocks)if(k.kind!=='image'&&k.text&&!have[k.id]){chars+=k.text.length;blocks++}}
 return{chars,blocks}}
export async function translateBook(b:Book,p:TranslationProvider,onProg:(ci:number,n:number,d:number,t:number)=>void,s:AbortSignal){
 for(let ci=0;ci<b.toc.length;ci++){const ch=await loadChapter(b.id,ci);if(!ch)continue
  await translateChapter(b.id,ch,p,(d,t)=>onProg(ci,b.toc.length,d,t),s)}}
