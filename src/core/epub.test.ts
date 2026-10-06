// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest'
import {webcrypto} from 'node:crypto'
import {zipSync,strToU8} from 'fflate'
import {parseEpub,resolve,chapterTitle} from './epub'
if(!globalThis.crypto?.subtle)vi.stubGlobal('crypto',webcrypto)
const png=new Uint8Array([137,80,78,71])
const files={
 'META-INF/container.xml':strToU8('<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'),
 'OEBPS/content.opf':strToU8('<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Judul</dc:title><dc:creator>Pena</dc:creator></metadata><manifest><item id="c1" href="text/c1.xhtml" media-type="application/xhtml+xml"/><item id="cv" href="images/cover.png" media-type="image/png" properties="cover-image"/></manifest><spine><itemref idref="c1"/></spine></package>'),
 'OEBPS/text/c1.xhtml':strToU8('<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Bab Satu</h1><p>Halo dunia.</p><img src="../images/a%20b.png" alt="Gambar"/><p>Akhir.</p><img src="http://x/y.png"/></body></html>'),
 'OEBPS/images/a b.png':png,'OEBPS/images/cover.png':png}
describe('resolve',()=>{
 it('menormalkan path relatif',()=>{expect(resolve('OEBPS/text/c1.xhtml','../images/a%20b.png')).toBe('OEBPS/images/a b.png')})
 it('mengabaikan URL luar',()=>{expect(resolve('a/b.xhtml','http://x/y.png')).toBe('');expect(resolve('a/b.xhtml','data:image/png;base64,AA')).toBe('')})
})
describe('parseEpub',()=>{
 it('membaca teks, gambar sesuai urutan, dan sampul',async()=>{
  const b=await parseEpub(zipSync(files).slice().buffer as ArrayBuffer)
  expect(b.title).toBe('Judul');expect(b.author).toBe('Pena')
  expect(b.chapters[0].blocks.map(k=>k.kind)).toEqual(['heading','paragraph','image','paragraph'])
  expect(b.chapters[0].blocks[2].src).toBe('OEBPS/images/a b.png');expect(b.chapters[0].blocks[2].text).toBe('Gambar')
  expect(b.images.map(i=>i[0]).sort()).toEqual(['OEBPS/images/a b.png','OEBPS/images/cover.png'])
  expect(b.cover).toBe('OEBPS/images/cover.png')
 })
 it('menolak berkas rusak',async()=>{await expect(parseEpub(new Uint8Array([1,2,3]).buffer)).rejects.toThrow()})
})
describe('chapterTitle',()=>{
 const h=(text:string)=>({id:'x',kind:'heading' as const,text,hash:''})
 it('menggabungkan nomor bab dengan judulnya',()=>{expect(chapterTitle([h('– 7 –'),h('Confessions of a Wage Slave')])).toBe('– 7 – Confessions of a Wage Slave')})
 it('judul biasa tidak digabung',()=>{expect(chapterTitle([h('FOREWORD'),h('Lain')])).toBe('FOREWORD')})
 it('cadangan: awal paragraf jika tanpa judul',()=>{expect(chapterTitle([{id:'y',kind:'paragraph' as const,text:'Hak cipta buku ini.',hash:''}])).toBe('Hak cipta buku ini.')})
})
