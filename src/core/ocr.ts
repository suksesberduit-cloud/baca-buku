import {openPdf} from './pdf'
import {renderPage} from './pdfrender'
import {ocrToParas} from './ocrtext'
import type {OPara} from './ocrtext'
import {getPdfDoc} from './pdfdoc'
import {sha,chapterTitle} from './epub'
import type {Block,Chapter} from './model'
// OCR di perangkat dengan Tesseract.js (WASM). Berkas worker/inti/bahasa dibundel di public/ocr oleh scripts/copy-ocr-assets.mjs;
// jika tidak ada, Tesseract.js mengunduhnya dari internet.
let workerP:Promise<any>|null=null
const exists=(u:string)=>fetch(u,{method:'HEAD'}).then(r=>r.ok).catch(()=>false)
async function getWorker():Promise<any>{
 if(workerP)return workerP
 workerP=(async()=>{
  const T:any=await import('tesseract.js');const base=new URL('.',document.baseURI).href
  const opts:Record<string,unknown>={cacheMethod:'none'}
  if(await exists(base+'ocr/worker.min.js')&&await exists(base+'ocr/core/'))opts.workerPath=base+'ocr/worker.min.js'
  if(await exists(base+'ocr/worker.min.js'))opts.corePath=base+'ocr/core'
  if(await exists(base+'ocr/lang/eng.traineddata.gz')&&await exists(base+'ocr/lang/ind.traineddata.gz')){opts.langPath=base+'ocr/lang';opts.gzip=true}
  try{return await T.createWorker('eng+ind',1,opts)}catch{return await T.createWorker('eng+ind',1,{cacheMethod:'none'})}})()
 workerP.catch(()=>{workerP=null})
 return workerP
}
function paras(data:any):OPara[]{
 const raw:any[]=data?.paragraphs??(data?.blocks??[]).flatMap((b:any)=>b.paragraphs??[])
 if(raw.length)return raw.map(p=>({text:String(p.text??''),y0:p.bbox?.y0??0,y1:p.bbox?.y1??0,lines:p.lines?.length??1,conf:typeof p.confidence==='number'?p.confidence:undefined}))
 return String(data?.text??'').split(/\n\s*\n/).map((t,i)=>({text:t,y0:i*100,y1:i*100+50,lines:Math.max(1,t.split('\n').length)}))
}
// Menjalankan OCR untuk semua halaman satu bab, mengembalikan bab yang sudah berisi teks.
export async function ocrChapter(bookId:string,ch:Chapter,onProg:(done:number,total:number)=>void):Promise<Chapter>{
 if(!ch.ocr)return ch
 const doc=await getPdfDoc(bookId),w=await getWorker()
 const total=ch.ocr.to-ch.ocr.from+1;const pages=[]
 for(let p=ch.ocr.from;p<=ch.ocr.to;p++){
  const cv=await renderPage(doc,p+1,1800)
  const {data}=await w.recognize(cv)
  pages.push({height:cv.height,paras:paras(data)});cv.width=cv.height=0
  onProg(p-ch.ocr.from+1,total)}
 const ci=Number(ch.id);const blocks:Block[]=[]
 for(const q of ocrToParas(pages))blocks.push({id:`${ci}-${blocks.length}`,kind:q.kind,text:q.text,hash:await sha(q.text)})
 if(!blocks.length)blocks.push({id:`${ci}-0`,kind:'paragraph',text:'(Tidak ada teks yang terbaca di halaman ini.)',hash:await sha('kosong')})
 return{id:ch.id,title:/^Halaman /.test(ch.title)?chapterTitle(blocks)||ch.title:ch.title,blocks}
}
