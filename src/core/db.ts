import {openDB} from 'idb'
import type {Book,Chapter,ImgEntry} from './model'
// Lazy: IndexedDB baru dibuka saat dipakai (agar modul aman diimpor di tes Node).
let _p:ReturnType<typeof mk>|undefined
const mk=()=>openDB('bacabuku',2,{upgrade(d,old){
 if(old<1){d.createObjectStore('books',{keyPath:'id'});d.createObjectStore('chapters');d.createObjectStore('tr');d.createObjectStore('kv')}
 if(old<2)d.createObjectStore('images')}})
const P=()=>(_p??=mk())
export const listBooks=async():Promise<Book[]>=>(await P()).getAll('books')
export async function saveBook(b:Book,ch:Chapter[],images:ImgEntry[]=[]){const d=await P()
 for(const [path,v] of images)await d.put('images',v,b.id+':'+path)
 for(let i=0;i<ch.length;i++)await d.put('chapters',ch[i],b.id+':'+i)
 await d.put('books',b)}
export const loadChapter=async(id:string,i:number):Promise<Chapter|undefined>=>(await P()).get('chapters',id+':'+i)
export const imgGet=async(id:string,path:string):Promise<{type:string;data:ArrayBuffer}|undefined>=>(await P()).get('images',id+':'+path)
export async function deleteBook(id:string){const d=await P();const r=IDBKeyRange.bound(id+':',id+':\uffff');await d.delete('chapters',r);await d.delete('images',r);await d.delete('tr',r);await d.delete('kv','pos:'+id);await d.delete('kv','bm:'+id);await d.delete('books',id)}
export const trGet=async(k:string):Promise<string|undefined>=>(await P()).get('tr',k)
export const trPut=async(k:string,v:string)=>{await (await P()).put('tr',v,k)}
export const kvGet=async<T>(k:string):Promise<T|undefined>=>(await P()).get('kv',k)
export const kvSet=async(k:string,v:unknown)=>{await (await P()).put('kv',v,k)}
export interface Dump{v:1;app:'bacabuku';full:boolean;tr:[string,unknown][];kv:[string,unknown][];books?:Book[];chapters?:[string,Chapter][];images?:[string,{type:string;b64:string}][]}
const toB64=(b:ArrayBuffer)=>{let s='';const u=new Uint8Array(b);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s)}
const fromB64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer as ArrayBuffer
export async function dump(full:boolean):Promise<Dump>{
 const d=await P()
 const pairs=async(s:'tr'|'kv'|'chapters'):Promise<[string,unknown][]>=>{const ks=await d.getAllKeys(s);const vs=await d.getAll(s);return ks.map((k,i)=>[String(k),vs[i]])}
 const o:Dump={v:1,app:'bacabuku',full,tr:await pairs('tr'),kv:await pairs('kv')}
 if(full){o.books=await d.getAll('books');o.chapters=(await pairs('chapters')) as [string,Chapter][]
  const ks=await d.getAllKeys('images'),vs=await d.getAll('images') as {type:string;data:ArrayBuffer}[]
  o.images=ks.map((k,i)=>[String(k),{type:vs[i].type,b64:toB64(vs[i].data)}])}
 return o
}
const isPairs=(x:unknown):x is [string,unknown][]=>Array.isArray(x)&&x.every(p=>Array.isArray(p)&&p.length===2&&typeof p[0]==='string')
export async function restore(o:unknown){
 const x=o as Partial<Dump>|null
 if(!x||x.app!=='bacabuku'||x.v!==1||!isPairs(x.tr)||!isPairs(x.kv))throw new Error('Berkas bukan cadangan Baca Buku yang valid.')
 if(x.full&&(!Array.isArray(x.books)||!isPairs(x.chapters)))throw new Error('Cadangan penuh rusak.')
 const d=await P();const tx=d.transaction(['tr','kv','books','chapters','images'],'readwrite')
 for(const [k,v] of x.tr)await tx.objectStore('tr').put(v,k)
 for(const [k,v] of x.kv)await tx.objectStore('kv').put(v,k)
 if(x.full){for(const [k,v] of x.chapters as [string,Chapter][])await tx.objectStore('chapters').put(v,k)
  for(const [k,v] of x.images??[])await tx.objectStore('images').put({type:v.type,data:fromB64(v.b64)},k)
  for(const b of x.books as Book[])await tx.objectStore('books').put(b)}
 await tx.done
}
