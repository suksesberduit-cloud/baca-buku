import {Capacitor} from '@capacitor/core'
import {SecureStorage} from '@aparajita/capacitor-secure-storage'
import {kvGet,kvSet} from '../core/db'
import {mock,Fatal} from '../core/translate'
import type {TranslationProvider} from '../core/translate'
import {google,azure} from './remote'
import {mlkit} from './mlkit'
export interface Cfg{id:'mock'|'mlkit'|'google'|'azure';region:string;limit:number}
// Kunci API HANYA disimpan di APK (Android Keystore via secure storage). Di web/PWA tidak pernah disimpan.
export const nativeOnly=Capacitor.isNativePlatform()
export const getKey=async(id:string)=>nativeOnly?String((await SecureStorage.get('key:'+id))??''):''
export const setKey=async(id:string,k:string)=>{if(nativeOnly)await SecureStorage.set('key:'+id,k)}
export const getUsage=async(id:string)=>(await kvGet<number>('usage:'+id))??0
function metered(p:TranslationProvider,limit:number):TranslationProvider{
 return{...p,async translate(t,s){
  const n=t.reduce((a,x)=>a+x.length,0),used=await getUsage(p.id)
  if(limit>0&&used+n>limit)throw new Fatal(`Batas karakter tercapai (${used}/${limit}). Naikkan batas di pengaturan API.`)
  const r=await p.translate(t,s);await kvSet('usage:'+p.id,used+n);return r}}
}
export async function buildProvider(c:Cfg):Promise<TranslationProvider>{
 if(!nativeOnly||c.id==='mock')return mock
 if(c.id==='mlkit')return mlkit
 const key=await getKey(c.id)
 return metered(c.id==='google'?google(key):azure(key,c.region.trim()),c.limit)
}
