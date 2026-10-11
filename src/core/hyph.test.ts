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
 it('Inggris tidak diubah (ditangani CSS)',()=>{expect(hyph('happiness is information','en')).toBe('happiness is information')})
 it('tidak mengubah teks selain soft hyphen',()=>{
  const t='Bahkan, buku ini hampir tidak ada sama sekali. Karena saya tidak membeli saham Apple.'
  expect(hyph(t,'id').replace(/\u00AD/g,'')).toBe(t)
 })
 it('kata pendek tidak dipenggal',()=>{expect(hyph('saya buku','id')).toBe('saya buku')})
})
