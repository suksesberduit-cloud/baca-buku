export interface Seg{a:number;b:number}
const ABBR=new Set(['dr','mr','mrs','ms','prof','sr','jr','st','vs','etc','no','nos','hlm','dll','dsb','dst','yg','dg','tn','ny','bpk','sdr','jl','pt','cv','inc','ltd','co','corp','fig','e.g','i.e','mis','ir','drs','dra','kh','hj','mt','gen','col','lt','rev','sen','rep','gov','approx','al','jan','feb','mar','apr','jun','jul','aug','sep','sept','oct','nov','dec'])
const CLOSE=/["'”’)\]»]/,END=/[.!?…]/,SP=/\s/
const isLower=(c:string)=>!!c&&c===c.toLowerCase()&&c!==c.toUpperCase()
function abbrev(t:string,i:number){ // kata tepat sebelum titik di posisi i
 let k=i;while(k>0&&!SP.test(t[k-1]))k--
 const w=t.slice(k,i).replace(/^["'“‘(\[]+/,'').toLowerCase()
 return (w.length===1&&/\p{L}/u.test(w))||ABBR.has(w)}
/**
 * Pecah teks jadi potongan baca (kalimat). Mengembalikan offset [a,b) pada teks asli.
 * Kalimat pendek (< min) digabung ke berikutnya; kalimat sangat panjang (> max) dipecah di koma/spasi.
 */
export function sentences(text:string,min=40,max=420):Seg[]{
 const n=text.length,raw:Seg[]=[];let start=0,i=0
 const push=(a:number,b:number)=>{while(a<b&&SP.test(text[a]))a++;while(b>a&&SP.test(text[b-1]))b--;if(b>a)raw.push({a,b})}
 while(i<n){
  if(END.test(text[i])){
   let j=i+1;while(j<n&&END.test(text[j]))j++
   while(j<n&&CLOSE.test(text[j]))j++
   if(j<n&&SP.test(text[j])){
    let k=j;while(k<n&&SP.test(text[k]))k++
    if(k<n&&!isLower(text[k])&&!(text[i]==='.'&&abbrev(text,i))){push(start,j);start=k}
   }
   i=j;continue}
  i++}
 push(start,n)
 const cut:Seg[]=[]
 for(const s of raw){let a=s.a
  while(s.b-a>max){
   const seg=text.slice(a,a+max);const c=Math.max(seg.lastIndexOf(', '),seg.lastIndexOf('; '),seg.lastIndexOf(': '))
   let e=c>=max*0.4?c+1:seg.lastIndexOf(' ');if(e<=0)e=max
   cut.push({a,b:a+e});a+=e;while(a<s.b&&SP.test(text[a]))a++}
  if(a<s.b)cut.push({a,b:s.b})}
 const out:Seg[]=[]
 for(let q=0;q<cut.length;q++){let s={...cut[q]}
  while(s.b-s.a<min&&q+1<cut.length){q++;s={a:s.a,b:cut[q].b}}
  out.push(s)}
 if(out.length>1){const l=out[out.length-1];if(l.b-l.a<min/2){out.pop();out[out.length-1]={a:out[out.length-1].a,b:l.b}}}
 return out
}
