import {sha} from './epub'
import {pdfToParas} from './pdftext'
import type {PageT} from './pdftext'
import type {Block,Chapter,ImgEntry} from './model'
// PDF lewat pdf.js: hanya PDF yang berisi teks. PDF hasil pindaian (gambar) tidak didukung (tanpa OCR).
export async function parsePdf(buf:ArrayBuffer,name=''){
 const pdfjs:any=await import('pdfjs-dist')
 pdfjs.GlobalWorkerOptions.workerSrc=(await import('pdfjs-dist/build/pdf.worker.min.js?url')).default
 let doc:any
 try{doc=await pdfjs.getDocument({data:new Uint8Array(buf.slice(0))}).promise}  // salinan: pdf.js memindahkan buffer ke worker
 catch(e){throw new Error((e as {name?:string})?.name==='PasswordException'?'PDF ini dilindungi kata sandi dan belum didukung.':'Berkas bukan PDF yang valid.')}
 try{
  const pages:PageT[]=[]
  for(let p=1;p<=doc.numPages;p++){
   const page=await doc.getPage(p);const vp=page.getViewport({scale:1});const tc=await page.getTextContent()
   const items=(tc.items as any[]).filter(i=>typeof i.str==='string'&&i.str!=='')
    .map(i=>({s:i.str as string,x:i.transform[4] as number,y:i.transform[5] as number,h:Math.abs(i.transform[3] as number)||(i.height as number)||10,w:(i.width as number)||0}))
   pages.push({width:vp.width as number,height:vp.height as number,items});page.cleanup()}
  const chars=pages.reduce((a,p)=>a+p.items.reduce((b,i)=>b+i.s.length,0),0)
  if(chars<Math.max(50,pages.length*15))throw new Error('PDF ini tampaknya hasil pindaian (hanya gambar) tanpa teks. OCR tidak didukung.')
  const paras=pdfToParas(pages)
  let starts:{title:string;page:number}[]=[]
  try{const ol=await doc.getOutline()
   if(Array.isArray(ol))for(const o of ol){let d=o.dest;if(typeof d==='string')d=await doc.getDestination(d)
    if(Array.isArray(d)&&d[0]!=null){const pi=typeof d[0]==='object'?await doc.getPageIndex(d[0]):Number(d[0]);starts.push({title:String(o.title??'').trim(),page:pi})}}
  }catch{/* tanpa daftar isi */}
  starts=starts.filter(s=>Number.isFinite(s.page)&&s.page>=0&&s.page<pages.length).sort((a,b)=>a.page-b.page).filter((s,i,a)=>i===0||s.page!==a[i-1].page)
  const range=(f:number,t:number)=>`Halaman ${f+1}${t>f?'–'+(t+1):''}`
  const bounds:{title:string;from:number;to:number}[]=[]
  if(starts.length>=2)starts.forEach((s,i)=>bounds.push({title:s.title,from:i===0?0:s.page,to:i+1<starts.length?starts[i+1].page-1:pages.length-1}))
  else for(let f=0;f<pages.length;f+=10)bounds.push({title:'',from:f,to:Math.min(pages.length-1,f+9)})
  const chapters:Chapter[]=[]
  for(const b of bounds){
   const ps=paras.filter(p=>p.page>=b.from&&p.page<=b.to);if(!ps.length)continue
   const ci=chapters.length;const blocks:Block[]=[]
   for(const p of ps)blocks.push({id:`${ci}-${blocks.length}`,kind:p.kind,text:p.text,hash:await sha(p.text)})
   chapters.push({id:String(ci),title:b.title||range(b.from,b.to),blocks})}
  if(!chapters.length)throw new Error('Tidak ada teks yang bisa dibaca di PDF ini.')
  const md:any=await doc.getMetadata().catch(()=>null)
  return{title:String(md?.info?.Title??'').trim()||name.replace(/\.[^.]+$/,'')||'Tanpa judul',author:String(md?.info?.Author??'').trim()||'Tidak diketahui',chapters,images:[] as ImgEntry[],cover:''}
 }finally{try{await doc.destroy()}catch{/* abaikan */}}
}
