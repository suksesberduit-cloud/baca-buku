import type {Block,BlockKind,Chapter} from './model'
import {sha} from './epub'
type Raw={kind:BlockKind;text:string}
const clean=(s:string|null|undefined)=>(s??'').replace(/\s+/g,' ').trim()
function walk(el:Element,out:Raw[],q:boolean){
 for(const c of Array.from(el.children)){
  const n=c.localName,t=clean(c.textContent)
  if(n==='title'||n==='subtitle'){if(t)out.push({kind:'heading',text:t})}
  else if(n==='p'||n==='v'||n==='text-author'){if(t)out.push({kind:q?'quote':'paragraph',text:t})}
  else if(n==='cite'||n==='epigraph')walk(c,out,true)
  else if(n==='section'||n==='poem'||n==='stanza')walk(c,out,q)
 }
}
export function decodeFb2(buf:ArrayBuffer){
 const head=new TextDecoder('latin1').decode(new Uint8Array(buf,0,Math.min(200,buf.byteLength)))
 const enc=/encoding=["']([^"']+)["']/i.exec(head)?.[1]??'utf-8'
 try{return new TextDecoder(enc).decode(buf)}catch{return new TextDecoder('utf-8').decode(buf)}
}
export async function parseFb2(buf:ArrayBuffer){
 const doc=new DOMParser().parseFromString(decodeFb2(buf),'application/xml')
 if(doc.getElementsByTagName('parsererror').length||doc.documentElement.localName!=='FictionBook')throw new Error('Berkas bukan FB2 yang valid.')
 const ti=doc.getElementsByTagNameNS('*','title-info')[0]
 const one=(p:Element|undefined,n:string)=>p?.getElementsByTagNameNS('*',n)[0]?.textContent
 const title=clean(one(ti,'book-title'))||'Tanpa judul'
 const a=ti?.getElementsByTagNameNS('*','author')[0]
 const author=clean(`${one(a,'first-name')??''} ${one(a,'last-name')??''}`)||'Tidak diketahui'
 const body=[...doc.getElementsByTagNameNS('*','body')].find(b=>b.getAttribute('name')!=='notes')
 if(!body)throw new Error('FB2 tidak memiliki isi buku.')
 const secs=[...body.children].filter(c=>c.localName==='section')
 const chapters:Chapter[]=[]
 for(const s of secs.length?secs:[body]){
  const raw:Raw[]=[];walk(s,raw,false);if(!raw.length)continue
  const ci=chapters.length;const blocks:Block[]=[]
  for(const r of raw)blocks.push({id:`${ci}-${blocks.length}`,kind:r.kind,text:r.text,hash:await sha(r.text)})
  chapters.push({id:String(ci),title:raw.find(r=>r.kind==='heading')?.text||`Bagian ${ci+1}`,blocks})
 }
 if(!chapters.length)throw new Error('Tidak ada teks yang bisa dibaca di FB2 ini.')
 return{title,author,chapters}
}
