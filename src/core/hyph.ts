// Pemenggalan kata otomatis (menyisipkan soft hyphen U+00AD saat tampil; teks asli tidak diubah).
// WebView/Chrome Android tidak punya kamus pemenggalan bahasa Indonesia, sehingga justify melebarkan spasi. Di sini kata Indonesia dipenggal per suku kata.
// Bahasa Inggris tidak diproses di sini: CSS hyphens:auto sudah punya kamus en-US.
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
 return out
}
const cache=new Map<string,string>()
export function hyph(text:string,lang:Lang):string{
 if(lang!=='id'||text.length<7)return text
 const ck=lang+text;const hit=cache.get(ck);if(hit!==undefined)return hit
 const minL=lang==='id'?2:3
 const res=text.replace(/\p{L}+/gu,w=>{
  if(w.length<6||!isLetter.test(w)||w!==w.normalize('NFC'))return w
  const s=w.toLowerCase();if(s.length!==w.length)return w
  const br=idBreaks(s).filter(p=>p>=minL&&w.length-p>=3)
  if(!br.length)return w
  let o='',last=0;for(const p of br){o+=w.slice(last,p)+SHY;last=p};return o+w.slice(last)})
 if(cache.size>6000)cache.clear();cache.set(ck,res);return res
}
