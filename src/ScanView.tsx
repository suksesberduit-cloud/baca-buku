import {useEffect,useRef,useState} from 'react'
import {getPdfDoc} from './core/pdfdoc'
import {renderPage} from './core/pdfrender'
// Penampil halaman PDF pindaian: halaman dirender jadi gambar, halaman berikutnya disiapkan lebih dulu agar terasa instan.
export default function ScanView({bookId,page,pages,zoom,onZoom}:{bookId:string;page:number;pages:number;zoom:number;onZoom:()=>void}){
 const[url,setUrl]=useState('');const[err,setErr]=useState('')
 const cache=useRef(new Map<number,string>()),box=useRef<HTMLDivElement>(null),last=useRef(0)
 useEffect(()=>{let dead=false;setErr('')
  const get=async(n:number):Promise<string>=>{
   const hit=cache.current.get(n);if(hit)return hit
   const doc=await getPdfDoc(bookId)
   const cv=await renderPage(doc,n+1,Math.min(2200,Math.round(window.innerWidth*(window.devicePixelRatio||1)*1.6)))
   const blob:Blob|null=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.85));cv.width=cv.height=0
   if(!blob)throw new Error('Gagal merender halaman.')
   const u=URL.createObjectURL(blob);cache.current.set(n,u)
   if(cache.current.size>5){const far=[...cache.current.keys()].sort((a,b)=>Math.abs(b-page)-Math.abs(a-page))[0]
    const old=cache.current.get(far);if(old&&far!==page){URL.revokeObjectURL(old);cache.current.delete(far)}}
   return u}
  get(page).then(u=>{if(!dead){setUrl(u);box.current?.scrollTo(0,0)}}).catch(e=>{if(!dead)setErr(e instanceof Error?e.message:String(e))})
  if(page+1<pages)void get(page+1).catch(()=>undefined)
  return()=>{dead=true}},[bookId,page,pages])
 useEffect(()=>()=>{cache.current.forEach(u=>URL.revokeObjectURL(u));cache.current.clear()},[bookId])
 const tap=()=>{const t=Date.now();if(t-last.current<320)onZoom();last.current=t}
 return<div className={'scan'+(zoom>1?' z':'')} ref={box} onClick={tap}>
  {err?<p className="muted">{err}</p>:url?<img src={url} alt={`Halaman ${page+1}`} style={zoom>1?{width:`${zoom*100}%`,maxWidth:'none'}:{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>:<p className="muted">Memuat halaman…</p>}
  <div className="pnum">Hal. {page+1} dari {pages}{zoom>1?' · ketuk dua kali untuk memperkecil':''}</div></div>
}
