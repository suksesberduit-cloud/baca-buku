import {describe,it,expect} from 'vitest'
import {pdfToParas} from './pdftext'
import type {PageT} from './pdftext'
const it_=(s:string,x:number,y:number,h=12,w=450)=>({s,x,y,h,w})
const page:PageT={width:600,height:800,items:[
 it_('CHAPTER ONE',72,740,20,150),
 it_('This is the first line of a paragraph that goes on and on',72,700),
 it_('and continues with a second line of the same paragraph here',72,686),
 it_('and ends here.',72,672,12,120),
 it_('Second paragraph starts with an exam-',92,640),
 it_('ple of hyphenation across lines.',72,626,12,200),
 it_('12',300,30,12,10)]}
describe('pdfToParas',()=>{
 it('menyusun judul, paragraf, tanda hubung, dan membuang nomor halaman',()=>{
  const r=pdfToParas([page])
  expect(r.map(p=>p.kind)).toEqual(['heading','paragraph','paragraph'])
  expect(r[0].text).toBe('CHAPTER ONE')
  expect(r[1].text).toBe('This is the first line of a paragraph that goes on and on and continues with a second line of the same paragraph here and ends here.')
  expect(r[2].text).toBe('Second paragraph starts with an example of hyphenation across lines.')
 })
 it('menggabungkan paragraf yang terpotong di pergantian halaman',()=>{
  const a:PageT={width:600,height:800,items:[it_('Kalimat yang belum selesai di akhir halaman dan',72,300)]}
  const b:PageT={width:600,height:800,items:[it_('berlanjut di halaman berikutnya.',72,700,12,200)]}
  const r=pdfToParas([a,b]);expect(r).toHaveLength(1);expect(r[0].text).toContain('dan berlanjut')
 })
})
