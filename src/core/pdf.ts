import {sha} from './epub'
import {pdfToParas} from './pdftext'
import {pageJpeg} from './pdfrender'
import type {PageT} from './pdftext'
import type {Block,Chapter,ImgEntry} from './model'
// PDF lewat pdf.js. PDF bertext dibaca langsung; PDF pindaian (gambar) dibuat sebagai buku dengan bab "menunggu OCR" (lihat ocr.ts).
export async function openPdf(data:ArrayBuffer):Promise<any>{
 const pdfjs:any=await import('pdfjs-dist')
 pdfjs.GlobalWorkerOptions.workerSrc=(await import('pdfjs-dist/build/pdf.worker.min.js?url')).default
 try{return await pdfjs.getDocument({data:new Uint8Array(data.slice(0))}).promise}  // salinan: pdf.js memindahkan buffer ke worker
 catch(e){throw new Error((e as {name?:string})?.name==='PasswordException'?'PDF ini dilindungi kata sandi dan belum didukung.':'Berkas bukan PDF yang valid.')}
}
interface Bound{title:string;from:number;to:number}
async function getBounds(doc:any,n:number):Promise<Bound[]>{
 let starts:{title:string;page:number}[]=[]
 try{const ol=await doc.getOutline()
  if(Array.isArray(ol))for(const o of ol){let d=o.dest;if(typeof d==='string')d=await doc.getDestination(d)
   if(Array.isArray(d)&&d[0]!=null){const pi=typeof d[0]==='object'?await doc.getPageIndex(d[0]):Number(d[0]);starts.push({title:String(o.title??'').trim(),page:pi})}}
 }catch{/* tanpa daftar isi */}
 starts=starts.filter(s=>Number.isFinite(s.page)&&s.page>=0&&s.page<n).sort((a,b)=>a.page-b.page).filter((s,i,a)=>i===0||s.page!==a[i-1].page)
 const bounds:Bound[]=[]
 if(starts.length>=2)starts.forEach((s,i)=>bounds.push({title:s.title,from:i===0?0:s.page,to:i+1<starts.length?starts[i+1].page-1:n-1}))
 else for(let f=0;f<n;f+=10)bounds.push({title:'',from:f,to:Math.min(n-1,f+9)})
 return bounds
}
const range=(f:number,t:number)=>`Halaman ${f+1}${t>f?'–'+(t+1):''}`
function cap(bounds:Bound[],max:number){const out:Bound[]=[]
 for(const b of bounds){if(b.to-b.from+1<=max){out.push(b);continue}
  for(let f=b.from;f<=b.to;f+=max){const t=Math.min(b.to,f+max-1);out.push({title:b.title?`${b.title} (hlm. ${f+1}–${t+1})`:'',from:f,to:t})}}
 return out}
export async function scanRanges(doc:any){return cap(await getBounds(doc,doc.numPages),12).map(x=>({title:x.title||range(x.from,x.to),from:x.from,to:x.to}))}
export async function parsePdf(buf:ArrayBuffer,name=''){
 const doc=await openPdf(buf)
 try{
  const n:number=doc.numPages;const pages:PageT[]=[]
  for(let p=1;p<=n;p++){
   const page=await doc.getPage(p);const vp=page.getViewport({scale:1});const tc=await page.getTextContent()
   const items=(tc.items as any[]).filter(i=>typeof i.str==='string'&&i.str!=='')
    .map(i=>({s:i.str as string,x:i.transform[4] as number,y:i.transform[5] as number,h:Math.abs(i.transform[3] as number)||(i.height as number)||10,w:(i.width as number)||0}))
   pages.push({width:vp.width as number,height:vp.height as number,items});page.cleanup()}
  const md:any=await doc.getMetadata().catch(()=>null)
  const base=name.replace(/\.[^.]+$/,'').trim()   // judul = nama berkas hasil unduhan
  const author=String(md?.info?.Author??'').trim()||'Tidak diketahui'
  const jpg=await pageJpeg(doc,1,420)           // sampul = halaman pertama
  const images:ImgEntry[]=jpg?[['pdf/cover',jpg]]:[];const cover=jpg?'pdf/cover':''
  const chars=pages.reduce((a,p)=>a+p.items.reduce((b,i)=>b+i.s.length,0),0)
  if(chars<Math.max(50,n*15)){ // PDF pindaian: bab menunggu OCR
   const rs=await scanRanges(doc);const chapters:Chapter[]=rs.map((b,ci)=>({id:String(ci),title:b.title,
    blocks:[{id:`${ci}-0`,kind:'paragraph' as const,text:'Halaman ini belum dibaca (OCR). Mohon tunggu…',hash:'ocr'}],ocr:{from:b.from,to:b.to}}))
   return{title:base||String(md?.info?.Title??'').trim()||'Tanpa judul',author,chapters,images,cover,file:buf.slice(0),scan:true,pages:n,ranges:rs.map(x=>[x.from,x.to] as [number,number])}}
  const paras=pdfToParas(pages);const chapters:Chapter[]=[]
  for(const b of await getBounds(doc,n)){
   const ps=paras.filter(p=>p.page>=b.from&&p.page<=b.to);if(!ps.length)continue
   const ci=chapters.length;const blocks:Block[]=[]
   for(const p of ps)blocks.push({id:`${ci}-${blocks.length}`,kind:p.kind,text:p.text,hash:await sha(p.text)})
   chapters.push({id:String(ci),title:b.title||range(b.from,b.to),blocks})}
  if(!chapters.length)throw new Error('Tidak ada teks yang bisa dibaca di PDF ini.')
  const title=base||String(md?.info?.Title??'').trim()||chapters.flatMap(c=>c.blocks).find(b=>b.kind==='heading')?.text||'Tanpa judul'
  return{title,author,chapters,images,cover}
 }finally{try{await doc.destroy()}catch{/* abaikan */}}
}
