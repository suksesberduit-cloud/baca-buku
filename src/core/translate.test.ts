import {describe,it,expect} from 'vitest'
import {split} from './translate'
describe('split',()=>{
 it('tidak melebihi batas dan tidak kehilangan teks',()=>{const t='Satu kalimat. '.repeat(50).trim();const p=split(t,100);expect(p.every(x=>x.length<=100)).toBe(true);expect(p.join(' ').replace(/\s+/g,' ')).toBe(t)})
 it('memotong kalimat tunggal yang terlalu panjang',()=>{expect(split('a'.repeat(250),100).length).toBe(3)})
})
