import {parseEpub} from './epub'
import {parseFb2} from './fb2'
import {parsePdf} from './pdf'
import {parseMobi} from './mobi'
import type {Chapter,ImgEntry} from './model'
type R={title:string;author:string;chapters:Chapter[];images?:ImgEntry[];cover?:string;file?:ArrayBuffer;scan?:boolean}
const norm=(buf:ArrayBuffer,format:string,r:R)=>({buf,format,size:buf.byteLength,images:[] as ImgEntry[],cover:'',file:undefined as ArrayBuffer|undefined,scan:false,...r})
// Format dikenali dari ekstensi; jika tidak ada ekstensi (mis. dibuka dari pengelola berkas Android), dari isi berkas.
export async function importBuffer(buf:ArrayBuffer,name=''){
 const n=name.toLowerCase()
 if(/\.djvu?$/.test(n))throw new Error('DJVU tidak didukung. Gunakan EPUB.')
 if(n.endsWith('.lit'))throw new Error('LIT tidak bisa dibaca langsung. Konversi dulu ke EPUB (mis. dengan Calibre), lalu impor EPUB-nya.')
 const head=new Uint8Array(buf,0,Math.min(buf.byteLength,2048))
 const zip=head[0]===0x50&&head[1]===0x4b
 const pdf=head[0]===0x25&&head[1]===0x50&&head[2]===0x44&&head[3]===0x46
 const mobi=buf.byteLength>68&&new TextDecoder('latin1').decode(new Uint8Array(buf,60,8))==='BOOKMOBI'
 const fb2=/<FictionBook/i.test(new TextDecoder('latin1').decode(head))
 if(n.endsWith('.pdf')||pdf)return norm(buf,'PDF',await parsePdf(buf,name))
 if(/\.(mobi|azw3?|kf8|prc)$/.test(n)||mobi)return norm(buf,/\.(azw3?|kf8)$/.test(n)?'AZW3':'MOBI',await parseMobi(buf,name))
 if(n.endsWith('.epub')||(!n.endsWith('.fb2')&&zip))return norm(buf,'EPUB',await parseEpub(buf))
 if(n.endsWith('.fb2')||fb2)return norm(buf,'FB2',await parseFb2(buf))
 throw new Error('Format tidak dikenali. Yang didukung: EPUB, FB2, PDF (termasuk hasil pindaian dengan OCR), MOBI, dan AZW3.')
}
export async function importFile(f:File){return importBuffer(await f.arrayBuffer(),f.name)}
