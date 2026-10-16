export const GAP=6
/** Posisi atas tiap halaman pada tampilan gulir. asp[i] = tinggi/lebar halaman i, w = lebar tampil (px). */
export function buildTops(asp:number[],w:number){
 const tops:number[]=[],hs:number[]=[];let y=0
 for(const a of asp){const h=Math.max(1,Math.round(w*(a>0?a:1.414)));tops.push(y);hs.push(h);y+=h+GAP}
 return{tops,hs,total:Math.max(0,y-GAP)}
}
/** Halaman yang memuat posisi gulir y (halaman terakhir yang tops[i] <= y). */
export function pageAt(tops:number[],y:number):number{
 let lo=0,hi=tops.length-1
 while(lo<hi){const m=(lo+hi+1)>>1;if(tops[m]<=y)lo=m;else hi=m-1}
 return Math.max(0,lo)
}
