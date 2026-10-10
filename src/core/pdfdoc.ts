import {openPdf} from './pdf'
import {fileGet} from './db'
// Dokumen PDF tersimpan (untuk PDF pindaian), dibuka sekali dan dipakai bersama oleh penampil halaman dan OCR.
let cache:{id:string;doc:any}|null=null
export async function getPdfDoc(bookId:string):Promise<any>{
 if(cache?.id===bookId)return cache.doc
 const f=await fileGet(bookId)
 if(!f)throw new Error('Berkas PDF asli tidak ada di perangkat. Impor ulang PDF-nya.')
 try{await cache?.doc.destroy()}catch{/* abaikan */}
 const doc=await openPdf(f);cache={id:bookId,doc};return doc
}
