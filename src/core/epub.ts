import {unzipSync,strFromU8} from 'fflate'
import type {Block,Chapter,ImgEntry} from './model'
export async function sha(b:BufferSource|string){const d=typeof b==='string'?new TextEncoder().encode(b):b;const h=await crypto.subtle.digest('SHA-256',d);return [...new Uint8Array(h)].slice(0,8).map(x=>x.toString(16).padStart(2,'0')).join('')}
const MIME:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',avif:'image/avif'}
const MAXIMG=6e6
// 'from' dipakai sebagai direktori (sampai '/' terakhir). Mengembalikan '' untuk URL luar/data:.
export function resolve(from:string,rel:string){
 const r=rel.split(/[?#]/)[0];if(!r||/^[a-z][a-z0-9+.-]*:/i.test(r))return ''
 const out:string[]=[]
 for(const p of (r.startsWith('/')?r.slice(1):from.slice(0,from.lastIndexOf('/')+1)+r).split('/')){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p)}
 const s=out.join('/');try{return decodeURIComponent(s)}catch{return s}
}
export function chapterTitle(blocks:Block[]){
 const hs=blocks.filter(b=>b.kind==='heading').slice(0,3)
 const weak=(x:string)=>!/\p{L}{4,}/u.test(x)||/^(part|chapter|bab|section)\s+[\w.]+$/i.test(x.trim())
 let t=hs[0]?.text??''
 if(t&&weak(t)&&hs[1])t+=' '+hs[1].text
 if(!t){const p=blocks.find(b=>b.kind!=='image'&&b.text);if(p)t=p.text.length>48?p.text.slice(0,45)+'…':p.text}
 return t}
const clean=(s:string|null|undefined)=>(s??'').replace(/\s+/g,' ').trim()
export async function parseEpub(buf:ArrayBuffer){
 let z:Record<string,Uint8Array>
 try{z=unzipSync(new Uint8Array(buf))}catch{throw new Error('Berkas bukan EPUB yang valid (ZIP rusak).')}
 const txt=(p:string)=>{const f=z[p];if(!f)throw new Error('EPUB rusak: berkas '+p+' tidak ada.');return strFromU8(f)}
 const xml=(s:string)=>new DOMParser().parseFromString(s,'application/xml')
 const opfPath=xml(txt('META-INF/container.xml')).querySelector('rootfile')?.getAttribute('full-path')
 if(!opfPath)throw new Error('EPUB rusak: berkas OPF tidak ditemukan.')
 const opf=xml(txt(opfPath));const base=opfPath.slice(0,opfPath.lastIndexOf('/')+1)
 const man=new Map<string,string>();const items=[...opf.querySelectorAll('manifest > item')]
 items.forEach(i=>man.set(i.getAttribute('id')??'',i.getAttribute('href')??''))
 const meta=(n:string)=>opf.getElementsByTagNameNS('*',n)[0]?.textContent?.trim()??''
 const images=new Map<string,{type:string;data:ArrayBuffer}>()
 const grab=(path:string)=>{
  if(images.has(path))return true
  const f=z[path],type=MIME[path.split('.').pop()?.toLowerCase()??'']
  if(!f||!type||f.length>MAXIMG)return false
  images.set(path,{type,data:f.slice().buffer as ArrayBuffer});return true}
 const chapters:Chapter[]=[]
 for(const r of [...opf.querySelectorAll('spine > itemref')]){
  const href=man.get(r.getAttribute('idref')??'');if(!href)continue
  const cpath=base+decodeURIComponent(href.split('#')[0]);const f=z[cpath];if(!f)continue
  const doc=new DOMParser().parseFromString(strFromU8(f),'text/html')
  const ci=chapters.length;const blocks:Block[]=[]
  for(const el of [...doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,img,image')]){
   const id=`${ci}-${blocks.length}`
   if(el.localName==='img'||el.localName==='image'){
    const p=resolve(cpath,el.getAttribute('src')??el.getAttribute('href')??el.getAttribute('xlink:href')??'')
    if(p&&grab(p))blocks.push({id,kind:'image',text:clean(el.getAttribute('alt')),hash:await sha(p),src:p})
    continue}
   if(el.tagName==='LI'&&el.querySelector('p'))continue
   const text=clean(el.textContent);if(!text)continue
   const heading=/^H\d$/.test(el.tagName)
   blocks.push({id,kind:heading?'heading':el.closest('blockquote')?'quote':'paragraph',text,hash:await sha(text)})
  }
  if(blocks.length)chapters.push({id:String(ci),title:chapterTitle(blocks)||`Bagian ${ci+1}`,blocks})
 }
 if(!chapters.length)throw new Error('Tidak ada teks yang bisa dibaca di EPUB ini.')
 let ch=items.find(i=>/cover-image/.test(i.getAttribute('properties')??''))?.getAttribute('href')
 if(!ch){const cid=opf.querySelector('metadata > meta[name="cover"]')?.getAttribute('content');if(cid)ch=man.get(cid)}
 const cp=ch?resolve(base,ch):'';const cover=cp&&grab(cp)?cp:''
 return{title:meta('title')||'Tanpa judul',author:meta('creator')||'Tidak diketahui',chapters,images:[...images] as ImgEntry[],cover}
}
