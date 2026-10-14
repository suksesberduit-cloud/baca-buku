import type {Chapter} from './model'
/** Perkiraan "karakter" untuk gambar (menentukan berapa halaman yang dimakan gambar). */
export const IMG_CHARS=900
export const chLen=(c:Chapter)=>c.blocks.reduce((n,b)=>n+(b.kind==='image'?IMG_CHARS:b.text.length),0)
export interface Lay{sizes:number[];starts:number[];total:number}
/**
 * Susun halaman virtual seluruh buku. Bab lain diperkirakan dari panjang teks (lens/cpp);
 * bab yang sedang dibuka memakai ukuran sebenarnya (curSize) bila diberikan.
 * fixed=true: lens sudah berupa jumlah halaman (PDF pindaian), tanpa pembagian.
 */
export function layout(lens:number[],cpp:number,ci:number,curSize?:number,fixed=false):Lay{
 const c=cpp>0?cpp:1
 const sizes=lens.map((l,i)=>i===ci&&curSize&&curSize>0?curSize:Math.max(1,fixed?Math.round(l):Math.ceil(l/c)))
 const starts:number[]=[];let t=0
 for(const n of sizes){starts.push(t);t+=n}
 return{sizes,starts,total:t}
}
/** Nomor halaman buku (mulai 1) dari bab ci dan posisi frac (0..1) di dalam bab itu. */
export function position(l:Lay,ci:number,frac:number):number{
 const i=Math.min(Math.max(0,ci),l.sizes.length-1);if(i<0)return 1
 const f=Math.min(1,Math.max(0,frac))
 return l.starts[i]+Math.round(f*(l.sizes[i]-1))+1
}
/** Kebalikannya: nomor halaman buku (mulai 1) → bab dan posisi di dalam bab (0..1). */
export function locate(l:Lay,v:number):{ci:number;frac:number}{
 if(!l.sizes.length)return{ci:0,frac:0}
 const g=Math.min(Math.max(1,Math.round(v)),l.total)-1
 let i=0;while(i+1<l.sizes.length&&l.starts[i+1]<=g)i++
 const n=l.sizes[i]
 return{ci:i,frac:n<=1?0:(g-l.starts[i])/(n-1)}
}
