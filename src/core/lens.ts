import type {Book} from './model'
import {kvGet,kvSet,loadChapter} from './db'
import {chLen} from './progress'
/** Panjang tiap bab (karakter). Dihitung sekali per buku lalu disimpan, jadi buka berikutnya instan. */
export async function chapterLens(b:Book):Promise<number[]>{
 const key='len:'+b.id
 const c=await kvGet<number[]>(key)
 if(Array.isArray(c)&&c.length===b.toc.length)return c
 const out:number[]=[]
 for(let i=0;i<b.toc.length;i++){const ch=await loadChapter(b.id,i);out.push(ch?chLen(ch):0)}
 await kvSet(key,out);return out
}
