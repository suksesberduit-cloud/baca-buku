import {describe,it,expect,vi,afterEach} from 'vitest'
import {google,azure} from './remote'
import {Fatal} from '../core/translate'
const ok=(b:unknown)=>vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,status:200,json:async()=>b})))
const st=(n:number)=>vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:n,json:async()=>({})})))
const sig=()=>new AbortController().signal
afterEach(()=>vi.unstubAllGlobals())
describe('adapter',()=>{
 it('google mem-parse hasil',async()=>{ok({data:{translations:[{translatedText:'a'},{translatedText:'b'}]}});expect(await google('k').translate(['x','y'],sig())).toEqual(['a','b'])})
 it('azure mem-parse hasil',async()=>{ok([{translations:[{text:'a'}]}]);expect(await azure('k','r').translate(['x'],sig())).toEqual(['a'])})
 it('401 = Fatal (tidak dicoba ulang)',async()=>{st(401);await expect(google('k').translate(['x'],sig())).rejects.toBeInstanceOf(Fatal)})
 it('429 = error biasa (dicoba ulang)',async()=>{st(429);const e=await azure('k','').translate(['x'],sig()).catch(x=>x);expect(e).toBeInstanceOf(Error);expect(e).not.toBeInstanceOf(Fatal)})
 it('tanpa kunci = Fatal',async()=>{await expect(google('').translate(['x'],sig())).rejects.toBeInstanceOf(Fatal)})
})
