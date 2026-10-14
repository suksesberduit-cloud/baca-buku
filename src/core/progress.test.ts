import {describe,it,expect} from 'vitest'
import {layout,position,locate,chLen} from './progress'
describe('progress',()=>{
 it('menjumlah halaman semua bab, bab aktif memakai ukuran asli',()=>{
  const l=layout([1000,2000,500],100,1,30)
  expect(l.sizes).toEqual([10,30,5]);expect(l.starts).toEqual([0,10,40]);expect(l.total).toBe(45)})
 it('bab kosong tetap 1 halaman',()=>{expect(layout([0],100,5).sizes).toEqual([1])})
 it('position dan locate saling kebalikan untuk setiap halaman',()=>{
  const l=layout([1000,2000,500],100,0)
  for(let v=1;v<=l.total;v++){const p=locate(l,v);expect(position(l,p.ci,p.frac)).toBe(v)}})
 it('locate membatasi nilai di luar rentang',()=>{
  const l=layout([1000,500],100,0);expect(locate(l,-5)).toEqual({ci:0,frac:0});expect(locate(l,999).ci).toBe(1)})
 it('mode fixed memakai lens sebagai jumlah halaman',()=>{expect(layout([12,8],1,0,undefined,true).total).toBe(20)})
 it('chLen menghitung gambar',()=>{expect(chLen({id:'0',title:'',blocks:[{id:'a',kind:'paragraph',text:'abcd',hash:''},{id:'b',kind:'image',text:'',hash:''}]})).toBe(904)})
})
