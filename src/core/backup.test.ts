import 'fake-indexeddb/auto'
import {describe,it,expect} from 'vitest'
import {imgGet,saveBook,deleteBook,loadChapter,trPut,trGet,kvSet,kvGet,dump,restore,listBooks} from './db'
const book={id:'b1',title:'T',author:'A',toc:['Satu'],addedAt:1}
const ch=[{id:'0',title:'Satu',blocks:[{id:'0-0',kind:'paragraph' as const,text:'Hello',hash:'h'}]}]
describe('cadangan',()=>{
 it('ekspor penuh lalu pulihkan setelah buku dihapus',async()=>{
  await saveBook(book,ch,[['p.png',{type:'image/png',data:new Uint8Array([1,2,3]).buffer}]]);await trPut('b1:0-0:h:mock','Halo');await kvSet('pos:b1',{ci:0,y:5})
  const d=JSON.parse(JSON.stringify(await dump(true)))
  await deleteBook('b1');expect(await listBooks()).toEqual([])
  await restore(d)
  expect((await loadChapter('b1',0))?.blocks[0].text).toBe('Hello')
  expect((await imgGet('b1','p.png'))?.data.byteLength).toBe(3);expect(await trGet('b1:0-0:h:mock')).toBe('Halo');expect(await kvGet('pos:b1')).toEqual({ci:0,y:5})
 })
 it('cadangan ringan tidak berisi teks buku',async()=>{const d=await dump(false);expect(d.books).toBeUndefined();expect(d.chapters).toBeUndefined()})
 it('menolak berkas asing',async()=>{await expect(restore({a:1})).rejects.toThrow();await expect(restore(null)).rejects.toThrow()})
})
