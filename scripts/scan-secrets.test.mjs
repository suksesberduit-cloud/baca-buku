import {describe,it,expect} from 'vitest'
import {scan} from './scan-secrets.mjs'
describe('scan',()=>{
 it('mendeteksi Google API key',()=>{expect(scan('const k="AI'+'za'+'A'.repeat(35)+'"')).toContain('Google API key')})
 it('mendeteksi kunci hex',()=>{expect(scan("apiKey: '"+'a1'.repeat(16)+"'")).toContain('Kunci/rahasia hex di kode')})
 it('mendeteksi PEM',()=>{expect(scan('-----BEGIN '+'RSA PRIVATE KEY-----')).toContain('Kunci privat PEM')})
 it('tidak menandai kode normal',()=>{expect(scan("headers:{'Ocp-Apim-Subscription-Key':key}")).toEqual([])})
})
