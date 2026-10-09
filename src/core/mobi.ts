import {sha,chapterTitle} from './epub'
import type {Block,BlockKind,Chapter,ImgEntry} from './model'
const clean=(s:string|null|undefined)=>(s??'').replace(/\s+/g,' ').trim()
const MAXIMG=6e6
interface Item{kind:BlockKind;text:string;src?:string}
type Grab=(s:string)=>Promise<string>
const strip=(h:string)=>h.replace(/<\?xml[^>]*\?>/gi,'').replace(/<!DOCTYPE[^>]*>/gi,'')
// Untuk KF8 (XHTML rapi): hanya h/p/li/img.
async function extract(html:string,grab:Grab){
 const doc=new DOMParser().parseFromString(strip(html),'text/html')
 const out:Item[]=[]
 for(const el of [...doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,img')]){
  if(el.tagName==='IMG'){const k=await grab(el.getAttribute('src')??'');if(k)out.push({kind:'image',text:clean(el.getAttribute('alt')),src:k});continue}
  if(el.tagName==='LI'&&el.querySelector('p'))continue
  const text=clean(el.textContent);if(!text)continue
  out.push({kind:/^H\d$/.test(el.tagName)?'heading':el.closest('blockquote')?'quote':'paragraph',text})}
 if(!out.some(o=>o.kind!=='image')){
  doc.body.querySelectorAll('br').forEach(b=>b.replaceWith('\n'))
  for(const line of (doc.body.textContent??'').split(/\n+/)){const text=clean(line);if(text)out.push({kind:'paragraph',text})}}
 return out
}
// Untuk MOBI lama (HTML longgar: div, br, font, dll.): ambil blok "daun", pisahkan paragraf di <br><br>.
const BLOCKS='p,div,h1,h2,h3,h4,h5,h6,li,blockquote,td,center,section'
async function extractLoose(html:string,grab:Grab,rec:(n:number)=>Promise<string>){
 const doc=new DOMParser().parseFromString(strip(html),'text/html')
 doc.body.querySelectorAll('br').forEach(b=>b.replaceWith('\n'))
 const out:Item[]=[];let got=0
 for(const el of [...doc.body.querySelectorAll(BLOCKS+',img')]){
  if(el.tagName==='IMG'){const ri=Number.parseInt(el.getAttribute('recindex')??'',10)
   const k=Number.isFinite(ri)?await rec(ri):await grab(el.getAttribute('src')??'');if(k)out.push({kind:'image',text:clean(el.getAttribute('alt')),src:k});continue}
  if(el.querySelector(BLOCKS))continue
  const kind:BlockKind=/^H\d$/.test(el.tagName)?'heading':el.tagName==='BLOCKQUOTE'?'quote':'paragraph'
  for(const part of (el.textContent??'').split(/\n\s*\n/)){const text=clean(part);if(text){out.push({kind,text});got+=text.length}}}
 if(got<clean(doc.body.textContent).length*0.5){ // banyak teks di luar blok: ambil per baris
  const imgs=out.filter(o=>o.kind==='image');out.length=0;out.push(...imgs)
  for(const line of (doc.body.textContent??'').split(/\n+/)){const text=clean(line);if(text)out.push({kind:'paragraph',text})}}
 return out
}
// MOBI/AZW3 lewat @lingo-reader/mobi-parser. KF8 dicoba dulu; MOBI lama dibaca dari teks mentahnya (parser bab bawaan pustaka memotong isi).
export async function parseMobi(buf:ArrayBuffer,name=''){
 const lib:any=await import('@lingo-reader/mobi-parser')
 const errs:string[]=[];let book:any,kind=''
 for(const [k,init] of [['KF8',lib.initKf8File],['MOBI',lib.initMobiFile]] as [string,any][]){
  try{book=await init(new Uint8Array(buf));kind=k;if(book)break}catch(e){errs.push(`${k}: ${e instanceof Error?e.message:String(e)}`)}}
 if(!book)throw new Error('Gagal membaca berkas MOBI/AZW3 (mungkin terlindungi DRM atau rusak). '+errs.join(' | '))
 const images=new Map<string,{type:string;data:ArrayBuffer}>(),keyOf=new Map<string,string>()
 const grab:Grab=async(src)=>{
  if(keyOf.has(src))return keyOf.get(src)??''
  if(!/^(blob:|data:)/i.test(src))return ''
  try{const b=await (await fetch(src)).blob();if(!b.type.startsWith('image/')||b.size>MAXIMG)return ''
   const key=`mobi/${keyOf.size}`;images.set(key,{type:b.type,data:await b.arrayBuffer()});keyOf.set(src,key);return key}catch{return ''}}
 try{
  const md:any=(typeof book.getMetadata==='function'?await book.getMetadata():null)??{}
  const au:any=md.author
  const author=(Array.isArray(au)?au.map((x:any)=>typeof x==='string'?x:x?.name??'').filter(Boolean).join(', '):typeof au==='string'?au:au?.name??'').trim()
  let groups:Item[][]=[];let failed=0
  if(kind==='KF8'){
   const spine:any[]=await book.getSpine()
   for(const item of spine){
    let html='';try{const r:any=await book.loadChapter(item.id);html=String(r?.html??'')}catch{failed++}
    const raw=await extract(html,grab);if(raw.length)groups.push(raw)}
  }else{
   const mf:any=book.mobiFile
   if(mf.palmdocHeader?.encryption)throw new Error('Berkas ini terenkripsi (DRM) dan tidak bisa dibaca.')
   const parts:Uint8Array[]=[];for(let i=0;i<mf.palmdocHeader.numTextRecords;i++)parts.push(mf.loadTextBuffer(i))
   const all=new Uint8Array(parts.reduce((a,p)=>a+p.length,0));let o=0;for(const p of parts){all.set(p,o);o+=p.length}
   const rec=async(n:number)=>{const key='mobi/r'+n;if(images.has(key))return key
    try{const {type,raw}=mf.loadResource(n-1);if(!String(type).startsWith('image/')||raw.length>MAXIMG)return ''
     images.set(key,{type:String(type),data:raw.slice().buffer as ArrayBuffer});return key}catch{return ''}}
   for(const seg of String(mf.decode(all)).split(/<\s*(?:mbp:)?pagebreak[^>]*>/i)){const r=await extractLoose(seg,grab,rec);if(r.length)groups.push(r)}
   const flat=groups.flat()
   if(groups.length<=2&&flat.length>120){ // tanpa pagebreak: bagi berdasarkan judul / jumlah paragraf
    groups=[];let cur:Item[]=[]
    for(const b of flat){if(cur.length&&((b.kind==='heading'&&cur.length>=15)||cur.length>=80)){groups.push(cur);cur=[]};cur.push(b)}
    if(cur.length)groups.push(cur)}
  }
  const chapters:Chapter[]=[];let textChars=0
  for(const raw of groups){
   const ci=chapters.length;const blocks:Block[]=[]
   for(const b of raw){textChars+=b.text.length
    blocks.push({id:`${ci}-${blocks.length}`,kind:b.kind,text:b.text,hash:await sha(b.src??b.text),...(b.src?{src:b.src}:{})})}
   chapters.push({id:String(ci),title:chapterTitle(blocks)||`Bagian ${ci+1}`,blocks})}
  if(!chapters.length||(chapters.length<=1&&textChars<2000&&buf.byteLength>300000))
   throw new Error('Isi buku tidak terbaca (format Kindle yang belum didukung atau terlindungi DRM). '+errs.join(' | ')+(failed?` | ${failed} bagian gagal dimuat`:''))
  let cover=''
  try{const c:any=await book.getCoverImage?.();if(typeof c==='string'&&c)cover=await grab(c)}catch{/* tanpa sampul */}
  let title=clean(String(md.title??''))
  if(!title||/^unknown$/i.test(title))title=name.replace(/\.[^.]+$/,'').trim()||chapters.flatMap(c=>c.blocks).find(b=>b.kind==='heading')?.text||'Tanpa judul'
  return{title,author:author||'Tidak diketahui',chapters,images:[...images] as ImgEntry[],cover}
 }finally{try{book.destroy?.()}catch{/* abaikan */}}
}
