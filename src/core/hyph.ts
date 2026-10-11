// Pemenggalan kata otomatis (menyisipkan soft hyphen U+00AD saat tampil; teks asli tidak diubah).
// WebView/Chrome Android tidak punya kamus pemenggalan bahasa Indonesia, sehingga justify melebarkan spasi. Di sini kata Indonesia dipenggal per suku kata.
// Bahasa Inggris: algoritma Liang (seperti TeX) dengan pola hyphen.tex; lihat enBreaks.
import {EN_PATTERNS,EN_EXCEPTIONS} from './hyph-en-data'
const SHY='\u00AD'
export type Lang='id'|'en'
const isLetter=/^\p{L}+$/u
function idBreaks(s:string):number[]{
 // satuan: konsonan rangkap (ng ny sy kh) dan diftong (ai au oi) dianggap satu
 const u:{v:boolean;at:number}[]=[];let i=0
 while(i<s.length){const t=s.slice(i,i+2)
  if(t==='ng'||t==='ny'||t==='sy'||t==='kh'){u.push({v:false,at:i});i+=2;continue}
  if(t==='ai'||t==='au'||t==='oi'){u.push({v:true,at:i});i+=2;continue}
  u.push({v:/[aeiouáàâäéèêëíìîïóòôöúùûü]/.test(s[i]),at:i});i++}
 const out:number[]=[];let prev=-1
 for(let j=0;j<u.length;j++){if(!u[j].v)continue
  if(prev>=0){const cs=j-prev-1
   if(cs===0)out.push(u[j].at)
   else if(cs===1)out.push(u[prev+1].at)
   else out.push(u[prev+2].at)}
  prev=j}
 if(s.endsWith('ngan')){const k=out.indexOf(s.length-4);if(k>=0)out.splice(k,1)}
 return out
}
let enMap:Map<string,number[]>|null=null,enMax=0
const enExc=new Map<string,number[]>()
function enInit(){
 enMap=new Map()
 for(const p of EN_PATTERNS.split(' ')){const letters=p.replace(/\d/g,'');const d:number[]=new Array(letters.length+1).fill(0);let k=0
  for(const ch of p){if(ch>='0'&&ch<='9')d[k]=+ch;else k++}
  enMap.set(letters,d);if(letters.length>enMax)enMax=letters.length}
 for(const e of EN_EXCEPTIONS.split(' ')){const parts=e.split('-');const pos:number[]=[];let a=0;for(let i=0;i<parts.length-1;i++){a+=parts[i].length;pos.push(a)};enExc.set(parts.join(''),pos)}
}
function enBreaks(s:string):number[]{
 if(!enMap)enInit()
 const ex=enExc.get(s);if(ex)return ex
 const w='.'+s+'.',lv=new Array<number>(w.length+1).fill(0)
 for(let i=0;i<w.length;i++)for(let j=i+1;j<=Math.min(w.length,i+enMax);j++){const d=enMap!.get(w.slice(i,j));if(d)for(let k=0;k<d.length;k++)if(d[k]>lv[i+k])lv[i+k]=d[k]}
 const out:number[]=[];for(let p=1;p<s.length;p++)if(lv[p+1]%2===1)out.push(p)
 return out
}
const cache=new Map<string,string>()
export function hyph(text:string,lang:Lang):string{
 if(text.length<7)return text
 const ck=lang+text;const hit=cache.get(ck);if(hit!==undefined)return hit
 const minL=lang==='id'?2:3,ascii=/^[a-z]+$/i
 const res=text.replace(/\p{L}+/gu,w=>{
  if(w.length<6||!isLetter.test(w)||w!==w.normalize('NFC'))return w
  const s=w.toLowerCase();if(s.length!==w.length)return w
  if(lang==='en'&&!ascii.test(w))return w
  const br=(lang==='id'?idBreaks(s):enBreaks(s)).filter(p=>p>=minL&&w.length-p>=3)
  if(!br.length)return w
  let o='',last=0;for(const p of br){o+=w.slice(last,p)+SHY;last=p};return o+w.slice(last)})
 if(cache.size>6000)cache.clear();cache.set(ck,res);return res
}
