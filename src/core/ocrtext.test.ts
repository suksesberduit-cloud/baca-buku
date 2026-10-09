import {describe,it,expect} from 'vitest'
import {ocrToParas} from './ocrtext'
const P=(text:string,y0:number,y1:number,lines=3,conf=90)=>({text,y0,y1,lines,conf})
describe('ocrToParas',()=>{
 it('judul, paragraf, tanda hubung, nomor halaman, dan sambungan antar halaman',()=>{
  const a={height:2000,paras:[P('BAB SATU',200,290,1),P('Ini paragraf pertama yang cukup panjang untuk dianggap\nteks isi buku dan memiliki exam-\nple sambungan kata.',400,580),P('12',1900,1950,1),P('Kalimat yang belum selesai di akhir halaman dan',1500,1560,1)]}
  const b={height:2000,paras:[P('berlanjut di halaman berikutnya.',200,250,1)]}
  const r=ocrToParas([a,b])
  expect(r.map(x=>x.kind)).toEqual(['heading','paragraph','paragraph'])
  expect(r[1].text).toContain('example sambungan kata.')
  expect(r[2].text).toBe('Kalimat yang belum selesai di akhir halaman dan berlanjut di halaman berikutnya.')
 })
 it('membuang derau kepercayaan rendah',()=>{expect(ocrToParas([{height:2000,paras:[P('xx ~ |',500,520,1,10)]}])).toHaveLength(0)})
})
