const SHY='\u00ad'
/** Range DOM untuk karakter [a,b) dari teks asli; soft-hyphen sisipan hifenasi tidak dihitung. */
export function offsetRange(root:Node,a:number,b:number):Range|null{
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT)
 let pos=0,sN:Text|null=null,sO=0,eN:Text|null=null,eO=0,n:Node|null
 while((n=w.nextNode())){const t=n as Text,d=t.data
  for(let k=0;k<d.length;k++){if(d[k]===SHY)continue
   if(pos===a&&!sN){sN=t;sO=k}
   pos++
   if(pos===b){eN=t;eO=k+1;break}}
  if(eN)break}
 if(!sN||!eN)return null
 const r=document.createRange();r.setStart(sN,sO);r.setEnd(eN,eO);return r
}
/** Pasang/hapus penanda kalimat (CSS Custom Highlight API). false bila WebView tidak mendukung. */
export function setMark(r:Range|null):boolean{
 const g=globalThis as unknown as {CSS?:{highlights?:{set:(k:string,v:unknown)=>void;delete:(k:string)=>void}};Highlight?:new(r:Range)=>unknown}
 const hs=g.CSS?.highlights;if(!hs||!g.Highlight)return false
 if(r)hs.set('tts',new g.Highlight(r));else hs.delete('tts')
 return true
}
