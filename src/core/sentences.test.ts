import {describe,it,expect} from 'vitest'
import {sentences} from './sentences'
const cut=(t:string,min?:number)=>sentences(t,min).map(g=>t.slice(g.a,g.b))
describe('sentences',()=>{
 it('memecah di akhir kalimat dan menjaga angka/mata uang',()=>{
  expect(cut('Awal level 6. Saya ragu butuh $ 60 hingga $ 80 juta. Selesai.',1)).toEqual(['Awal level 6.','Saya ragu butuh $ 60 hingga $ 80 juta.','Selesai.'])})
 it('tidak memecah di singkatan dan inisial',()=>{expect(cut('Dr. Smith bertemu J. K. Rowling, dll. di sana. Ya.',1)[0]).toBe('Dr. Smith bertemu J. K. Rowling, dll. di sana.')})
 it('kalimat pendek digabung ke berikutnya',()=>{expect(cut('Ya. Oke. Siap sekali untuk memulai pekerjaan hari ini.')).toHaveLength(1)})
 it('kalimat sangat panjang dipecah dan tanpa spasi di ujung',()=>{
  for(const g of cut('kata '.repeat(500)))expect(g).toBe(g.trim());expect(Math.max(...cut('kata '.repeat(500)).map(x=>x.length))).toBeLessThanOrEqual(420)})
 it('teks kosong tidak menghasilkan potongan',()=>{expect(sentences('  ')).toEqual([])})
})
