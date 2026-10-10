import {useEffect,useRef,useState} from 'react'
import type {MutableRefObject} from 'react'
import {getPdfDoc} from './core/pdfdoc'
import {renderPage} from './core/pdfrender'
// Penampil halaman PDF pindaian: halaman dirender ke canvas, disimpan di cache dan disiapkan lebih dulu (2 halaman ke depan, 1 ke belakang)
// agar pindah halaman instan. Cubit dua jari untuk zoom, geser untuk menggeser, ketuk dua kali untuk memperbesar/memperkecil.
// Margin kosong dipotong otomatis (opsional) dan latar mengikuti warna kertas sehingga halaman terasa memenuhi layar.
interface Rel{x:number;y:number;w:number;h:number}
interface Item{cv:HTMLCanvasElement;bg:string;rel:Rel;hi:boolean}
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v))
const FULL:Rel={x:0,y:0,w:1,h:1}
function analyze(src:HTMLCanvasElement,doCrop:boolean):{rel:Rel;bg:string}{
 const sw=160,sh=Math.max(1,Math.round(sw*src.height/src.width))
 const sm=document.createElement('canvas');sm.width=sw;sm.height=sh
 const c=sm.getContext('2d',{willReadFrequently:true});if(!c)return{rel:FULL,bg:'#fff'}
 c.drawImage(src,0,0,sw,sh);const d=c.getImageData(0,0,sw,sh).data
 const lum=(i:number)=>0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]
 let r=0,g=0,b=0,n=0
 for(const [cx,cy] of [[0,0],[sw-4,0],[0,sh-4],[sw-4,sh-4]])for(let y=cy;y<cy+4;y++)for(let x=cx;x<cx+4;x++){const i=(y*sw+x)*4;r+=d[i];g+=d[i+1];b+=d[i+2];n++}
 const bg=`rgb(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`
 if(!doCrop)return{rel:FULL,bg}
 const edge:number[]=[];for(let x=0;x<sw;x++)edge.push(lum(x*4),lum(((sh-1)*sw+x)*4));for(let y=0;y<sh;y++)edge.push(lum(y*sw*4),lum((y*sw+sw-1)*4))
 edge.sort((p,q)=>p-q);const bl=edge[edge.length>>1]
 const rows=new Array<number>(sh).fill(0),cols=new Array<number>(sw).fill(0)
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(Math.abs(lum((y*sw+x)*4)-bl)>45){rows[y]++;cols[x]++}
 const first=(a:number[])=>a.findIndex(v=>v>=2),last=(a:number[])=>{for(let i=a.length-1;i>=0;i--)if(a[i]>=2)return i;return -1}
 let x0=first(cols),x1=last(cols),y0=first(rows),y1=last(rows)
 if(x0<0||y0<0||x1<=x0||y1<=y0)return{rel:FULL,bg}
 x1+=1;y1+=1
 const px=sw*0.03,py=sh*0.025;x0-=px;x1+=px;y0-=py;y1+=py
 const minW=sw*0.72;if(x1-x0<minW){const m=(x0+x1)/2;x0=m-minW/2;x1=m+minW/2}
 if(x0<0){x1-=x0;x0=0};if(x1>sw){x0-=x1-sw;x1=sw};x0=Math.max(0,x0);y0=Math.max(0,y0);y1=Math.min(sh,y1)
 const rel:Rel={x:x0/sw,y:y0/sh,w:(x1-x0)/sw,h:(y1-y0)/sh}
 if(rel.w*rel.h>0.94||rel.w*rel.h<0.15)return{rel:FULL,bg}
 return{rel,bg}
}
function applyRel(src:HTMLCanvasElement,rel:Rel){
 if(rel===FULL||(rel.w>=0.999&&rel.h>=0.999))return src
 const w=Math.max(1,Math.round(src.width*rel.w)),h=Math.max(1,Math.round(src.height*rel.h))
 const o=document.createElement('canvas');o.width=w;o.height=h
 const c=o.getContext('2d');if(!c)return src
 c.drawImage(src,Math.round(src.width*rel.x),Math.round(src.height*rel.y),w,h,0,0,w,h);src.width=src.height=0;return o
}
export default function ScanView({bookId,page,pages,crop,onZoom,api}:{bookId:string;page:number;pages:number;crop:boolean;onZoom:(z:number)=>void;api:MutableRefObject<{zoom:(f:number)=>void}|null>}){
 const[err,setErr]=useState('');const[ready,setReady]=useState(false);const[ind,setInd]=useState(true);const[bg,setBg]=useState('#fff');const[wb,setWb]=useState(0)
 const box=useRef<HTMLDivElement>(null),inner=useRef<HTMLDivElement>(null)
 const cache=useRef(new Map<string,Item>()),q=useRef<Promise<unknown>>(Promise.resolve()),gen=useRef(0),curItem=useRef<Item|null>(null)
 const st=useRef({s:1,x:0,y:0}),chH=useRef(0)
 const g0=useRef({d:0,s:1,x:0,y:0,cx:0,cy:0,mx:0,my:0,mode:'' as ''|'pinch'|'pan',moved:false,t:0,lt:0,lx:0,ly:0})
 const key=(n:number,hi:boolean)=>`${n}:${hi?1:0}:${crop?1:0}`
 const apply=()=>{const e=inner.current;if(e)e.style.transform=`translate(${st.current.x}px,${st.current.y}px) scale(${st.current.s})`}
 const clampT=()=>{const b=box.current;if(!b)return;const s=st.current,w=b.clientWidth*s.s,h=chH.current*s.s,bw=b.clientWidth,bh=b.clientHeight
  s.x=w<=bw?(bw-w)/2:clamp(s.x,bw-w,0);s.y=h<=bh?(bh-h)/2:clamp(s.y,bh-h,0)}
 const place=(it:Item)=>{it.cv.style.cssText='width:100%;height:100%;display:block';inner.current?.replaceChildren(it.cv)}
 const build=async(n:number,hi:boolean,g:number):Promise<Item|null>=>{
  const hit=cache.current.get(key(n,hi));if(hit)return hit
  if(g!==-1&&g!==gen.current)return null
  const doc=await getPdfDoc(bookId);const bw=box.current?.clientWidth||window.innerWidth,dpr=window.devicePixelRatio||1
  const raw=await renderPage(doc,n+1,hi?Math.min(2800,Math.round(bw*dpr*2.6)):Math.min(1500,Math.round(bw*dpr*1.1)))
  const low=cache.current.get(key(n,false))
  const a=low&&hi?{rel:low.rel,bg:low.bg}:analyze(raw,crop)
  const it:Item={cv:applyRel(raw,a.rel),bg:a.bg,rel:a.rel,hi}
  cache.current.set(key(n,hi),it)
  if(cache.current.size>8){const far=[...cache.current.entries()].filter(([,v])=>v!==curItem.current).sort((p,r)=>Math.abs(+r[0].split(':')[0]-page)-Math.abs(+p[0].split(':')[0]-page))[0]
   if(far){far[1].cv.width=far[1].cv.height=0;cache.current.delete(far[0])}}
  return it}
 const enqueue=(n:number,hi:boolean,g:number)=>{const p=q.current.then(()=>build(n,hi,g));q.current=p.then(()=>undefined,()=>undefined);return p}
 const show=(it:Item)=>{
  const b=box.current,el=inner.current;if(!b||!el)return
  const bw=b.clientWidth,bh=b.clientHeight,h=bw*it.cv.height/it.cv.width
  place(it);el.style.width=bw+'px';el.style.height=h+'px';chH.current=h
  st.current={s:1,x:0,y:h<bh?(bh-h)/2:0};apply();curItem.current=it;setBg(it.bg);setReady(true);setInd(true);onZoom(1)}
 const ensureHi=()=>{const it=curItem.current;if(!it||it.hi)return;const g=gen.current
  void enqueue(page,true,-1).then(h=>{if(h&&gen.current===g&&inner.current){place(h);curItem.current=h}}).catch(()=>undefined)}
 const zoomAt=(f:number,cx:number,cy:number,abs=false)=>{const s=st.current,ns=clamp(abs?f:s.s*f,1,5)
  s.x=cx-(cx-s.x)*(ns/s.s);s.y=cy-(cy-s.y)*(ns/s.s);s.s=ns;clampT();apply();onZoom(ns);if(ns>1.35)ensureHi()}
 api.current={zoom:(f:number)=>{const b=box.current;if(b)zoomAt(f,b.clientWidth/2,b.clientHeight/2)}}
 useEffect(()=>{const b=box.current;if(!b)return;const ro=new ResizeObserver(()=>setWb(Math.round(b.clientWidth/80)));ro.observe(b);setWb(Math.round(b.clientWidth/80));return()=>ro.disconnect()},[])
 useEffect(()=>{cache.current.forEach(i=>{i.cv.width=i.cv.height=0});cache.current.clear();curItem.current=null},[bookId,crop,wb])
 useEffect(()=>()=>{cache.current.forEach(i=>{i.cv.width=i.cv.height=0});cache.current.clear();api.current=null},[])
 useEffect(()=>{let dead=false;const g=++gen.current;setErr('')
  const after=()=>{if(dead)return;for(const d of [1,2])if(page+d<pages)void enqueue(page+d,false,g).catch(()=>undefined);if(page>0)void enqueue(page-1,false,g).catch(()=>undefined)}
  const hit=cache.current.get(key(page,false))
  if(hit){show(hit);after()}else enqueue(page,false,g).then(it=>{if(dead||!it)return;show(it);after()}).catch(e=>{if(!dead)setErr(e instanceof Error?e.message:String(e))})
  const t=window.setTimeout(()=>setInd(false),1600)
  return()=>{dead=true;clearTimeout(t)}},[bookId,page,pages,crop,wb])
 const rel=(e:React.TouchEvent,i:number)=>{const r=box.current?.getBoundingClientRect();return{x:e.touches[i].clientX-(r?.left??0),y:e.touches[i].clientY-(r?.top??0)}}
 const ts=(e:React.TouchEvent)=>{const g=g0.current,s=st.current
  if(e.touches.length>=2){const a=rel(e,0),b=rel(e,1);Object.assign(g,{mode:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y)||1,s:s.s,x:s.x,y:s.y,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,moved:true})}
  else if(e.touches.length===1){const p=rel(e,0);Object.assign(g,{mode:'pan',mx:p.x,my:p.y,x:s.x,y:s.y,moved:false,t:Date.now()})}}
 const tm=(e:React.TouchEvent)=>{const g=g0.current,s=st.current
  if(g.mode==='pinch'&&e.touches.length>=2){const a=rel(e,0),b=rel(e,1),ns=clamp(g.s*(Math.hypot(a.x-b.x,a.y-b.y)/g.d),1,5)
   s.s=ns;s.x=g.cx-(g.cx-g.x)*(ns/g.s);s.y=g.cy-(g.cy-g.y)*(ns/g.s);clampT();apply()}
  else if(g.mode==='pan'&&e.touches.length===1){const p=rel(e,0),dx=p.x-g.mx,dy=p.y-g.my;if(Math.abs(dx)+Math.abs(dy)>8)g.moved=true
   s.x=g.x+dx;s.y=g.y+dy;clampT();apply()}}
 const te=(e:React.TouchEvent)=>{const g=g0.current,s=st.current
  if(g.mode==='pinch'){onZoom(s.s);if(s.s>1.35)ensureHi()}
  if(e.touches.length===1){const p=rel(e,0);Object.assign(g,{mode:'pan',mx:p.x,my:p.y,x:s.x,y:s.y,moved:true});return}
  if(e.touches.length===0){
   if(g.mode==='pan'&&!g.moved&&Date.now()-g.t<300){const now=Date.now(),c=e.changedTouches[0],r=box.current?.getBoundingClientRect()
    const x=c.clientX-(r?.left??0),y=c.clientY-(r?.top??0)
    if(now-g.lt<320&&Math.hypot(x-g.lx,y-g.ly)<48){zoomAt(s.s>1.2?1:2.5,x,y,true);g.lt=0}else{g.lt=now;g.lx=x;g.ly=y}}
   else if(g.mode==='pan')onZoom(s.s)
   g.mode=''}}
 return<div className="scan" ref={box} style={{background:bg}} onTouchStart={ts} onTouchMove={tm} onTouchEnd={te}>
  <div className="scanin" ref={inner}/>
  {err&&<p className="muted scanmsg">{err}</p>}{!ready&&!err&&<p className="muted scanmsg">Memuat halaman…</p>}
  {ind&&<div className="pind">Hal. {page+1} dari {pages}</div>}</div>
}
