import {parseEpub} from './epub'
import {parseFb2} from './fb2'
import type {ImgEntry} from './model'
export async function importFile(f:File){
 const buf=await f.arrayBuffer();const n=f.name.toLowerCase()
 if(n.endsWith('.epub'))return{buf,...await parseEpub(buf)}
 if(n.endsWith('.fb2'))return{buf,images:[] as ImgEntry[],cover:'',...await parseFb2(buf)}
 if(/\.djvu?$/.test(n))throw new Error('DJVU tidak didukung. Gunakan EPUB.')
 if(n.endsWith('.lit'))throw new Error('LIT tidak bisa dibaca langsung. Konversi dulu ke EPUB (mis. dengan Calibre), lalu impor EPUB-nya.')
 throw new Error('Format tidak dikenali. Yang didukung: EPUB dan FB2.')
}
