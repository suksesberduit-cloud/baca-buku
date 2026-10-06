import 'fake-indexeddb/auto'
import {describe,it,expect} from 'vitest'
import {translateBlock,mock,trKey} from './translate'
import {trGet} from './db'
const sig=()=>new AbortController().signal
describe('translateBlock',()=>{
 it('menerjemahkan satu paragraf dan menyimpannya',async()=>{
  const t=await translateBlock('b',{id:'0-1',kind:'paragraph',text:'Hello world.',hash:'h'},mock,sig())
  expect(t).toBe('[MOCK] Hello world.');expect(await trGet(trKey('b','0-1','h','mock'))).toBe(t)})
 it('memotong paragraf panjang tanpa kehilangan teks',async()=>{
  const text='Kalimat. '.repeat(400).trim()
  const t=await translateBlock('b',{id:'0-2',kind:'paragraph',text,hash:'h2'},mock,sig())
  expect(t.replace(/\[MOCK\] /g,'').replace(/\s+/g,' ')).toBe(text)})
})
