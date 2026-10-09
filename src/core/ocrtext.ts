// Menyusun paragraf dari hasil OCR (per paragraf + kotak batas). Fungsi murni agar bisa diuji.
import {mergeAcross} from './pdftext'
import type {Para} from './pdftext'
export interface OPara{text:string;y0:number;y1:number;lines:number;conf?:number}
export interface OPage{height:number;paras:OPara[]}
const median=(a:number[])=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2}
export function ocrToParas(pages:OPage[]):Para[]{
 const out:Para[]=[]
 pages.forEach((pg,pi)=>{
  const ps=pg.paras.map(p=>({...p,text:p.text.replace(/-\n(?=[a-z])/g,'').replace(/\s*\n\s*/g,' ').replace(/\s+/g,' ').trim(),lineH:(p.y1-p.y0)/Math.max(1,p.lines)}))
   .filter(p=>/\p{L}/u.test(p.text)&&p.text.length>1)
  const body=median(ps.filter(p=>p.text.length>60).map(p=>p.lineH))||median(ps.map(p=>p.lineH))
  for(const p of ps){
   const edge=p.y1<pg.height*0.07||p.y0>pg.height*0.93
   if(edge&&(p.text.length<15||/^\W*\d+\W*$/.test(p.text)))continue
   if((p.conf??100)<30&&p.text.length<25)continue
   const heading=body>0&&p.lines<=3&&p.text.length<120&&p.lineH>body*1.3
   out.push({kind:heading?'heading':'paragraph',text:p.text,page:pi})}})
 return mergeAcross(out)
}
