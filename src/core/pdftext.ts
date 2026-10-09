// Menyusun paragraf dari teks PDF (per potongan teks + posisi). Fungsi murni agar bisa diuji tanpa pdf.js.
export interface TItem{s:string;x:number;y:number;h:number;w:number}
export interface PageT{width:number;height:number;items:TItem[]}
export interface Para{kind:'heading'|'paragraph';text:string;page:number}
interface Line{y:number;x0:number;x1:number;h:number;text:string}
const median=(a:number[])=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2}
export function toLines(items:TItem[]):Line[]{
 const its=items.filter(i=>i.s.length>0).sort((a,b)=>b.y-a.y||a.x-b.x)
 const lines:Line[]=[];let grp:TItem[]=[]
 const flush=()=>{
  if(!grp.length)return
  grp.sort((a,b)=>a.x-b.x)
  let text='',end=-1e9
  for(const it of grp){if(text&&it.x-end>0.15*it.h&&!text.endsWith(' ')&&!it.s.startsWith(' '))text+=' ';text+=it.s;end=it.x+it.w}
  text=text.replace(/\s+/g,' ').trim()
  if(text)lines.push({y:grp.reduce((a,i)=>a+i.y,0)/grp.length,x0:grp[0].x,x1:Math.max(...grp.map(i=>i.x+i.w)),h:Math.max(...grp.map(i=>i.h)),text})
  grp=[]}
 for(const it of its){if(grp.length&&Math.abs(grp[0].y-it.y)>0.5*Math.max(it.h,grp[0].h))flush();grp.push(it)}
 flush();return lines
}
const key=(t:string)=>t.toLowerCase().replace(/\d+/g,'#').replace(/\s+/g,' ').trim()
export function pdfToParas(pages:PageT[]):Para[]{
 const perPage=pages.map(p=>toLines(p.items))
 const all=perPage.flat()
 const long=all.filter(l=>l.text.length>20).map(l=>l.h)
 const bodyH=median(long.length?long:all.map(l=>l.h))||10
 const freq=new Map<string,number>()
 const edge=(l:Line,p:PageT)=>l.y>p.height*0.92||l.y<p.height*0.08
 pages.forEach((p,i)=>{const seen=new Set<string>();for(const l of perPage[i])if(edge(l,p)){const k=key(l.text);if(!seen.has(k)){seen.add(k);freq.set(k,(freq.get(k)??0)+1)}}})
 const minRep=Math.max(3,Math.ceil(pages.length*0.3))
 const noise=(l:Line,p:PageT)=>edge(l,p)&&(/^[\s\-–—]*(\d+|[ivxlcdm]+)[\s\-–—]*$/i.test(l.text)||(freq.get(key(l.text))??0)>=minRep)
 const sp:number[]=[];for(const ls of perPage)for(let i=1;i<ls.length;i++){const d=ls[i-1].y-ls[i].y;if(d>0&&d<bodyH*3)sp.push(d)}
 const lh=median(sp)||bodyH*1.2
 const out:Para[]=[]
 pages.forEach((p,pi)=>{
  const ls=perPage[pi].filter(l=>!noise(l,p));if(!ls.length)return
  const left=Math.min(...ls.map(l=>l.x0)),right=Math.max(...ls.map(l=>l.x1))
  const start=out.length;let prev:Line|undefined
  for(const l of ls){
   const kind:'heading'|'paragraph'=l.h>bodyH*1.25?'heading':'paragraph'
   const cur=out.length>start?out[out.length-1]:undefined
   let brk=!cur||!prev||kind!==cur.kind
   if(!brk&&prev){
    const gap=prev.y-l.y,ends=/[.!?:”"')\]]\s*$/.test(prev.text)
    if(gap>lh*1.5)brk=true
    else if(kind==='paragraph'&&ends&&(l.x0-left>bodyH*1.2||prev.x1<right-bodyH*3))brk=true
   }
   if(brk||!cur)out.push({kind,text:l.text,page:pi})
   else cur.text=/[A-Za-z]-$/.test(cur.text)&&/^[a-z]/.test(l.text)?cur.text.slice(0,-1)+l.text:cur.text+' '+l.text
   prev=l}
 })
 return mergeAcross(out)
}
export function mergeAcross(out:Para[]):Para[]{
 const merged:Para[]=[]
 for(const q of out){const p=merged[merged.length-1]
  if(p&&q.page===p.page+1&&p.kind==='paragraph'&&q.kind==='paragraph'&&!/[.!?:;”"')\]]\s*$/.test(p.text)&&/^[a-z(“"']/.test(q.text))
   p.text=/[A-Za-z]-$/.test(p.text)&&/^[a-z]/.test(q.text)?p.text.slice(0,-1)+q.text:p.text+' '+q.text
  else merged.push({...q})}
 return merged
}
