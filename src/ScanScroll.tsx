import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import type {MutableRefObject} from 'react'
import {getPdfDoc} from './core/pdfdoc'
import {renderPage} from './core/pdfrender'
import {buildTops,pageAt,GAP} from './core/scrollpos'
// Mode gulir untuk PDF (bertext maupun pindaian): semua halaman bertumpuk dari sampul sampai akhir.
// Hanya halaman di sekitar layar yang dirender (sisanya dilepas dari memori); tinggi halaman diukur di latar belakang.
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v))
interface Cv{cv:HTMLCanvasElement;w:number}
export default function ScanScroll({bookId,page,pages,onPage,onZoom,api}:{bookId:string;page:number;pages:number;onPage:(n:number)=>void;onZoom:(z:number)=>void;api:MutableRefObject<{zoom:(f:number)=>void}|null>}){
 const box=useRef<HTMLDivElement>(null),slots=useRef<(HTMLDivElement|null)[]>([])
 const asp=useRef<number[]>(new Array(Math.max(1,pages)).fill(1.414))
 const[ver,setVer]=useState(0),[bw,setBw]=useState(()=>window.innerWidth),[zf,setZf]=useState(1),[curN,setCurN]=useState(page),[ind,setInd]=useState(true),[err,setErr]=useState('')
 const cur=useRef(page),anchor=useRef({n:page,fr:0}),done=useRef(new Map<number,Cv>()),pend=useRef(new Set<number>()),q=useRef<Promise<unknown>>(Promise.resolve())
 const want=useRef({lo:0,hi:-1}),alive=useRef(true),raf=useRef(0),indT=useRef(0),prevW=useRef(0)
 const W=Math.round(bw*zf)
 const lay=useMemo(()=>buildTops(asp.current,W),[ver,W,pages]) // eslint-disable-line react-hooks/exhaustive-deps
 const tops=useRef(lay.tops),hs=useRef(lay.hs);tops.current=lay.tops;hs.current=lay.hs
 const tw=()=>Math.min(2400,Math.round(W*(window.devicePixelRatio||1)*1.1))
 const free=(n:number)=>{const it=done.current.get(n);if(it){it.cv.width=it.cv.height=0;done.current.delete(n)};slots.current[n]?.replaceChildren()}
 const enqueue=(n:number)=>{if(pend.current.has(n))return;pend.current.add(n)
  q.current=q.current.then(async()=>{pend.current.delete(n);if(!alive.current||n<want.current.lo||n>want.current.hi)return
   try{const doc=await getPdfDoc(bookId);const w=tw();const cv=await renderPage(doc,n+1,w)
    if(!alive.current||n<want.current.lo||n>want.current.hi){cv.width=cv.height=0;return}
    const old=done.current.get(n);if(old)old.cv.width=old.cv.height=0
    cv.style.cssText='width:100%;height:100%;display:block';slots.current[n]?.replaceChildren(cv);done.current.set(n,{cv,w})}
   catch(e){if(alive.current)setErr(e instanceof Error?e.message:String(e))}})}
 const kick=()=>{const el=box.current;if(!el)return
  const f=pageAt(tops.current,el.scrollTop),l=pageAt(tops.current,el.scrollTop+el.clientHeight),ahead=zf>1.5?1:2,keep=zf>1.5?1:2
  const lo=Math.max(0,f-1),hi=Math.min(pages-1,l+ahead);want.current={lo,hi}
  const order:number[]=[];for(let n=lo;n<=hi;n++)order.push(n);order.sort((a,b)=>Math.abs(a-f)-Math.abs(b-f))
  for(const n of order){const it=done.current.get(n);if(!it||it.w!==tw())enqueue(n)}
  for(const n of [...done.current.keys()])if(n<lo-keep||n>hi+keep)free(n)}
 const update=()=>{const el=box.current;if(!el)return
  const y=el.scrollTop,n=pageAt(tops.current,y+el.clientHeight*0.4),a=pageAt(tops.current,y)
  anchor.current={n:a,fr:clamp((y-tops.current[a])/Math.max(1,hs.current[a]),0,1)}
  if(n!==cur.current){cur.current=n;setCurN(n);onPage(n);setInd(true);clearTimeout(indT.current);indT.current=window.setTimeout(()=>setInd(false),1400)}
  kick()}
 const onScroll=()=>{if(raf.current)return;raf.current=requestAnimationFrame(()=>{raf.current=0;update()})}
 const toPage=(n:number)=>{const el=box.current;if(!el)return;const t=tops.current[clamp(n,0,pages-1)]??0;el.scrollTop=t;anchor.current={n,fr:0}}
 api.current={zoom:(f:number)=>setZf(z=>{const nz=clamp(z*f,1,3);onZoom(nz);return nz})}
 useEffect(()=>{const el=box.current;if(!el)return;const ro=new ResizeObserver(()=>setBw(el.clientWidth||window.innerWidth));ro.observe(el);setBw(el.clientWidth||window.innerWidth);return()=>ro.disconnect()},[])
 useLayoutEffect(()=>{toPage(page);prevW.current=W;kick()},[]) // eslint-disable-line react-hooks/exhaustive-deps
 // tinggi/lebar berubah (aspek terukur, zoom, rotasi layar): pertahankan posisi baca pada halaman yang sama
 useLayoutEffect(()=>{const el=box.current;if(!el||prevW.current===W&&!ver)return;prevW.current=W
  const a=anchor.current,t=(tops.current[a.n]??0)+a.fr*(hs.current[a.n]??0);if(Math.abs(el.scrollTop-t)>0.5)el.scrollTop=t
  for(const n of [...done.current.keys()])if(done.current.get(n)!.w!==tw()){/* dirender ulang oleh kick */}
  kick()},[ver,W]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(page!==cur.current){cur.current=page;setCurN(page);toPage(page);setInd(true);clearTimeout(indT.current);indT.current=window.setTimeout(()=>setInd(false),1400);kick()}},[page]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{let dead=false;alive.current=true
  ;(async()=>{const doc=await getPdfDoc(bookId);let changed=false
   for(let k=0;k<pages;k++){if(dead)return;const i=(page+k)%pages
    const pg=await doc.getPage(i+1);const v=pg.getViewport({scale:1});pg.cleanup();const a=v.height/v.width
    if(k===0){asp.current.fill(a);changed=true}else if(Math.abs(a-asp.current[i])>0.005){asp.current[i]=a;changed=true}
    if(k===0||k%25===24||k===pages-1){if(changed){changed=false;setVer(x=>x+1)};await new Promise(r=>setTimeout(r,0))}}
  })().catch(e=>{if(!dead)setErr(e instanceof Error?e.message:String(e))})
  return()=>{dead=true}},[bookId,pages]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{const t=window.setTimeout(()=>setInd(false),1600);return()=>{clearTimeout(t);clearTimeout(indT.current);alive.current=false;cancelAnimationFrame(raf.current)
  for(const n of [...done.current.keys()])free(n);api.current=null}},[]) // eslint-disable-line react-hooks/exhaustive-deps
 const list=useMemo(()=>Array.from({length:pages},(_,i)=><div key={i} ref={el=>{slots.current[i]=el}} className="sslot" style={{height:lay.hs[i],width:W,marginBottom:i<pages-1?GAP:0}}/>),[lay,pages,W])
 return<div className="sscroll" ref={box} onScroll={onScroll} style={{overflowX:zf>1?'auto':'hidden'}}>
  <div style={{width:W}}>{list}</div>
  {err&&<p className="muted scanmsg">{err}</p>}
  {ind&&<div className="pind">Hal. {curN+1} dari {pages}</div>}</div>
}
