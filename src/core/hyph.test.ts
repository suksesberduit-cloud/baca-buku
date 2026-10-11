import {describe,it,expect} from 'vitest'
import {hyph} from './hyph'
const vis=(s:string)=>s.replace(/\u00AD/g,'-')
describe('hyph',()=>{
 it('bahasa Indonesia per suku kata',()=>{
  expect(vis(hyph('perjalanan','id'))).toBe('per-ja-la-nan')
  expect(vis(hyph('menunjukkan','id'))).toBe('me-nun-juk-kan')
  expect(vis(hyph('mengatakan','id'))).toBe('me-nga-ta-kan')
  expect(vis(hyph('universitas','id'))).toBe('uni-ver-si-tas')
 })
 it('Inggris memakai pola TeX (Liang)',()=>{
  expect(vis(hyph('happiness','en'))).toBe('hap-pi-ness')
  expect(vis(hyph('philosophy','en'))).toBe('phi-los-o-phy')
  expect(vis(hyph('generations','en'))).toBe('gen-er-a-tions')
  expect(vis(hyph('temptations','en'))).toBe('temp-ta-tions')
 })
 it('teks Inggris tidak berubah selain soft hyphen',()=>{
  const t='The reality is that most of this is nonsense: We’re all humans, much more similar than we are different.'
  expect(hyph(t,'en').replace(/\u00AD/g,'')).toBe(t)
 })
 it('tidak mengubah teks selain soft hyphen',()=>{
  const t='Bahkan, buku ini hampir tidak ada sama sekali. Karena saya tidak membeli saham Apple.'
  expect(hyph(t,'id').replace(/\u00AD/g,'')).toBe(t)
 })
 it('kata pendek tidak dipenggal',()=>{expect(hyph('saya buku','id')).toBe('saya buku')})
})
