import {sha,chapterTitle} from './epub'
import type {Block,BlockKind,Chapter,ImgEntry} from './model'
const clean=(s:string|null|undefined)=>(s??'').replace(/\s+/g,' ').trim()
const MAXIMG=6e6
interface Item{kind:BlockKind;text:string;src?:string}
async function extract(html:string,grab:(s:string)=>Promise<string>){
 const doc=new DOMParser().parseFromString(html.replace(/<\?xml[^>]*\?>/gi,'').replace(/<!DOCTYPE[^>]*>/gi,''),'text/html')
 const out:Item[]=[]
 for(const el of [...doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,img')]){
  if(el.tagName==='IMG'){const k=await grab(el.getAttribute('src')??'');if(k)out.push({kind:'image',text:clean(el.getAttribute('alt')),src:k});continue}
  if(el.tagName==='LI'&&el.querySelector('p'))continue
  const text=clean(el.textContent);if(!text)continue
  out.push({kind:/^H\d$/.test(el.tagName)?'heading':el.closest('blockquote')?'quote':'paragraph',text})}
 if(!out.some(o=>o.kind!=='image')){ // MOBI lama sering hanya memakai <br> tanpa <p>
  doc.body.querySelectorAll('br').forEach(b=>b.replaceWith('\n'))
  for(const line of (doc.body.textContent??'').split(/\n+/)){const text=clean(line);if(text)out.push({kind:'paragraph',text})}}
 return out
}
// MOBI/AZW3 (KF8) lewat @lingo-reader/mobi-parser.
// KF8 selalu dicoba lebih dulu: berkas KF8/kombinasi TIDAK boleh dibaca dengan parser MOBI lama (hasilnya terpotong).
export async function parseMobi(buf:ArrayBuffer,name=''){
 const lib:any=await import('@lingo-reader/mobi-parser')
 const errs:string[]=[];let book:any,kind=''
 for(const [k,init] of [['KF8',lib.initKf8File],['MOBI',lib.initMobiFile]] as [string,any][]){
  try{book=await init(new Uint8Array(buf));kind=k;if(book)break}catch(e){errs.push(`${k}: ${e instanceof Error?e.message:String(e)}`)}}
 if(!book)throw new Error('Gagal membaca berkas MOBI/AZW3 (mungkin terlindungi DRM atau rusak). '+errs.join(' | '))
 const images=new Map<string,{type:string;data:ArrayBuffer}>(),keyOf=new Map<string,string>()
 const grab=async(src:string)=>{
  if(keyOf.has(src))return keyOf.get(src)??''
  if(!/^(blob:|data:)/i.test(src))return ''
  try{const b=await (await fetch(src)).blob();if(!b.type.startsWith('image/')||b.size>MAXIMG)return ''
   const key=`mobi/${keyOf.size}`;images.set(key,{type:b.type,data:await b.arrayBuffer()});keyOf.set(src,key);return key}catch{return ''}}
 try{
  const md:any=(typeof book.getMetadata==='function'?await book.getMetadata():null)??{}
  const au:any=md.author
  const author=(Array.isArray(au)?au.map((x:any)=>typeof x==='string'?x:x?.name??'').filter(Boolean).join(', '):typeof au==='string'?au:au?.name??'').trim()
  const spine:any[]=await book.getSpine()
  const chapters:Chapter[]=[];let textChars=0,failed=0
  for(const item of spine){
   let html=''
   try{const r:any=await book.loadChapter(item.id);html=String(r?.html??'')}catch{failed++;html=String(item?.text??'')}
   const raw=await extract(html,grab);if(!raw.length)continue
   const ci=chapters.length;const blocks:Block[]=[]
   for(const b of raw){textChars+=b.text.length
    blocks.push({id:`${ci}-${blocks.length}`,kind:b.kind,text:b.text,hash:await sha(b.src??b.text),...(b.src?{src:b.src}:{})})}
   chapters.push({id:String(ci),title:chapterTitle(blocks)||`Bagian ${ci+1}`,blocks})}
  if(!chapters.length||(kind==='MOBI'&&chapters.length<=1&&textChars<2000&&buf.byteLength>300000))
   throw new Error('Isi buku tidak terbaca (format Kindle yang belum didukung atau terlindungi DRM). '+errs.join(' | ')+(failed?` | ${failed} bagian gagal dimuat`:''))
  let cover=''
  try{const c:any=await book.getCoverImage?.();if(typeof c==='string'&&c)cover=await grab(c)}catch{/* tanpa sampul */}
  let title=clean(String(md.title??''))
  if(!title||/^unknown$/i.test(title))title=name.replace(/\.[^.]+$/,'').trim()||chapters.flatMap(c=>c.blocks).find(b=>b.kind==='heading')?.text||'Tanpa judul'
  return{title,author:author||'Tidak diketahui',chapters,images:[...images] as ImgEntry[],cover}
 }finally{try{book.destroy?.()}catch{/* abaikan */}}
}
