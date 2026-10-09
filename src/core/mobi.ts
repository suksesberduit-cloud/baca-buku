import {sha,chapterTitle} from './epub'
import type {Block,BlockKind,Chapter,ImgEntry} from './model'
const clean=(s:string|null|undefined)=>(s??'').replace(/\s+/g,' ').trim()
function extract(html:string){
 const doc=new DOMParser().parseFromString(html,'text/html')
 const out:{kind:BlockKind;text:string}[]=[]
 for(const el of [...doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li')]){
  if(el.tagName==='LI'&&el.querySelector('p'))continue
  const text=clean(el.textContent);if(!text)continue
  out.push({kind:/^H\d$/.test(el.tagName)?'heading':el.closest('blockquote')?'quote':'paragraph',text})}
 if(!out.length){ // MOBI lama sering hanya memakai <br> tanpa <p>
  doc.body.querySelectorAll('br').forEach(b=>b.replaceWith('\n'))
  for(const line of (doc.body.textContent??'').split(/\n+/)){const text=clean(line);if(text)out.push({kind:'paragraph',text})}}
 return out
}
// MOBI/AZW3 (KF8) lewat @lingo-reader/mobi-parser. Teks saja; gambar dan sampul belum diambil.
export async function parseMobi(buf:ArrayBuffer,name=''){
 const lib:any=await import('@lingo-reader/mobi-parser')
 const order=/\.(azw3|kf8)$/i.test(name)?[lib.initKf8File,lib.initMobiFile]:[lib.initMobiFile,lib.initKf8File]
 let book:any,last:unknown
 for(const init of order){try{book=await init(new Uint8Array(buf));if(book)break}catch(e){last=e}}
 if(!book)throw new Error('Gagal membaca berkas MOBI/AZW3. Mungkin terlindungi DRM atau rusak. '+(last instanceof Error?last.message:''))
 try{
  const md:any=(typeof book.getMetadata==='function'?await book.getMetadata():null)??{}
  const au:any=md.author
  const author=(Array.isArray(au)?au.map((x:any)=>typeof x==='string'?x:x?.name??'').filter(Boolean).join(', '):typeof au==='string'?au:au?.name??'').trim()
  const spine:any[]=await book.getSpine()
  const chapters:Chapter[]=[]
  for(const item of spine){
   const r:any=await book.loadChapter(item.id)
   const raw=extract(String(r?.html??''));if(!raw.length)continue
   const ci=chapters.length;const blocks:Block[]=[]
   for(const b of raw)blocks.push({id:`${ci}-${blocks.length}`,kind:b.kind,text:b.text,hash:await sha(b.text)})
   chapters.push({id:String(ci),title:chapterTitle(blocks)||`Bagian ${ci+1}`,blocks})}
  if(!chapters.length)throw new Error('Tidak ada teks yang bisa dibaca di berkas ini (mungkin terlindungi DRM).')
  return{title:clean(String(md.title??''))||name.replace(/\.[^.]+$/,'')||'Tanpa judul',author:author||'Tidak diketahui',chapters,images:[] as ImgEntry[],cover:''}
 }finally{try{book.destroy?.()}catch{/* abaikan */}}
}
