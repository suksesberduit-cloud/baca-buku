import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import type {MutableRefObject} from 'react'
import {getPdfDoc} from './core/pdfdoc'
import {renderPage} from './core/pdfrender'
import {buildTops,pageAt,GAP} from './core/scrollpos'
// Mode gulir untuk PDF (bertext maupun pindaian): semua halaman bertumpuk dari sampul sampai akhir.
// Hanya halaman di sekitar layar yang dirender (sisanya dilepas dari memori); tinggi halaman diukur di latar belakang.
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v))
interface Cv{cv:HTMLCanvasElement;w:number}
/** Titik yang harus tetap di bawah jari saat zoom: halaman n pada pecahan tinggi fr, pecahan lebar fx, posisi layar (cx,cy). */
interface Focus{n:number;fr:number;fx:number;cx:number;cy:number}
const MAXZ=3
export default function ScanScroll({bookId,page,pages,onPage,onZoom,api}:{bookId:string;page:number;pages:number;onPage:(n:number)=>void;onZoom:(z:number)=>void;api:MutableRefObject<{zoom:(f:number)=>void}|null>}){
 const box=useRef<HTMLDivElement>(null),slots=useRef<(HTMLDivElement|null)[]>([])
 const asp=useRef<number[]>(new Array(Math.max(1,pages)).fill(1.414))
 const[ver,setVer]=useState(0),[bw,setBw]=useState(()=>window.innerWidth),[zf,setZf]=useState(1),[curN,setCurN]=useState(page),[ind,setInd]=useState(true),[err,setErr]=useState('')
 const cur=useRef(page),anchor=useRef({n:page,fr:0}),done=useRef(new Map<number,Cv>()),pend=useRef(new Set<number>()),q=useRef<Promise<unknown>>(Promise.resolve())
 const want=useRef({lo:0,hi:-1}),alive=useRef(true),raf=useRef(0),indT=useRef(0),prevW=useRef(0)
 const zfRef=useRef(1),inner=useRef<HTMLDivElement>(null),focus=useRef<Focus|null>(null)
 const pinch=useRef({on:false,d:1,s:1,cx0:0,cy0:0,cx:0,cy:0,foc:null as Focus|null}),tap=useRef({t:0,x:0,y:0,moved:false,lt:0,lx:0,ly:0})
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
 const makeFocus=(cx:number,cy:number):Focus|null=>{const el=box.current;if(!el)return null
  const yy=el.scrollTop+cy,n=pageAt(tops.current,yy)
  return{n,fr:clamp((yy-tops.current[n])/Math.max(1,hs.current[n]),0,1),fx:(el.scrollLeft+cx)/Math.max(1,W),cx,cy}}
 const setZoom=(nz:number,f:Focus|null)=>{nz=clamp(nz,1,MAXZ);if(Math.abs(nz-zfRef.current)<0.01)return;focus.current=f;zfRef.current=nz;setZf(nz)}
 api.current={zoom:(f:number)=>{const el=box.current;setZoom(zfRef.current*f,el?makeFocus(el.clientWidth/2,el.clientHeight/2):null)}}
 useEffect(()=>{onZoom(zf)},[zf]) // eslint-disable-line react-hooks/exhaustive-deps
 // cubit dua jari = zoom (selama cubit, gulir dikunci dan tampilan hanya diskalakan; dirender ulang tajam setelah jari dilepas); ketuk dua kali = zoom cepat
 const rel=(e:React.TouchEvent,i:number)=>{const r=box.current?.getBoundingClientRect();return{x:e.touches[i].clientX-(r?.left??0),y:e.touches[i].clientY-(r?.top??0)}}
 const ts=(e:React.TouchEvent)=>{const g=pinch.current,t=tap.current
  if(e.touches.length>=2){const a=rel(e,0),b=rel(e,1),el=box.current;if(!el)return
   const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;el.classList.add('pinch')
   Object.assign(g,{on:true,d:Math.hypot(a.x-b.x,a.y-b.y)||1,s:1,cx0:cx,cy0:cy,cx,cy,foc:makeFocus(cx,cy)});t.moved=true
   if(inner.current)inner.current.style.transformOrigin=`${el.scrollLeft+cx}px ${el.scrollTop+cy}px`}
  else if(e.touches.length===1&&!g.on){const p=rel(e,0);Object.assign(t,{t:Date.now(),x:p.x,y:p.y,moved:false})}}
 const tm=(e:React.TouchEvent)=>{const g=pinch.current,t=tap.current
  if(g.on&&e.touches.length>=2){const a=rel(e,0),b=rel(e,1);g.cx=(a.x+b.x)/2;g.cy=(a.y+b.y)/2
   g.s=clamp(zfRef.current*(Math.hypot(a.x-b.x,a.y-b.y)/g.d),1,MAXZ)/zfRef.current
   if(inner.current)inner.current.style.transform=`translate(${g.cx-g.cx0}px,${g.cy-g.cy0}px) scale(${g.s})`}
  else if(e.touches.length===1&&!g.on){const p=rel(e,0);if(Math.abs(p.x-t.x)+Math.abs(p.y-t.y)>10)t.moved=true}}
 const endPinch=()=>{const g=pinch.current;if(!g.on)return;g.on=false
  const el=box.current;if(inner.current){inner.current.style.transform='';inner.current.style.transformOrigin=''};el?.classList.remove('pinch')
  if(g.foc)setZoom(zfRef.current*g.s,{...g.foc,cx:g.cx,cy:g.cy})}
 const te=(e:React.TouchEvent)=>{const g=pinch.current,t=tap.current
  if(g.on){if(e.touches.length<2)endPinch();tap.current.moved=true;return}
  if(e.touches.length===0&&!t.moved&&Date.now()-t.t<280){const now=Date.now()
   if(now-t.lt<320&&Math.hypot(t.x-t.lx,t.y-t.ly)<48){setZoom(zfRef.current>1.2?1:2.5,makeFocus(t.x,t.y));t.lt=0}else{t.lt=now;t.lx=t.x;t.ly=t.y}}}
 useEffect(()=>{const el=box.current;if(!el)return;const ro=new ResizeObserver(()=>setBw(el.clientWidth||window.innerWidth));ro.observe(el);setBw(el.clientWidth||window.innerWidth);return()=>ro.disconnect()},[])
 useLayoutEffect(()=>{toPage(page);prevW.current=W;kick()},[]) // eslint-disable-line react-hooks/exhaustive-deps
 // tinggi/lebar berubah (aspek terukur, zoom, rotasi layar): pertahankan posisi baca pada halaman yang sama
 useLayoutEffect(()=>{const el=box.current;if(!el||prevW.current===W&&!ver)return;prevW.current=W
  const f=focus.current;focus.current=null
  if(f){const t=(tops.current[f.n]??0)+f.fr*(hs.current[f.n]??0)-f.cy,x=f.fx*W-f.cx;el.scrollTop=Math.max(0,t);el.scrollLeft=Math.max(0,x);anchor.current={n:f.n,fr:f.fr}}
  else{const a=anchor.current,t=(tops.current[a.n]??0)+a.fr*(hs.current[a.n]??0);if(Math.abs(el.scrollTop-t)>0.5)el.scrollTop=t}
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
 return<div className="sscroll" ref={box} onScroll={onScroll} onTouchStart={ts} onTouchMove={tm} onTouchEnd={te} onTouchCancel={endPinch} style={{overflowX:zf>1?'auto':'hidden'}}>
  <div ref={inner} style={{width:W}}>{list}</div>
  {err&&<p className="muted scanmsg">{err}</p>}
  {ind&&<div className="pind">Hal. {curN+1} dari {pages}</div>}</div>
}
