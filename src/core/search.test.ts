import {describe,it,expect} from 'vitest'
import {find} from './search'
describe('find',()=>{
 it('tidak peka huruf besar/kecil dan memberi cuplikan',()=>{expect(find('The Quick brown fox','QUICK')).toContain('Quick')})
 it('null jika tidak ada',()=>{expect(find('abc','z')).toBeNull()})
 it('menambah elipsis pada teks panjang',()=>{const s=find('x'.repeat(100)+'kata'+'y'.repeat(100),'kata');expect(s?.startsWith('…')&&s.endsWith('…')).toBe(true)})
})
