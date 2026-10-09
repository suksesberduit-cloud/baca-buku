import {describe,it,expect} from 'vitest'
import {importBuffer} from './import'
const buf=(s:string)=>new TextEncoder().encode(s).buffer as ArrayBuffer
describe('importBuffer',()=>{
 it('menolak format tak dikenal',async()=>{await expect(importBuffer(buf('halo'),'x.bin')).rejects.toThrow('Format tidak dikenali')})
 it('menolak DJVU dan LIT dengan pesan jelas',async()=>{
  await expect(importBuffer(buf('x'),'a.djvu')).rejects.toThrow('DJVU')
  await expect(importBuffer(buf('x'),'a.lit')).rejects.toThrow('LIT')})
})
